import { NextResponse } from 'next/server';
import { nearbyPois, reverseGeocode } from '@/lib/place-context';
import { getCatalog } from '@/lib/data';
import { distanceKm } from '@/lib/geo';
import { toMapPlace, type MapPlace } from '@/lib/map-types';

export const dynamic = 'force-dynamic';

/**
 * Real named places around a point (OpenStreetMap). The response carries place data only —
 * the caller's own position is never echoed back, logged or stored.
 */
export async function GET(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const rawLat = searchParams.get('lat');
  const rawLon = searchParams.get('lon');
  const latitude = Number(rawLat);
  const longitude = Number(rawLon);
  const radius = Number(searchParams.get('radius') || 800);
  if (
    !rawLat ||
    !rawLon ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    !Number.isFinite(radius)
  )
    return NextResponse.json({ error: 'INVALID_COORDINATES' }, { status: 400 });
  const coords = { latitude, longitude };
  if (searchParams.get('source') === 'catalog') {
    // Heritage places from our own catalog within the radius (capped at 3 km), nearest first.
    const limitKm = Math.min(Math.max(radius, 100), 3000) / 1000;
    const places = (await getCatalog())
      .map(toMapPlace)
      .filter((e): e is MapPlace => e !== null)
      .map((e) => ({
        slug: e.slug,
        name: e.name,
        distanceMeters: Math.round(distanceKm(coords, e) * 1000),
      }))
      .filter((e) => e.distanceMeters <= limitKm * 1000)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 20);
    return NextResponse.json(
      { ok: true, places },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  const [places, address] = await Promise.all([
    nearbyPois(coords, radius, 80, request.signal),
    searchParams.get('address') === '1' ? reverseGeocode(coords, request.signal) : null,
  ]);
  return NextResponse.json(
    {
      ok: true,
      area: address?.label ?? null,
      places: (places || []).map(({ id, name, kind, latitude, longitude, distanceMeters }) => ({
        id,
        name,
        kind,
        latitude,
        longitude,
        distanceMeters,
      })),
      placesAvailable: Boolean(places),
      source: 'openstreetmap',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
