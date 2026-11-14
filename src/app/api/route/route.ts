import { NextResponse } from 'next/server';
import { distanceKm } from '@/lib/geo';

export const dynamic = 'force-dynamic';

function isValidCoordinate(lat: number, lon: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromLat = Number(searchParams.get('fromLat'));
    const fromLon = Number(searchParams.get('fromLon') ?? searchParams.get('fromLng'));
    const toLat = Number(searchParams.get('toLat'));
    const toLon = Number(searchParams.get('toLon') ?? searchParams.get('toLng'));

    if (
      !searchParams.has('fromLat') ||
      (!searchParams.has('fromLon') && !searchParams.has('fromLng')) ||
      !searchParams.has('toLat') ||
      (!searchParams.has('toLon') && !searchParams.has('toLng')) ||
      !isValidCoordinate(fromLat, fromLon) ||
      !isValidCoordinate(toLat, toLon)
    ) {
      return NextResponse.json(
        { error: 'INVALID_COORDINATES' },
        { status: 400 }
      );
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(osrmUrl, {
        signal: AbortSignal.timeout(6000),
        headers: {
          'User-Agent': 'ThamVanApp/1.0',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
          const route = data.routes[0];
          // OSRM returns coordinates as [lon, lat], Leaflet polyline expects [lat, lon]
          const coordinates = Array.isArray(route.geometry?.coordinates)
            ? route.geometry.coordinates
                .filter(
                  (c: unknown): c is [number, number] =>
                    Array.isArray(c) &&
                    c.length >= 2 &&
                    typeof c[0] === 'number' &&
                    typeof c[1] === 'number',
                )
                .map((c: [number, number]) => [c[1], c[0]])
            : [];

          if (coordinates.length >= 2) {
            return NextResponse.json({
              ok: true,
              distanceKm: Number((Number(route.distance || 0) / 1000).toFixed(1)),
              durationMinutes: Math.round(Number(route.duration || 0) / 60),
              coordinates,
              source: 'osrm',
            });
          }
        }
      }
    } catch {
      // Fallback below
    }

    // Direct Haversine fallback if routing engine is unreachable
    const directKm = distanceKm(
      { latitude: fromLat, longitude: fromLon },
      { latitude: toLat, longitude: toLon },
    );
    return NextResponse.json({
      ok: true,
      distanceKm: Number(directKm.toFixed(1)),
      durationMinutes: directKm > 0 ? Math.max(1, Math.round((directKm / 22) * 60)) : 0,
      coordinates: [
        [fromLat, fromLon],
        [toLat, toLon],
      ],
      source: 'direct_fallback',
    });
  } catch {
    return NextResponse.json(
      { error: 'ROUTE_FAILED' },
      { status: 500 }
    );
  }
}
