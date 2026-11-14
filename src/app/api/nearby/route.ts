import { NextResponse } from 'next/server';
import { nearbyPois, reverseGeocode } from '@/lib/place-context';

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
  const [places, address] = await Promise.all([
    nearbyPois(coords, radius, 80, request.signal),
    searchParams.get('address') === '1' ? reverseGeocode(coords, request.signal) : null,
  ]);
  if (!places && !address)
    return NextResponse.json({ error: 'NEARBY_UNAVAILABLE' }, { status: 502 });
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
