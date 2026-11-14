import 'server-only';
import { distanceKm, type Coordinates } from './geo';
import { siteUrl } from './env';

/**
 * Real-world context for a device position, from OpenStreetMap services.
 * Everything here fails soft (null) — callers must never substitute invented places.
 * Coordinates are rounded before they leave the server and are never logged.
 */
export type NearbyPoi = {
  id: string;
  name: string;
  kind: PoiKind;
  /** Raw OSM classification such as "amenity=place_of_worship (buddhist)". */
  tag: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};
export type PlaceAddress = {
  /** Human label without coordinates, e.g. "Công xã Paris, Phường Bến Nghé, Quận 1". */
  label: string;
  /** Name of the feature the point falls on, when OSM has one. */
  feature: string | null;
  featureTag: string | null;
};
export type PlaceContext = { address: PlaceAddress | null; nearby: NearbyPoi[] };

export const poiKinds = [
  'heritage',
  'worship',
  'museum',
  'attraction',
  'park',
  'cafe',
  'food',
  'market',
  'shop',
  'hotel',
  'education',
  'health',
  'culture',
  'service',
  'transport',
  'other',
] as const;
export type PoiKind = (typeof poiKinds)[number];

const userAgent = () => `ThamVan/1.0 (+${siteUrl()})`;
const geocoderUrl = () =>
  (process.env.GEOCODER_API_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const overpassUrls = () =>
  (
    process.env.OVERPASS_API_URL ||
    'https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter'
  )
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.startsWith('https://'));

type CacheEntry<T> = { value: T; expires: number };
function cached<T>(store: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}
function remember<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  if (store.size >= 400) for (const old of [...store.keys()].slice(0, 100)) store.delete(old);
  store.set(key, { value, expires: Date.now() + ttlMs });
}
const addressCache = new Map<string, CacheEntry<PlaceAddress>>();
const poiCache = new Map<string, CacheEntry<RawPoi[]>>();
/** Test hook. */
export function clearPlaceContextCache() {
  addressCache.clear();
  poiCache.clear();
}

const text = (value: unknown, max = 120) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export async function reverseGeocode(
  coords: Coordinates,
  signal?: AbortSignal,
): Promise<PlaceAddress | null> {
  // ~11 m grid: precise enough for a street, coarse enough to share cache entries.
  const lat = coords.latitude.toFixed(4);
  const lon = coords.longitude.toFixed(4);
  const key = `${lat},${lon}`;
  const hit = cached(addressCache, key);
  if (hit) return hit;
  try {
    const response = await fetch(
      `${geocoderUrl()}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=vi`,
      {
        headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(4000)])
          : AbortSignal.timeout(4000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }
    const data = (await response.json()) as {
      name?: unknown;
      category?: unknown;
      type?: unknown;
      address?: Record<string, unknown>;
    };
    const a = data.address || {};
    const road = [text(a.house_number, 20), text(a.road || a.pedestrian || a.footway)]
      .filter(Boolean)
      .join(' ');
    const parts = [
      road,
      text(a.quarter || a.neighbourhood || a.suburb),
      text(a.city_district || a.district || a.county || a.town),
      text(a.city || a.province || a.state),
    ].filter(Boolean);
    const label = [...new Set(parts)].join(', ');
    if (!label) return null;
    const feature = text(data.name);
    const value: PlaceAddress = {
      label,
      feature: feature && feature !== text(a.road) ? feature : null,
      featureTag:
        feature && text(data.category, 40) && text(data.type, 40)
          ? `${text(data.category, 40)}=${text(data.type, 40)}`
          : null,
    };
    remember(addressCache, key, value, 30 * 60_000);
    return value;
  } catch {
    return null;
  }
}

type RawPoi = { id: string; name: string; kind: PoiKind; tag: string; lat: number; lon: number };

function classify(tags: Record<string, string>): { kind: PoiKind; tag: string } {
  const detail = (key: string, extra?: string) =>
    `${key}=${tags[key]}${extra && tags[extra] ? ` (${tags[extra]})` : ''}`.slice(0, 80);
  if (tags.historic) return { kind: 'heritage', tag: detail('historic') };
  if (tags.amenity === 'place_of_worship') return { kind: 'worship', tag: detail('amenity', 'religion') };
  if (tags.tourism === 'museum' || tags.tourism === 'gallery')
    return { kind: 'museum', tag: detail('tourism') };
  if (tags.tourism === 'hotel' || tags.tourism === 'hostel' || tags.tourism === 'guest_house')
    return { kind: 'hotel', tag: detail('tourism') };
  if (tags.tourism) return { kind: 'attraction', tag: detail('tourism') };
  if (tags.leisure) return { kind: 'park', tag: detail('leisure') };
  if (tags.amenity === 'cafe') return { kind: 'cafe', tag: detail('amenity') };
  if (['restaurant', 'fast_food', 'food_court', 'bar', 'pub'].includes(tags.amenity))
    return { kind: 'food', tag: detail('amenity', 'cuisine') };
  if (tags.amenity === 'marketplace') return { kind: 'market', tag: detail('amenity') };
  if (['university', 'college', 'school', 'library'].includes(tags.amenity))
    return { kind: 'education', tag: detail('amenity') };
  if (['hospital', 'clinic', 'pharmacy'].includes(tags.amenity))
    return { kind: 'health', tag: detail('amenity') };
  if (['theatre', 'cinema', 'arts_centre', 'community_centre'].includes(tags.amenity))
    return { kind: 'culture', tag: detail('amenity') };
  if (['bus_station', 'ferry_terminal'].includes(tags.amenity) || tags.railway === 'station')
    return { kind: 'transport', tag: tags.railway ? detail('railway') : detail('amenity') };
  if (tags.amenity) return { kind: 'service', tag: detail('amenity') };
  if (tags.shop) return { kind: 'shop', tag: detail('shop') };
  return { kind: 'other', tag: '' };
}

