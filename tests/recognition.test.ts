import { describe, expect, it } from 'vitest';
import { catalog } from '@/data/catalog';
import { deviceLocationSchema, freshLocation, retrieveRecognitionPlaces, finalizeRecognition,
  type DeviceLocation, type ImageClues } from '@/lib/recognition';
const location: DeviceLocation = { source: 'device', latitude: 10.78, longitude: 106.7, accuracy: 15, timestamp: Date.now() };
const target = { ...catalog[0], id: 'HCM-TARGET', name: 'Bảo tàng Hoa Văn', aliases: ['Hoa Van Museum'],
  latitude: 10.78, longitude: 106.7 };
const clues: ImageClues = { observation: 'Biển tên bảo tàng', visibleText: ['Bao tang Hoa Van'], searchHints: [] };
const parsed = { observation: 'Mái ngói', candidates: [{ id: target.id, reason: 'Biển tên trùng khớp', evidence: ['Biển tên Hoa Văn'] }],
  objects: [{ name: 'Mái ngói', description: 'Ngói đỏ', culturalContext: null, placeId: null }], limitations: [] };

describe('location and visual retrieval', () => {
  it('retrieves a matching place beyond the old first-120 slice, with or without GPS', () => {
    const entries = [...Array.from({ length: 150 }, (_, i) => ({ ...catalog[0], id: `other-${i}`, name: `Other ${i}` })), target];
    expect(retrieveRecognitionPlaces(entries, clues, null)[0].id).toBe(target.id);
    expect(retrieveRecognitionPlaces(entries, clues, location).some((entry) => entry.id === target.id)).toBe(true);
    expect(retrieveRecognitionPlaces(entries, { ...clues, visibleText: [] }, null)).toEqual([]);
  });
  it('uses nearby entries but preserves conflicting name evidence and excludes unpublished records', () => {
    const far = { ...target, latitude: 21 };
    const nearby = { ...target, id: 'nearby', name: 'Other Place' };
    const result = retrieveRecognitionPlaces([far, nearby, { ...target, id: 'draft', status: 'draft' }], clues, location);
    expect(result.map((entry) => entry.id)).toEqual(['nearby', target.id]);
  });
  it('rejects invalid, fabricated source and stale coordinates', () => {
    for (const value of [{ ...location, latitude: 100 }, { ...location, accuracy: 0 }, { ...location, source: 'ip' }, { ...location, longitude: Infinity }])
      expect(deviceLocationSchema.safeParse(value).success).toBe(false);
    expect(freshLocation({ ...location, timestamp: Date.now() - 121000 })).toBe(false);
    expect(freshLocation({ ...location, timestamp: Date.now() + 31000 })).toBe(false);
  });
  it('never turns weak GPS or an image-only suggestion into a verified presence claim', () => {
    expect(finalizeRecognition(parsed, clues, [target], location).assessment).toBe('nearby_match');
    expect(finalizeRecognition(parsed, clues, [target], { ...location, accuracy: 500 }).assessment).toBe('uncertain');
    expect(finalizeRecognition(parsed, clues, [target], null).assessment).toBe('visual_only');
    expect(finalizeRecognition(parsed, clues, [{ ...target, latitude: 21 }], location).assessment).toBe('location_conflict');
    expect(finalizeRecognition(parsed, clues, [{ ...target, hasGps: false }], location).assessment).toBe('uncertain');
  });
  it('filters out invented/out-of-shortlist/duplicate IDs and orphan cultural interpretations', () => {
    const result = finalizeRecognition({ ...parsed, candidates: [parsed.candidates[0], parsed.candidates[0], { ...parsed.candidates[0], id: 'invented' }],
      objects: [{ ...parsed.objects[0], placeId: 'invented', culturalContext: 'unfounded history' }] }, clues, [target], location);
    expect(result.candidates).toHaveLength(1);
    expect(result.objects[0].culturalContext).toBeNull();
    expect(result.objects[0].placeId).toBeNull();
  });
});
