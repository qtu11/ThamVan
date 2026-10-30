import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory tile cache to serve pan/zoom in 0ms
const tileCache = new Map<string, { buffer: Buffer; contentType: string; time: number }>();
const MAX_CACHE_SIZE = 1200;

function pruneCache() {
  if (tileCache.size > MAX_CACHE_SIZE) {
    const oldestKeys = Array.from(tileCache.keys()).slice(0, 300);
    for (const key of oldestKeys) {
      tileCache.delete(key);
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const layer = searchParams.get('layer') || 'voyager';
    const z = searchParams.get('z');
    const x = searchParams.get('x');
    const y = searchParams.get('y');

    if (!z || !x || !y) {
      return NextResponse.json({ error: 'MISSING_TILE_COORDINATES' }, { status: 400 });
    }

    const cacheKey = `${layer}:${z}:${x}:${y}`;
    const cached = tileCache.get(cacheKey);
    if (cached) {
      return new Response(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
          'X-Tile-Cache': 'HIT',
        },
      });
    }

    let urls: { url: string; defaultType: string }[] = [];
    if (layer === 'esriSat') {
      urls = [
        {
          url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
          defaultType: 'image/jpeg',
        },
      ];
    } else if (layer === 'esriTopo') {
      urls = [
        {
          url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`,
          defaultType: 'image/jpeg',
        },
      ];
    } else if (layer === 'heritageLight') {
      urls = [
        {
          url: `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}@2x.png`,
          defaultType: 'image/png',
        },
        {
          url: `https://b.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
          defaultType: 'image/png',
        },
        {
          url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`,
          defaultType: 'image/jpeg',
        },
      ];
    } else {
      // Default & esriStreet: Crisp Carto Voyager @2x retina map with Esri Topo fallback
      urls = [
        {
          url: `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`,
          defaultType: 'image/png',
        },
        {
          url: `https://b.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
          defaultType: 'image/png',
        },
        {
          url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`,
          defaultType: 'image/jpeg',
        },
      ];
    }

    for (const item of urls) {
      try {
        const res = await fetch(item.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || item.defaultType;
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          pruneCache();
          tileCache.set(cacheKey, { buffer, contentType, time: Date.now() });

          return new Response(new Uint8Array(buffer), {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
              'X-Tile-Cache': 'MISS',
            },
          });
        }
      } catch {
        // Try next fallback
      }
    }

    // 1x1 transparent PNG fallback if all upstreams fail
    const fallbackPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    return new Response(new Uint8Array(fallbackPng), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TILE_ERROR' },
      { status: 500 }
    );
  }
}
