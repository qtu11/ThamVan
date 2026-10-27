import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromLat = parseFloat(searchParams.get('fromLat') || '');
    const fromLon = parseFloat(
      searchParams.get('fromLon') || searchParams.get('fromLng') || ''
    );
    const toLat = parseFloat(searchParams.get('toLat') || '');
    const toLon = parseFloat(
      searchParams.get('toLon') || searchParams.get('toLng') || ''
    );

    if (isNaN(fromLat) || isNaN(fromLon) || isNaN(toLat) || isNaN(toLon)) {
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
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // OSRM returns coordinates as [lon, lat], Leaflet polyline expects [lat, lon]
          const coordinates = (route.geometry?.coordinates || []).map(
            (c: [number, number]) => [c[1], c[0]]
          );

          return NextResponse.json({
            ok: true,
            distanceKm: Number((route.distance / 1000).toFixed(1)),
            durationMinutes: Math.round(route.duration / 60),
            coordinates,
            source: 'osrm',
          });
        }
      }
    } catch {
      // Fallback below
    }

    // Direct line fallback if routing engine is unreachable
    return NextResponse.json({
      ok: true,
      distanceKm: 0,
      durationMinutes: 0,
      coordinates: [
        [fromLat, fromLon],
        [toLat, toLon],
      ],
      source: 'direct_fallback',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ROUTE_FAILED' },
      { status: 500 }
    );
  }
}
