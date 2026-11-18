import 'server-only';
import { compactRecognitionImage } from './image';
import { callVision } from './vision-provider';
import {
  imageCluesSchema,
  groundedVisionSchema,
  retrieveRecognitionPlaces,
  recognitionCatalogContext,
  finalizeRecognition,
  recognitionLocationContext,
  type CaptureOrigin,
  type DeviceLocation,
} from './recognition';
import type { PlaceContext } from './place-context';
import type { Heritage, Locale } from './types';

const STEP1_VISUAL_INSTRUCTIONS =
  'You are THAM VAN LENS. Extract strictly visible signage text (no license plates, phone numbers, or personal badges), a brief 1-sentence visual summary (<= 15 words), and up to 6 concise Vietnamese place/architecture search hints. Output compact JSON only.';

/**
 * The two-step recognition used by /api/recognize and by evals/vision.eval.ts, so the prompt is
 * measured on exactly the code that serves visitors. `image` must already be normalized.
 */
export async function analyzeRecognition(options: {
  image: Buffer;
  locale: Locale;
  location: DeviceLocation | null;
  origin: CaptureOrigin;
  catalog: Heritage[];
  instructions: string;
  signal: AbortSignal;
  context: Promise<PlaceContext | null>;
}) {
  const { image, locale, location, origin, catalog, instructions, signal } = options;
  const previewImage = await compactRecognitionImage(image).catch(() => image);
  const clues = await callVision({
    schema: imageCluesSchema,
    instructions: STEP1_VISUAL_INSTRUCTIONS,
    image: previewImage,
    locale,
    maxTokens: 350,
    signal: AbortSignal.any([signal, AbortSignal.timeout(32_000)]),
    task: 'Read signage and give up to 6 short place/architecture hints. Keep observation <= 15 words. Return compact JSON {"observation":"...","visibleText":[],"searchHints":[]}. Empty arrays are valid.',
  });
  const context = await options.context;
  const shortlist = retrieveRecognitionPlaces(catalog, clues, location);
  const parsed = await callVision({
    schema: groundedVisionSchema,
    instructions,
    image,
    locale,
    signal,
    task: [
      'Answer concisely: WHAT is the main subject in the photo, and WHAT IS IT FOR at this spot?',
      `Location context (device-reported, unverified${origin === 'gallery' ? '; gallery photo — location is a weak hint, note this' : ''}): ${JSON.stringify(recognitionLocationContext(context, location, origin))}.`,
      'Ground purposeHere in the location context / catalog only when image agrees; otherwise set purposeHere to null.',
      'Return compact JSON {"observation":"1 short sentence","subject":{"name":"specific name","category":"kind","whatItIs":"1-2 brief sentences","generalUse":"1 sentence or null","purposeHere":"1 sentence or null","heritageType":"architecture|artifact|intangible|monument|natural|everyday|other","history":"brief documented fact or null","whyHere":"brief documented reason or null","certainty":"high|medium|low"},"candidates":[{"id":"supplied id","reason":"1 short sentence","evidence":["short clue"]}],"objects":[{"name":"key object","description":"brief detail","purpose":"short phrase or null","culturalContext":null,"placeId":null}],"limitations":["brief note"]}.',
      'Be succinct to respond fast: max 3 candidates, max 3 key objects, max 3 brief limitations. Never invent facts, dates, or names. If no catalog record fits, set candidates to [].',
      `Image clues: ${JSON.stringify(clues)}.`,
      `Catalog data: ${JSON.stringify(recognitionCatalogContext(shortlist, locale, location))}`,
    ].join('\n'),
  });
  return finalizeRecognition(parsed, clues, shortlist, location, context, origin);
}
