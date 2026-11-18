import { z } from 'zod';
import { distanceKm, normalizeSearch } from './geo';
import { textFor, type Heritage, type Locale } from './types';
import type { PlaceContext } from './place-context';

export const deviceLocationSchema = z.object({
  source: z.literal('device'),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().positive().max(100_000),
  timestamp: z.number().finite().positive(),
});
export type DeviceLocation = z.infer<typeof deviceLocationSchema>;
export const freshLocation = (location: DeviceLocation, now = Date.now()) =>
  now - location.timestamp <= 120_000 && location.timestamp - now <= 30_000;
const shortText = z.string().trim().min(1).max(500);
export const imageCluesSchema = z.object({
  observation: z.string().trim().min(1).max(2000),
  visibleText: z.array(shortText).max(12),
  searchHints: z.array(shortText).max(8),
});
export type ImageClues = z.infer<typeof imageCluesSchema>;
/** Where the picture came from: a live shutter press or an older photo from the library. */
export const captureOrigins = ['camera', 'gallery'] as const;
export type CaptureOrigin = (typeof captureOrigins)[number];
export const heritageTypes = [
  'architecture',
  'artifact',
  'intangible',
  'monument',
  'natural',
  'everyday',
  'other',
] as const;
export type HeritageType = (typeof heritageTypes)[number];
const longText = z.string().trim().min(1).max(1200);
/** The main thing in the frame: what it is, and what it is for at this particular spot. */
export const subjectSchema = z.object({
  name: shortText,
  category: z.string().trim().max(120).nullable().default(null),
  whatItIs: longText,
  generalUse: z.string().trim().max(1200).nullable().default(null),
  purposeHere: z.string().trim().max(1200).nullable().default(null),
  /** Heritage class: tangible architecture, artifact, intangible practice, monument, nature or everyday. */
  heritageType: z.enum(heritageTypes).catch('other').default('other'),
  /** Origin, era, makers and meaning — only what the image or supplied records support. */
  history: z.string().trim().max(1500).nullable().default(null),
  /** Why it stands at this particular place (historical/functional reason), or null. */
  whyHere: z.string().trim().max(1200).nullable().default(null),
  certainty: z.enum(['high', 'medium', 'low']).catch('low'),
});
export const groundedVisionSchema = z.object({
  observation: z.string().trim().min(1).max(2000),
  subject: subjectSchema.nullable().default(null),
  candidates: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        reason: z.string().trim().min(1).max(1000),
        evidence: z.array(shortText).min(1).max(5),
      }),
    )
    .max(3),
  objects: z
    .array(
      z.object({
        name: shortText,
        description: z.string().trim().min(1).max(1000),
        purpose: z.string().trim().max(1000).nullable().default(null),
        culturalContext: z.string().max(1000).nullable(),
        placeId: z.string().max(100).nullable(),
      }),
    )
    .max(8),
  limitations: z.array(shortText).max(6),
});
export type RecognitionEntry = Pick<
  Heritage,
  'id' | 'slug' | 'name' | 'image' | 'address' | 'sources'
>;
export type RecognitionCandidate = {
  id: string;
  reason: string;
  evidence: string[];
  entry: RecognitionEntry;
  distanceMeters: number | null;
  locationAssessment: 'nearby' | 'conflict' | 'uncertain' | 'unavailable';
};
export type RecognitionSubject = z.infer<typeof subjectSchema>;
/** Location context shown to the visitor. Deliberately holds no coordinates, accuracy or IP. */
export type RecognitionPlace = {
  label: string | null;
  feature: string | null;
  nearby: { name: string; kind: string; distanceMeters: number }[];
};
export type RecognitionResult = {
  observation: string;
  subject: RecognitionSubject | null;
  visibleText: string[];
  objects: z.infer<typeof groundedVisionSchema>['objects'];
  candidates: RecognitionCandidate[];
  limitations: string[];
  assessment: 'nearby_match' | 'location_conflict' | 'visual_only' | 'uncertain' | 'no_match';
  location: { provided: boolean; quality: 'precise' | 'approximate' | null };
  place: RecognitionPlace | null;
  origin: CaptureOrigin;
};

/**
 * What the vision model is told about "here". Names, street-level address and distances only:
 * raw coordinates never go to the AI provider.
 */
export function recognitionLocationContext(
  context: PlaceContext | null,
  location: DeviceLocation | null,
  origin: CaptureOrigin,
) {
  if (!location) return { available: false as const };
  return {
    available: true as const,
    capturedNow: origin === 'camera',
    gpsQuality: location.accuracy <= 100 ? 'precise' : 'approximate',
    address: context?.address?.label ?? null,
    standingOn: context?.address?.feature
      ? { name: context.address.feature, type: context.address.featureTag }
      : null,
    nearestRealPlaces: (context?.nearby || []).slice(0, 12).map((poi) => ({
      name: poi.name,
      type: poi.tag || poi.kind,
      distanceMeters: poi.distanceMeters,
    })),
  };
}

