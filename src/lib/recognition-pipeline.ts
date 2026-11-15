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
    instructions,
    image,
    locale,
    signal,
    task: 'Inspect only what is visible. Read signage; give up to 8 specific place-name or distinctive architecture search hints, not general guesses. Return JSON {"observation":"visible features","visibleText":["literal readable text"],"searchHints":["specific clue"]}. No catalog is supplied at this step. Empty hint/text arrays are valid.',
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
      'Answer the visitor: WHAT is the main thing in this photo, and WHAT IS IT FOR at the place where they are standing?',
      `Location context (device-reported, unverified${origin === 'gallery' ? '; the photo was picked from the library, so it may have been taken elsewhere or earlier — treat location as a weak hint and say so' : ''}): ${JSON.stringify(recognitionLocationContext(context, location, origin))}.`,
      'Use the location context to work out the role of the subject here (who uses it, for what, why it stands at this spot). Proximity alone never proves identity: the image must agree. If location context is unavailable, set purposeHere to null.',
      'Return JSON {"observation":"visible features","subject":{"name":"most specific justified name","category":"kind of thing","whatItIs":"plain explanation","generalUse":"what such a thing is normally for, or null","purposeHere":"its role at this location grounded in the location context / catalog records, or null","heritageType":"architecture|artifact|intangible|monument|natural|everyday|other","history":"origin, era, builders/makers, style and cultural meaning, or null","whyHere":"why it is located at this particular place (historical, religious, social or functional reason), or null","certainty":"high|medium|low"},"candidates":[{"id":"supplied catalog id","reason":"why and uncertainty","evidence":["specific visible clue"]}],"objects":[{"name":"visible object","description":"visible details","purpose":"what it is for, or null","culturalContext":null,"placeId":null}],"limitations":["uncertainty or suggested next photo"]}.',
      'heritageType: architecture = buildings/temples/pagodas/communal houses/houses/bridges; artifact = movable objects, statues, bells, steles, relics, crafts on display; intangible = festivals, rituals, performances, crafts in action, music, cuisine, customs (UNESCO intangible heritage) visible in the photo; monument = memorials/commemorative statues; natural = landscape; everyday = ordinary modern objects or buildings. For intangible heritage describe the practice, its community and meaning. history and whyHere must come from the supplied catalog records or widely documented facts about the specifically identified subject; if the subject is not confidently identified, give only what the visible style indicates and say it is uncertain, or null. Never invent dates or names.',
      'subject may be null only when nothing can be made out. Maximum 3 candidates, 8 objects, 6 limitations. Cultural context must be supported by supplied records. If the catalog shortlist is empty or no record matches, candidates MUST be [] — still fill subject and objects from the image.',
      `Image clues: ${JSON.stringify(clues)}.`,
      `Catalog data: ${JSON.stringify(recognitionCatalogContext(shortlist, locale, location))}`,
    ].join('\n'),
  });
  return finalizeRecognition(parsed, clues, shortlist, location, context, origin);
}
