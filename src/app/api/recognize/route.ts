import { route, requireViewer, ok, fail } from '@/lib/api';
import { getCatalog } from '@/lib/data';
import { hasVision } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { hasImageSignature, limitedBody } from '@/lib/vision';
import { isLocale } from '@/lib/types';
import { normalizeRecognitionImage } from '@/lib/image';
import { callVision, recognitionInstructions } from '@/lib/vision-provider';
import { deviceLocationSchema, freshLocation, imageCluesSchema, groundedVisionSchema,
  retrieveRecognitionPlaces, recognitionCatalogContext, finalizeRecognition, type DeviceLocation } from '@/lib/recognition';
export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = route(async (request) => {
  await requireViewer();
  if (!hasVision()) fail('visionUnavailable', 503);
  let bytes: Buffer;
  try { bytes = await limitedBody(request, 5 * 1024 * 1024 + 65536); }
  catch { fail('invalidInput', 413); }
  let form: FormData;
  try {
    form = await new Request(request.url, { method: 'POST', headers: request.headers,
      body: new Uint8Array(bytes) }).formData();
  } catch { fail('invalidInput', 422); }
  const file = form.get('image'), locale = String(form.get('locale'));
  if (!(file instanceof File) || !isLocale(locale) || form.get('consent') !== 'true' ||
    file.size === 0 || file.size > 5 * 1024 * 1024) fail('invalidInput', 422);
  let location: DeviceLocation | null = null;
  if (form.has('location')) {
    if (form.get('locationConsent') !== 'true') fail('invalidInput', 422);
    try { location = deviceLocationSchema.parse(JSON.parse(String(form.get('location')))); }
    catch { fail('invalidInput', 422); }
    if (!freshLocation(location)) fail('locationExpired', 422);
  }
  const image = Buffer.from(await file.arrayBuffer());
  if (!hasImageSignature(image, file.type)) fail('invalidInput', 422);
  let normalized: Buffer;
  try { normalized = await normalizeRecognitionImage(image); }
  catch { fail('invalidInput', 422); }
  const [instructions, catalog] = await Promise.all([recognitionInstructions(), getCatalog()]);
  const db = await supabase();
  const quota = await db.rpc('consume_recognition_quota');
  if (quota.error) fail('error', 500);
  if (!quota.data) fail('rateLimit', 429);
  // One shared deadline covers both calls and response-body reads.
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45000)]);
  const clues = await callVision({ schema: imageCluesSchema, instructions, image: normalized, locale, signal,
    task: 'Inspect only what is visible. Read signage; give up to 8 specific place-name or distinctive architecture search hints, not general guesses. Return JSON {"observation":"visible features","visibleText":["literal readable text"],"searchHints":["specific clue"]}. No catalog is supplied at this step. Empty hint/text arrays are valid.' });
  const shortlist = retrieveRecognitionPlaces(catalog, clues, location);
  const parsed = await callVision({ schema: groundedVisionSchema, instructions, image: normalized, locale, signal,
    task: `Compare image evidence with these catalog records. GPS accuracy: ${location ? `${Math.round(location.accuracy)} meters; device-reported, unverified` : 'unavailable'}. Do not pick a place just because it is closest. Return JSON {"observation":"visible features","candidates":[{"id":"supplied catalog id","reason":"why and uncertainty","evidence":["specific visible clue"]}],"objects":[{"name":"visible object","description":"visible details","culturalContext":null,"placeId":null}],"limitations":["uncertainty or suggested next photo"]}. Maximum 3 candidates, 8 objects, 6 limitations. Cultural context must be supported by supplied records. If no record matches, candidates must be empty. Image clues: ${JSON.stringify(clues)}. Catalog data: ${JSON.stringify(recognitionCatalogContext(shortlist, locale, location))}` });
  return ok(finalizeRecognition(parsed, clues, shortlist, location));
});
