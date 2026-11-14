import { route, requireViewer, ok, fail } from '@/lib/api';
import { getCatalog } from '@/lib/data';
import { hasVision } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { hasImageSignature, limitedBody } from '@/lib/vision';
import { isLocale } from '@/lib/types';
import { normalizeRecognitionImage } from '@/lib/image';
import { callVision, recognitionInstructions } from '@/lib/vision-provider';
import {
  deviceLocationSchema,
  freshLocation,
  imageCluesSchema,
  groundedVisionSchema,
  retrieveRecognitionPlaces,
  recognitionCatalogContext,
  finalizeRecognition,
  recognitionLocationContext,
  captureOrigins,
  type CaptureOrigin,
  type DeviceLocation,
} from '@/lib/recognition';
import { placeContext } from '@/lib/place-context';
export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = route(async (request) => {
  await requireViewer();
  if (!hasVision()) fail('visionUnavailable', 503);
  let bytes: Buffer;
  try {
    bytes = await limitedBody(request, 5 * 1024 * 1024 + 65536);
  } catch {
    fail('invalidInput', 413);
  }
  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: new Uint8Array(bytes),
    }).formData();
  } catch {
    fail('invalidInput', 422);
  }
  const file = form.get('image'),
    locale = String(form.get('locale'));
  if (
    !(file instanceof File) ||
    !isLocale(locale) ||
    form.get('consent') !== 'true' ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024
  )
    fail('invalidInput', 422);
  let location: DeviceLocation | null = null;
  if (form.has('location')) {
    if (form.get('locationConsent') !== 'true') fail('invalidInput', 422);
    try {
      location = deviceLocationSchema.parse(JSON.parse(String(form.get('location'))));
    } catch {
      fail('invalidInput', 422);
    }
    if (!freshLocation(location)) fail('locationExpired', 422);
  }
  const requestedOrigin = String(form.get('origin') || 'camera');
  const origin: CaptureOrigin = captureOrigins.includes(requestedOrigin as CaptureOrigin)
    ? (requestedOrigin as CaptureOrigin)
    : 'camera';
  const image = Buffer.from(await file.arrayBuffer());
  if (!hasImageSignature(image, file.type)) fail('invalidInput', 422);
  let normalized: Buffer;
  try {
    normalized = await normalizeRecognitionImage(image);
  } catch {
    fail('invalidInput', 422);
  }
  const [instructions, catalog] = await Promise.all([recognitionInstructions(), getCatalog()]);
  const db = await supabase();
  const quota = await db.rpc('consume_recognition_quota');
  if (quota.error) fail('error', 500);
  if (!quota.data) fail('rateLimit', 429);
  // One shared deadline covers both calls and response-body reads within maxDuration = 60.
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(54000)]);
  // Real street address + named places around the device, looked up while the model reads the image.
  // Bounded and fail-soft: a slow map service must never cost the visitor their analysis.
  const contextPromise = location
    ? placeContext(location, AbortSignal.any([signal, AbortSignal.timeout(6000)])).catch(() => null)
    : Promise.resolve(null);
  const clues = await callVision({
    schema: imageCluesSchema,
    instructions,
    image: normalized,
    locale,
    signal,
    task: 'Inspect only what is visible. Read signage; give up to 8 specific place-name or distinctive architecture search hints, not general guesses. Return JSON {"observation":"visible features","visibleText":["literal readable text"],"searchHints":["specific clue"]}. No catalog is supplied at this step. Empty hint/text arrays are valid.',
  });
  const context = await contextPromise;
  const shortlist = retrieveRecognitionPlaces(catalog, clues, location);
  const parsed = await callVision({
    schema: groundedVisionSchema,
    instructions,
    image: normalized,
    locale,
    signal,
    task: [
      'Answer the visitor: WHAT is the main thing in this photo, and WHAT IS IT FOR at the place where they are standing?',
      `Location context (device-reported, unverified${origin === 'gallery' ? '; the photo was picked from the library, so it may have been taken elsewhere or earlier — treat location as a weak hint and say so' : ''}): ${JSON.stringify(recognitionLocationContext(context, location, origin))}.`,
      'Use the location context to work out the role of the subject here (who uses it, for what, why it stands at this spot). Proximity alone never proves identity: the image must agree. If location context is unavailable, set purposeHere to null.',
      'Return JSON {"observation":"visible features","subject":{"name":"most specific justified name","category":"kind of thing","whatItIs":"plain explanation","generalUse":"what such a thing is normally for, or null","purposeHere":"its role at this location grounded in the location context / catalog records, or null","certainty":"high|medium|low"},"candidates":[{"id":"supplied catalog id","reason":"why and uncertainty","evidence":["specific visible clue"]}],"objects":[{"name":"visible object","description":"visible details","purpose":"what it is for, or null","culturalContext":null,"placeId":null}],"limitations":["uncertainty or suggested next photo"]}.',
      'subject may be null only when nothing can be made out. Maximum 3 candidates, 8 objects, 6 limitations. Cultural context must be supported by supplied records. If the catalog shortlist is empty or no record matches, candidates MUST be [] — still fill subject and objects from the image.',
      `Image clues: ${JSON.stringify(clues)}.`,
      `Catalog data: ${JSON.stringify(recognitionCatalogContext(shortlist, locale, location))}`,
    ].join('\n'),
  });
  return ok(finalizeRecognition(parsed, clues, shortlist, location, context, origin));
});
