import { z } from 'zod';
import { distanceKm, normalizeSearch } from './geo';
import { textFor, type Heritage, type Locale } from './types';

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
export const groundedVisionSchema = z.object({
  observation: z.string().trim().min(1).max(2000),
  candidates: z.array(z.object({
    id: z.string().min(1).max(100), reason: z.string().trim().min(1).max(1000),
    evidence: z.array(shortText).min(1).max(5),
  })).max(3),
  objects: z.array(z.object({
    name: shortText, description: z.string().trim().min(1).max(1000),
    culturalContext: z.string().max(1000).nullable(), placeId: z.string().max(100).nullable(),
  })).max(8),
  limitations: z.array(shortText).max(6),
});
export type RecognitionEntry = Pick<Heritage, 'id' | 'slug' | 'name' | 'image' | 'address' | 'sources'>;
export type RecognitionCandidate = {
  id: string; reason: string; evidence: string[]; entry: RecognitionEntry;
  distanceMeters: number | null;
  locationAssessment: 'nearby' | 'conflict' | 'uncertain' | 'unavailable';
};
export type RecognitionResult = {
  observation: string; visibleText: string[];
  objects: z.infer<typeof groundedVisionSchema>['objects'];
  candidates: RecognitionCandidate[]; limitations: string[];
  assessment: 'nearby_match' | 'location_conflict' | 'visual_only' | 'uncertain' | 'no_match';
  location: { provided: boolean; accuracyMeters: number | null };
};

/** Search the entire catalog, never only the first rows. */
export function retrieveRecognitionPlaces(catalog: Heritage[], clues: ImageClues, location: DeviceLocation | null, limit = 32) {
  const hints = [...clues.visibleText, ...clues.searchHints].map(normalizeSearch).filter(Boolean);
  const ranked = catalog.filter((entry) => entry.status === 'published').map((entry) => {
    const names = [entry.name, ...(entry.aliases || [])].map(normalizeSearch);
    const address = normalizeSearch(entry.address || '');
    let score = 0;
    for (const hint of hints) {
      if (names.some((name) => name === hint)) score += 100;
      else if (hint.length >= 4 && names.some((name) => name.includes(hint) || hint.includes(name))) score += 40;
      else {
        const words = hint.split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
        score += words.filter((word) => names.some((name) => name.includes(word))).length * 3;
      }
      if (hint.length >= 8 && address.includes(hint)) score += 10;
    }
    const distance = location && entry.latitude !== null && entry.longitude !== null && entry.hasGps !== false
      ? distanceKm(location, { latitude: entry.latitude, longitude: entry.longitude }) * 1000 : null;
    return { entry, score, distance };
  });
  const byText = ranked.filter((item) => item.score > 0).sort((a, b) => b.score - a.score || (a.distance ?? Infinity) - (b.distance ?? Infinity));
  const nearby = location ? ranked.filter((item) => item.distance !== null && item.distance <= 3000 + Math.min(location.accuracy, 1000)).sort((a, b) => a.distance! - b.distance!) : [];
  const selected = new Map<string, Heritage>();
  // Reserve room for proximity and names, including when they conflict.
  for (const { entry } of [...nearby.slice(0, Math.floor(limit / 2)), ...byText, ...nearby]) {
    if (selected.size >= limit) break;
    selected.set(entry.id, entry);
  }
  return [...selected.values()];
}

export function recognitionCatalogContext(entries: Heritage[], locale: Locale, location: DeviceLocation | null) {
  return entries.map((entry) => ({
    id: entry.id, name: entry.name, aliases: (entry.aliases || []).slice(0, 8),
    address: entry.address || '', category: entry.category || entry.kind,
    summary: textFor(entry.translations, locale).summary.slice(0, 900),
    detail: textFor(entry.translations, locale).detail.slice(0, 900), sources: entry.sources.slice(0, 3),
    distanceMeters: location && entry.latitude !== null && entry.longitude !== null && entry.hasGps !== false
      ? Math.round(distanceKm(location, { latitude: entry.latitude, longitude: entry.longitude }) * 1000) : null,
  }));
}

export function finalizeRecognition(parsed: z.infer<typeof groundedVisionSchema>, clues: ImageClues, shortlist: Heritage[], location: DeviceLocation | null): RecognitionResult {
  const seen = new Set<string>();
  const candidates: RecognitionCandidate[] = [];
  for (const candidate of parsed.candidates) {
    const entry = shortlist.find((entry) => entry.id === candidate.id);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    const distance = location && entry.latitude !== null && entry.longitude !== null && entry.hasGps !== false
      ? distanceKm(location, { latitude: entry.latitude, longitude: entry.longitude }) * 1000 : null;
    const locationAssessment = !location || distance === null ? 'unavailable'
      : location.accuracy > 100 ? 'uncertain' : distance <= 200 + location.accuracy ? 'nearby'
      : distance > 1000 + location.accuracy ? 'conflict' : 'uncertain';
    candidates.push({ ...candidate, entry: { id: entry.id, slug: entry.slug, name: entry.name,
      image: entry.image, address: entry.address, sources: entry.sources },
      distanceMeters: distance === null ? null : Math.round(distance), locationAssessment });
  }
  const first = candidates[0];
  return {
    observation: parsed.observation, visibleText: clues.visibleText, candidates,
    objects: parsed.objects.map((object) => ({ ...object,
      placeId: object.placeId && seen.has(object.placeId) ? object.placeId : null,
      culturalContext: object.placeId && seen.has(object.placeId) ? object.culturalContext : null,
    })), limitations: parsed.limitations,
    assessment: !first ? 'no_match' : first.locationAssessment === 'nearby' ? 'nearby_match'
      : first.locationAssessment === 'conflict' ? 'location_conflict' : !location ? 'visual_only' : 'uncertain',
    location: { provided: Boolean(location), accuracyMeters: location?.accuracy ?? null },
  };
}