/** Search the entire catalog, never only the first rows. */
export function retrieveRecognitionPlaces(
  catalog: Heritage[],
  clues: ImageClues,
  location: DeviceLocation | null,
  limit = 14,
) {
  const hints = [...clues.visibleText, ...clues.searchHints].map(normalizeSearch).filter(Boolean);
  const ranked = catalog
    .filter((entry) => entry.status === 'published')
    .map((entry) => {
      const names = [entry.name, ...(entry.aliases || [])].map(normalizeSearch);
      const address = normalizeSearch(entry.address || '');
      let score = 0;
      for (const hint of hints) {
        if (names.some((name) => name === hint)) score += 100;
        else if (
          hint.length >= 4 &&
          names.some((name) => name.includes(hint) || hint.includes(name))
        )
          score += 40;
        else {
          const words = hint.split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
          score += words.filter((word) => names.some((name) => name.includes(word))).length * 3;
        }
        if (hint.length >= 8 && address.includes(hint)) score += 10;
      }
      const distance =
        location && entry.latitude !== null && entry.longitude !== null && entry.hasGps !== false
          ? distanceKm(location, { latitude: entry.latitude, longitude: entry.longitude }) * 1000
          : null;
      return { entry, score, distance };
    });
  const byText = ranked
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.distance ?? Infinity) - (b.distance ?? Infinity));
  const nearby = location
    ? ranked
        .filter(
          (item) =>
            item.distance !== null && item.distance <= 3000 + Math.min(location.accuracy, 1000),
        )
        .sort((a, b) => a.distance! - b.distance!)
    : [];
  const selected = new Map<string, Heritage>();
  // Reserve room for proximity and names, including when they conflict.
  for (const { entry } of [...nearby.slice(0, Math.floor(limit / 2)), ...byText, ...nearby]) {
    if (selected.size >= limit) break;
    selected.set(entry.id, entry);
  }
  return [...selected.values()];
}

export function recognitionCatalogContext(
  entries: Heritage[],
  locale: Locale,
  location: DeviceLocation | null,
) {
  return entries.map((entry, index) => {
    const tr = textFor(entry.translations, locale);
    const rich = index < 6;
    return {
      id: entry.id,
      name: entry.name,
      aliases: (entry.aliases || []).slice(0, 4),
      address: entry.address || '',
      category: entry.category || entry.kind,
      summary: tr.summary.slice(0, rich ? 240 : 140),
      ...(rich && tr.detail ? { detail: tr.detail.slice(0, 280) } : {}),
      distanceMeters:
        location && entry.latitude !== null && entry.longitude !== null && entry.hasGps !== false
          ? Math.round(
              distanceKm(location, { latitude: entry.latitude, longitude: entry.longitude }) * 1000,
            )
          : null,
    };
  });
}

export function finalizeRecognition(
  parsed: z.input<typeof groundedVisionSchema>,
  clues: ImageClues,
  shortlist: Heritage[],
  location: DeviceLocation | null,
  context: PlaceContext | null = null,
  origin: CaptureOrigin = 'camera',
): RecognitionResult {
  const seen = new Set<string>();
  const candidates: RecognitionCandidate[] = [];
  for (const candidate of parsed.candidates) {
    const entry = shortlist.find((entry) => entry.id === candidate.id);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    const distance =
      location && entry.latitude !== null && entry.longitude !== null && entry.hasGps !== false
        ? distanceKm(location, { latitude: entry.latitude, longitude: entry.longitude }) * 1000
        : null;
    const locationAssessment =
      !location || distance === null
        ? 'unavailable'
        : location.accuracy > 100
          ? 'uncertain'
          : distance <= 200 + location.accuracy
            ? 'nearby'
            : distance > 1000 + location.accuracy
              ? 'conflict'
              : 'uncertain';
    candidates.push({
      ...candidate,
      entry: {
        id: entry.id,
        slug: entry.slug,
        name: entry.name,
        image: entry.image,
        address: entry.address,
        sources: entry.sources,
      },
      distanceMeters: distance === null ? null : Math.round(distance),
      locationAssessment,
    });
  }
  const first = candidates[0];
  const subject = parsed.subject
    ? {
        name: parsed.subject.name,
        category: parsed.subject.category ?? null,
        whatItIs: parsed.subject.whatItIs,
        generalUse: parsed.subject.generalUse ?? null,
        // A "here" claim needs a "here": without a device position it is dropped.
        purposeHere: location ? (parsed.subject.purposeHere ?? null) : null,
        heritageType: parsed.subject.heritageType ?? 'other',
        history: parsed.subject.history ?? null,
        whyHere: parsed.subject.whyHere ?? null,
        certainty: parsed.subject.certainty ?? 'low',
      }
    : null;
  return {
    observation: parsed.observation,
    subject,
    visibleText: clues.visibleText,
    candidates,
    objects: parsed.objects.map((object) => ({
      ...object,
      purpose: object.purpose ?? null,
      placeId: object.placeId && seen.has(object.placeId) ? object.placeId : null,
      culturalContext: object.placeId && seen.has(object.placeId) ? object.culturalContext : null,
    })),
    limitations: parsed.limitations,
    assessment: !first
      ? 'no_match'
      : first.locationAssessment === 'nearby'
        ? 'nearby_match'
        : first.locationAssessment === 'conflict'
          ? 'location_conflict'
          : !location
            ? 'visual_only'
            : 'uncertain',
    location: {
      provided: Boolean(location),
      quality: location ? (location.accuracy <= 100 ? 'precise' : 'approximate') : null,
    },
    place:
      location && context
        ? {
            label: context.address?.label ?? null,
            feature: context.address?.feature ?? null,
            nearby: context.nearby
              .slice(0, 5)
              .map(({ name, kind, distanceMeters }) => ({ name, kind, distanceMeters })),
          }
        : null,
    origin,
  };
}
