import { NextResponse } from 'next/server';
import { distanceKm } from '@/lib/geo';
import { isRouteMode, parseOsrmRoute, type RouteMode, type RouteResult } from '@/lib/routing';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Street directions from real OSRM engines on OpenStreetMap data.
 * There is deliberately no straight-line fallback: when no engine answers, the client is told so.
 */
const PROFILE: Record<RouteMode, string> = { driving: 'car', walking: 'foot', cycling: 'bike' };

function upstreams(mode: RouteMode, path: string) {
  const query = 'overview=full&geometries=geojson&steps=true';
  const custom = process.env.ROUTING_API_URL?.trim().replace(/\/$/, '');
  const list: string[] = [];
  // ROUTING_API_URL may contain {profile} (car | foot | bike), e.g. https://osrm.example/routed-{profile}
  if (custom?.startsWith('https://'))
    list.push(`${custom.replace('{profile}', PROFILE[mode])}/route/v1/driving/${path}?${query}`);
  list.push(
    `https://routing.openstreetmap.de/routed-${PROFILE[mode]}/route/v1/driving/${path}?${query}`,
  );
  // The public OSRM demo only serves the car profile.
  if (mode === 'driving')
    list.push(`https://router.project-osrm.org/route/v1/driving/${path}?${query}`);
  return list;
}

const cache = new Map<string, { value: RouteResult; expires: number }>();

function coordinate(value: string | null, limit: number) {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

export async function GET(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const fromLat = coordinate(searchParams.get('fromLat'), 90);
  const fromLon = coordinate(searchParams.get('fromLon') ?? searchParams.get('fromLng'), 180);
  const toLat = coordinate(searchParams.get('toLat'), 90);
  const toLon = coordinate(searchParams.get('toLon') ?? searchParams.get('toLng'), 180);
  const requestedMode = searchParams.get('mode') || 'driving';
  if (
    fromLat === null ||
    fromLon === null ||
    toLat === null ||
    toLon === null ||
    !isRouteMode(requestedMode)
  )
    return NextResponse.json({ error: 'INVALID_COORDINATES' }, { status: 400 });
  const mode = requestedMode;
  const straightKm = distanceKm(
    { latitude: fromLat, longitude: fromLon },
    { latitude: toLat, longitude: toLon },
  );
  if (straightKm > (mode === 'driving' ? 400 : 60))
    return NextResponse.json({ error: 'ROUTE_TOO_LONG' }, { status: 422 });

  // 5 decimals ≈ 1 m: enough for a kerb, and it keeps the cache key stable while standing still.
  const path = `${fromLon.toFixed(5)},${fromLat.toFixed(5)};${toLon.toFixed(5)},${toLat.toFixed(5)}`;
  const key = `${mode}:${path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now())
    return NextResponse.json(
      { ok: true, ...hit.value, source: 'osrm' },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );

  for (const url of upstreams(mode, path)) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(7000)]),
        headers: { 'User-Agent': `ThamVan/1.0 (+${siteUrl()})`, Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        continue;
      }
      const route = parseOsrmRoute(await response.json(), mode);
      if (!route) continue;
      if (cache.size >= 300) for (const old of [...cache.keys()].slice(0, 100)) cache.delete(old);
      cache.set(key, { value: route, expires: Date.now() + 5 * 60_000 });
      return NextResponse.json(
        { ok: true, ...route, source: 'osrm' },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    } catch {
      if (request.signal.aborted) break;
    }
  }
  return NextResponse.json({ error: 'ROUTE_UNAVAILABLE' }, { status: 502 });
}