function overpassQuery(lat: string, lon: string, radius: number) {
  const around = `(around:${radius},${lat},${lon})[name]`;
  return `[out:json][timeout:8];(
nwr${around}[historic];
nwr${around}[tourism~"^(attraction|museum|gallery|artwork|viewpoint|zoo|theme_park|hotel|hostel|guest_house)$"];
nwr${around}[amenity~"^(place_of_worship|cafe|restaurant|fast_food|food_court|bar|pub|marketplace|theatre|cinema|arts_centre|community_centre|library|university|college|school|hospital|clinic|pharmacy|townhall|post_office|bank|bus_station|ferry_terminal)$"];
nwr${around}[leisure~"^(park|garden|stadium|sports_centre)$"];
nwr${around}[shop~"^(mall|supermarket|department_store|books)$"];
nwr${around}[railway=station];
);out center tags 400;`;
}

async function fetchPois(lat: string, lon: string, radius: number, signal?: AbortSignal) {
  const body = new URLSearchParams({ data: overpassQuery(lat, lon, radius) });
  for (const url of overpassUrls()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(9000)])
          : AbortSignal.timeout(9000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        continue;
      }
      const data = (await response.json()) as { elements?: unknown };
      if (!Array.isArray(data.elements)) continue;
      const seen = new Set<string>();
      const list: RawPoi[] = [];
      for (const raw of data.elements) {
        const element = raw as {
          type?: unknown;
          id?: unknown;
          lat?: unknown;
          lon?: unknown;
          center?: { lat?: unknown; lon?: unknown };
          tags?: Record<string, string>;
        };
        const pLat = Number(element.lat ?? element.center?.lat);
        const pLon = Number(element.lon ?? element.center?.lon);
        const tags = element.tags || {};
        const name = text(tags['name:vi'] || tags.name);
        if (!name || !Number.isFinite(pLat) || !Number.isFinite(pLon)) continue;
        const { kind, tag } = classify(tags);
        // The same building is often mapped as node + way; keep one.
        const dedupe = `${name.toLowerCase()}|${pLat.toFixed(3)}|${pLon.toFixed(3)}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        list.push({ id: `${String(element.type)[0]}${element.id}`, name, kind, tag, lat: pLat, lon: pLon });
      }
      return list;
    } catch {
      if (signal?.aborted) return null;
    }
  }
  return null;
}

/** Named real places around a point, nearest first. `null` = service unavailable (not "nothing here"). */
export async function nearbyPois(
  coords: Coordinates,
  radiusMeters: number,
  limit: number,
  signal?: AbortSignal,
): Promise<NearbyPoi[] | null> {
  const radius = Math.round(Math.min(2000, Math.max(100, radiusMeters)));
  // ~110 m grid for cache sharing; the query radius is padded so the true circle stays covered.
  const lat = coords.latitude.toFixed(3);
  const lon = coords.longitude.toFixed(3);
  const key = `${lat},${lon},${radius}`;
  let raw = cached(poiCache, key);
  if (!raw) {
    const fetched = await fetchPois(lat, lon, radius + 80, signal);
    if (!fetched) return null;
    raw = fetched;
    remember(poiCache, key, raw, 15 * 60_000);
  }
  return raw
    .map((poi) => ({
      id: poi.id,
      name: poi.name,
      kind: poi.kind,
      tag: poi.tag,
      latitude: poi.lat,
      longitude: poi.lon,
      distanceMeters: Math.round(
        distanceKm(coords, { latitude: poi.lat, longitude: poi.lon }) * 1000,
      ),
    }))
    .filter((poi) => poi.distanceMeters <= radius)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, Math.min(150, Math.max(1, limit)));
}

/** Address + closest named places for the vision model. Bounded by the caller's signal. */
export async function placeContext(
  coords: Coordinates,
  signal?: AbortSignal,
): Promise<PlaceContext | null> {
  const [address, nearby] = await Promise.all([
    reverseGeocode(coords, signal),
    nearbyPois(coords, 200, 12, signal),
  ]);
  if (!address && !nearby?.length) return null;
  return { address, nearby: nearby || [] };
}
