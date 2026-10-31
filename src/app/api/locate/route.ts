import { NextResponse } from 'next/server';
// The server cannot determine device GPS. Legacy IP/default coordinates were misleading.
export function GET() {
  return NextResponse.json({ error: 'deviceLocationRequired', source: 'unavailable',
    latitude: null, longitude: null }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
