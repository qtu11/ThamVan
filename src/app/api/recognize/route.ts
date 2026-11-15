import { route, requireViewer, ok, fail } from '@/lib/api';
import { getCatalog } from '@/lib/data';
import { hasVision } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { hasImageSignature, limitedBody } from '@/lib/vision';
import { isLocale } from '@/lib/types';
import { normalizeRecognitionImage } from '@/lib/image';
import { recognitionInstructions } from '@/lib/vision-provider';
import { analyzeRecognition } from '@/lib/recognition-pipeline';
import {
  deviceLocationSchema,
  freshLocation,
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
  return ok(
    await analyzeRecognition({
      image: normalized,
      locale,
      location,
      origin,
      catalog,
      instructions,
      signal,
      context: contextPromise,
    }),
  );
});
