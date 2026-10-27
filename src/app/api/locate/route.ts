import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isLocalOrPrivateIp(ip: string): boolean {
  return (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  );
}

export async function GET(request: Request) {
  try {
    const headers = request.headers;
    const forwarded = headers.get('x-forwarded-for');
    const realIp = headers.get('x-real-ip');
    const cfIp = headers.get('cf-connecting-ip');

    const clientIp = (cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : '')).trim();

    // If local development or private IP, discover outward public IP
    let ipToLookup = clientIp;
    if (isLocalOrPrivateIp(clientIp)) {
      try {
        const ipifyRes = await fetch('https://api.ipify.org?format=json', {
          signal: AbortSignal.timeout(3000),
        });
        if (ipifyRes.ok) {
          const ipifyData = await ipifyRes.json();
          if (ipifyData?.ip) {
            ipToLookup = ipifyData.ip;
          }
        }
      } catch {
        // Fallback: use default location for HCMC
      }
    }

    // Lookup IP location
    const lookupUrl = ipToLookup && !isLocalOrPrivateIp(ipToLookup)
      ? `http://ip-api.com/json/${ipToLookup}?fields=status,message,country,regionName,city,lat,lon,isp,query`
      : 'http://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon,isp,query';

    let locationData: {
      status?: string;
      query?: string;
      country?: string;
      regionName?: string;
      city?: string;
      lat?: number;
      lon?: number;
      isp?: string;
    } = {};

    try {
      const geoRes = await fetch(lookupUrl, {
        signal: AbortSignal.timeout(4000),
      });
      if (geoRes.ok) {
        locationData = await geoRes.json();
      }
    } catch {
      // Continue with fallbacks
    }

    const finalIp = locationData.query || ipToLookup || '113.173.80.49';
    const latitude = typeof locationData.lat === 'number' ? locationData.lat : 10.822;
    const longitude = typeof locationData.lon === 'number' ? locationData.lon : 106.6257;
    const city = locationData.city || 'TP. Hồ Chí Minh';
    const region = locationData.regionName || 'Hồ Chí Minh';
    const country = locationData.country || 'Việt Nam';
    const isp = locationData.isp || 'Mạng Internet';

    return NextResponse.json({
      ip: finalIp,
      latitude,
      longitude,
      city,
      region,
      country,
      isp,
      source: 'device_ip',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ip: '127.0.0.1',
        latitude: 10.822,
        longitude: 106.6257,
        city: 'TP. Hồ Chí Minh',
        region: 'Hồ Chí Minh',
        country: 'Việt Nam',
        isp: 'Nội bộ',
        source: 'fallback',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      },
      { status: 200 }
    );
  }
}
