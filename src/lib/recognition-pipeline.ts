import 'server-only';
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
  'You are THAM VAN LENS. Extract strictly visible signage text (no license plates, phone numbers, or personal badges), a brief 1-sentence visual summary (<= 25 words), and up to 8 concise Vietnamese place/architecture search hints. Output compact JSON only.';

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
  const clues = await callVision({
    schema: imageCluesSchema,
    instructions: STEP1_VISUAL_INSTRUCTIONS,
    image,
    locale,
    maxTokens: 500,
    signal: AbortSignal.any([signal, AbortSignal.timeout(32_000)]),
    task: 'Read signage and give up to 8 short place/architecture search hints. Keep observation under 25 words. Return compact JSON {"observation":"...","visibleText":[],"searchHints":[]}. Empty arrays are valid.',
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
      'Return compact JSON {"observation":"concise 1-2 sentences","subject":{"name":"specific name","category":"kind","whatItIs":"1-2 sentences","generalUse":"concise or null","purposeHere":"concise role here or null","heritageType":"architecture|artifact|intangible|monument|natural|everyday|other","history":"from catalog/documented facts or null","whyHere":"from catalog/facts or null","certainty":"high|medium|low"},"candidates":[{"id":"supplied id","reason":"concise reason","evidence":["clue"]}],"objects":[{"name":"key object","description":"brief visible detail","purpose":"concise or null","culturalContext":null,"placeId":null}],"limitations":["brief note"]}.',
      'Limits: up to 3 candidates, 4 key objects (1-sentence descriptions), 3 brief limitations. Never invent facts, dates, or names. If no catalog record fits, set candidates to [].',
      `Image clues: ${JSON.stringify(clues)}.`,
      `Catalog data: ${JSON.stringify(recognitionCatalogContext(shortlist, locale, location))}`,
    ].join('\n'),
  });
  return finalizeRecognition(parsed, clues, shortlist, location, context, origin);
}
