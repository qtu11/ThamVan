import type { Heritage, Kind } from './types';
import type { LngLat } from './routing';

/** The slice of a catalog record the map needs — keeps the page payload small. */
export type MapPlace = {
  id: string;
  slug: string;
  name: string;
  kind: Kind;
  region: string;
  category: string;
  categoryGroup: string;
  address: string;
  latitude: number;
  longitude: number;
  image: string | null;
  description: string;
  history: string;
};

/** A real named place from OpenStreetMap around the visitor. */
export type OsmPlace = {
  id: string;
  name: string;
  kind: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};

export type Basemap = 'streets' | 'light' | 'satellite';

/** One-shot camera instruction for the map; a new `nonce` re-triggers the same target. */
export type MapView =
  | { type: 'point'; longitude: number; latitude: number; zoom: number; nonce: number }
  | { type: 'line'; line: LngLat[]; nonce: number };

/** Only records with surveyed coordinates are placed on the map; nothing is approximated. */
export function toMapPlace(entry: Heritage): MapPlace | null {
  if (
    entry.status !== 'published' ||
    entry.hasGps === false ||
    entry.latitude === null ||
    entry.longitude === null ||
    !Number.isFinite(entry.latitude) ||
    !Number.isFinite(entry.longitude)
  )
    return null;
  return {
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    kind: entry.kind,
    region: entry.region,
    category: entry.category || '',
    categoryGroup: entry.categoryGroup || '',
    address: entry.address || '',
    latitude: entry.latitude,
    longitude: entry.longitude,
    image: entry.hasImage === false ? null : entry.image,
    description: entry.description || entry.translations.vi?.summary || '',
    history: entry.history || '',
  };
}
