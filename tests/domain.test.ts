import { describe, it, expect } from 'vitest';
import { distanceKm, normalizeSearch, safeNext } from '@/lib/geo';
import { catalog, starterChallenges } from '@/data/catalog';
import { heritageSchema, profileSchema, passwordSchema } from '@/lib/validation';
import { hasImageSignature, visionOutputSchema } from '@/lib/vision';
describe('discovery boundaries', () => {
  it('uses real spherical distance and changes radius membership', () => {
    const a = { latitude: 16.4697, longitude: 107.5778 },
      b = { latitude: 16.51, longitude: 107.5778 };
    const d = distanceKm(a, b);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(5);
    expect(distanceKm(a, a)).toBe(0);
  });
  it('searches Vietnamese without diacritics', () => {
    expect(normalizeSearch('Đô thị cổ Hội An')).toBe('do thi co hoi an');
  });
  it('blocks external and encoded route confusion redirects', () => {
    for (const bad of [
      '//evil.test',
      'https://evil.test',
      '/vi\\evil',
      '/vi\r\nLocation: bad',
      '/enough',
    ])
      expect(safeNext(bad, '/vi')).toBe('/vi');
    expect(safeNext('/en/journey?x=1', '/vi')).toBe('/en/journey?x=1');
  });
});
describe('input and catalog integrity', () => {
  it('validates the reference collection with distinct image associations', () => {
    for (const entry of catalog)
      expect(heritageSchema.safeParse(entry).success, entry.slug).toBe(true);
    expect(new Set(catalog.map((e) => e.image)).size).toBe(catalog.length);
    expect(starterChallenges.every((c) => catalog.some((e) => e.id === c.entry_id))).toBe(true);
  });
  it('rejects unsafe content links and coordinates', () => {
    const entry = catalog[0];
    expect(heritageSchema.safeParse({ ...entry, image: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(heritageSchema.safeParse({ ...entry, latitude: 1000 }).success).toBe(false);
    expect(heritageSchema.safeParse({ ...entry, image_author: '' }).success).toBe(false);
  });
  it('rejects forged preference ranges and weak passwords', () => {
    expect(
      profileSchema.safeParse({
        display_name: 'A B',
        locale: 'vi',
        radius_km: 100,
        notifications: true,
      }).success,
    ).toBe(false);
    expect(passwordSchema.safeParse('password').success).toBe(false);
    expect(passwordSchema.safeParse('a-long-secret-123').success).toBe(true);
  });
  it('checks magic bytes instead of trusting file extensions', () => {
    expect(hasImageSignature(new Uint8Array([255, 216, 255]), 'image/jpeg')).toBe(true);
    expect(hasImageSignature(new TextEncoder().encode('<script>'), 'image/png')).toBe(false);
    expect(hasImageSignature(new Uint8Array([255, 216, 255]), 'image/svg+xml')).toBe(false);
  });
  it('bounds untrusted AI output', () => {
    expect(
      visionOutputSchema.safeParse({
        observation: 'x',
        candidates: Array(10).fill({ id: 'x', reason: 'x' }),
      }).success,
    ).toBe(false);
    expect(
      visionOutputSchema.parse({ observation: 'visible roof', candidates: [], confidence: 99 }),
    ).not.toHaveProperty('confidence');
  });
});
