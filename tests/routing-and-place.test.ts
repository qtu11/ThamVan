import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { formatDistance, formatDuration, parseOsrmRoute, stepText, distanceToLineMeters } from '@/lib/routing';
import { clearPlaceContextCache, nearbyPois, reverseGeocode } from '@/lib/place-context';
import { finalizeRecognition, recognitionLocationContext } from '@/lib/recognition';
import { parseDeviceConsent } from '@/lib/device-consent';
import { toMapPlace } from '@/lib/map-types';
import { catalog } from '@/data/catalog';

afterEach(() => {
  vi.unstubAllGlobals();
  clearPlaceContextCache();
});

describe('routing helpers', () => {
  it('rejects malformed engine output instead of guessing', () => {
    expect(parseOsrmRoute({ code: 'NoRoute' }, 'driving')).toBeNull();
    expect(
      parseOsrmRoute({ code: 'Ok', routes: [{ distance: 1, duration: 1, geometry: { coordinates: [[1, 1]] } }] }, 'driving'),
    ).toBeNull();
  });
  it('writes readable Vietnamese instructions and units', () => {
    const step = { type: 'turn', modifier: 'left', name: 'Lê Lợi', exit: null, distanceMeters: 120, durationSeconds: 30, location: [106.7, 10.77] as [number, number] };
    expect(stepText(step, 'vi')).toBe('Rẽ trái vào Lê Lợi');
    expect(stepText({ ...step, type: 'roundabout', exit: 2 }, 'en')).toBe('At the roundabout take exit 2 onto Lê Lợi');
    expect(formatDistance(1530, 'vi')).toBe('1,5 km');
    expect(formatDistance(84, 'en')).toBe('80 m');
    expect(formatDuration(3900, 'vi')).toBe('1 giờ 5 phút');
    expect(distanceToLineMeters({ latitude: 10.77, longitude: 106.7 }, [[106.7, 10.77], [106.71, 10.77]])).toBeLessThan(1);
  });
});

describe('real place context', () => {
  it('turns OpenStreetMap answers into names and distances, rounding the coordinates it sends', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      if (String(url).includes('/reverse'))
        return Response.json({
          name: 'Nhà thờ Đức Bà',
          category: 'amenity',
          type: 'place_of_worship',
          address: { road: 'Công xã Paris', quarter: 'Phường Bến Nghé', city_district: 'Quận 1', city: 'Thành phố Hồ Chí Minh' },
        });
      return Response.json({
        elements: [
          { type: 'way', id: 1, center: { lat: 10.7798, lon: 106.699 }, tags: { name: 'Nhà thờ Đức Bà', amenity: 'place_of_worship', religion: 'christian' } },
          { type: 'node', id: 2, lat: 10.7799, lon: 106.6999, tags: { name: 'Bưu điện Trung tâm Sài Gòn', historic: 'building' } },
          { type: 'node', id: 3, lat: 10.9, lon: 106.9, tags: { name: 'Far away', amenity: 'cafe' } },
          { type: 'node', id: 4, lat: 10.7798, lon: 106.699, tags: { amenity: 'bench' } },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const here = { latitude: 10.779812345, longitude: 106.699012345 };
    const address = await reverseGeocode(here);
    expect(address?.label).toBe('Công xã Paris, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh');
    const pois = await nearbyPois(here, 300, 10);
    expect(pois?.map((poi) => poi.name)).toEqual(['Nhà thờ Đức Bà', 'Bưu điện Trung tâm Sài Gòn']);
    expect(pois?.[0].kind).toBe('worship');
    for (const call of fetchMock.mock.calls) expect(String(call[0]) + String(call[1]?.body ?? '')).not.toContain('123');
  });
  it('reports an outage as null, never as an invented list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await nearbyPois({ latitude: 10.77, longitude: 106.7 }, 500, 10)).toBeNull();
    expect(await reverseGeocode({ latitude: 10.77, longitude: 106.7 })).toBeNull();
  });
});

describe('location-aware recognition', () => {
  const location = { source: 'device' as const, latitude: 10.78, longitude: 106.7, accuracy: 12, timestamp: Date.now() };
  const context = {
    address: { label: 'Công xã Paris, Quận 1', feature: 'Nhà thờ Đức Bà', featureTag: 'amenity=place_of_worship' },
    nearby: [{ id: 'w1', name: 'Nhà thờ Đức Bà', kind: 'worship' as const, tag: 'amenity=place_of_worship (christian)', latitude: 10.78, longitude: 106.7, distanceMeters: 15 }],
  };
  const parsed = {
    observation: 'Lư hương đồng',
    subject: { name: 'Lư hương', category: 'Vật thờ', whatItIs: 'Bình đốt nhang', generalUse: 'Cắm nhang', purposeHere: 'Nơi khách thắp nhang trước nhà thờ', certainty: 'medium' as const },
    candidates: [],
    objects: [{ name: 'Lư hương', description: 'Đồng', purpose: 'Cắm nhang', culturalContext: null, placeId: null }],
    limitations: [],
  };
  it('sends names and distances to the AI, never coordinates', () => {
    const sent = JSON.stringify(recognitionLocationContext(context, location, 'camera'));
    expect(sent).toContain('Nhà thờ Đức Bà');
    expect(sent).not.toContain('10.78');
    expect(sent).not.toContain('106.7');
    expect(recognitionLocationContext(null, null, 'camera')).toEqual({ available: false });
  });
  it('keeps "purpose here" only when there is a real location, and exposes no coordinates', () => {
    const withPlace = finalizeRecognition(parsed, { observation: 'x', visibleText: [], searchHints: [] }, [], location, context, 'camera');
    expect(withPlace.subject?.purposeHere).toContain('thắp nhang');
    expect(withPlace.place?.label).toBe('Công xã Paris, Quận 1');
    expect(JSON.stringify(withPlace)).not.toMatch(/10\.78|106\.7|accuracy/);
    const without = finalizeRecognition(parsed, { observation: 'x', visibleText: [], searchHints: [] }, [], null, null, 'gallery');
    expect(without.subject?.purposeHere).toBeNull();
    expect(without.place).toBeNull();
  });
});

describe('device consent and map data', () => {
  it('requires the current version and accepted terms', () => {
    expect(parseDeviceConsent(null)).toBeNull();
    expect(parseDeviceConsent('{"version":1,"acceptedAt":"x","terms":false}')).toBeNull();
    expect(parseDeviceConsent('{"version":1,"acceptedAt":"x","terms":true,"location":true}')?.location).toBe(true);
    expect(parseDeviceConsent('not json')).toBeNull();
  });
  it('only maps records that have surveyed coordinates', () => {
    expect(toMapPlace({ ...catalog[0], hasGps: false })).toBeNull();
    expect(toMapPlace({ ...catalog[0], latitude: null, longitude: null })).toBeNull();
  });
});
