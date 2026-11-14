import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { siteUrl } from '@/lib/env';
function basemapOrigin() {
  try {
    const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
    return custom ? new URL(custom).origin : 'https://tiles.openfreemap.org';
  } catch {
    return 'https://tiles.openfreemap.org';
  }
}
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV !== 'production';
  if (dev && !request.nextUrl.pathname.startsWith('/api/') && request.nextUrl.hostname === '127.0.0.1') {
    const canonical = new URL(siteUrl());
    if (canonical.hostname === 'localhost' && canonical.port === request.nextUrl.port) {
      return NextResponse.redirect(
        new URL(request.nextUrl.pathname + request.nextUrl.search, canonical.origin),
        307,
      );
    }
  }
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : '';
  const mapOrigin = basemapOrigin();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${dev ? "'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${mapOrigin} ${supabaseOrigin}`,
    "font-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    // MapLibre fetches the vector style, tiles, sprites and glyphs straight from the basemap host.
    `connect-src 'self' ${dev ? 'ws:' : ''} ${mapOrigin} ${supabaseOrigin} https://challenges.cloudflare.com`,
    'frame-src https://challenges.cloudflare.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://pay.sepay.vn",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const locale = request.nextUrl.pathname.split('/')[1];
  headers.set('x-locale', ['vi', 'en', 'zh'].includes(locale) ? locale : 'vi');
  headers.set('x-app-path', request.nextUrl.pathname + request.nextUrl.search);
  let response = NextResponse.next({ request: { headers } });
  const skipAuthRefresh = /^\/api\/(tiles|route|locate|nearby)(\/|$)/.test(request.nextUrl.pathname);
  const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'));
  if (
    !skipAuthRefresh &&
    hasAuthCookie &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const db = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookieOptions: { httpOnly: true, secure: !dev, sameSite: 'lax', path: '/' },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (items) => {
            items.forEach(({ name, value }) => request.cookies.set(name, value));
            headers.set('cookie', request.headers.get('cookie') || '');
            response = NextResponse.next({ request: { headers } });
            items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );
    await db.auth.getUser();
  }
  response.headers.set('Content-Security-Policy', csp);
  // Auth and user-dependent responses must never be cached by shared CDNs.
  if (!request.nextUrl.pathname.startsWith('/api/tiles')) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico|robots.txt|sitemap.xml).*)'],
};
