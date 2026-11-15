import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isApiPath, isPublicPath, loginRedirectPath } from '@/lib/access-policy';
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
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : '';
  const mapOrigin = basemapOrigin();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${dev ? "'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${mapOrigin} ${supabaseOrigin}`,
    "font-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    // MapLibre fetches the vector style, tiles, sprites and glyphs straight from the basemap host.
    `connect-src 'self' ${dev ? 'ws:' : ''} ${mapOrigin} ${supabaseOrigin}`,
    "frame-src 'none'",
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
  const pathname = request.nextUrl.pathname;
  const skipAuthRefresh = /^\/api\/(tiles|route|locate|nearby)(\/|$)/.test(pathname);
  const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'));
  const supabaseReady = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  let authenticated = false;
  if (hasAuthCookie && supabaseReady) {
    const db = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookieOptions: { httpOnly: true, secure: !dev, sameSite: 'lax', path: '/' },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (items) => {
            const prevCookies = response.cookies.getAll();
            items.forEach(({ name, value }) => request.cookies.set(name, value));
            headers.set('cookie', request.headers.get('cookie') || '');
            response = NextResponse.next({ request: { headers } });
            prevCookies.forEach((cookie) => response.cookies.set(cookie));
            items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );
    try {
      if (skipAuthRefresh) {
        // Hot map endpoints: verify the JWT signature/expiry without an Auth round-trip.
        const { data, error } = await db.auth.getClaims();
        authenticated = !error && !!data?.claims?.sub;
      } else {
        const { data, error } = await db.auth.getUser();
        authenticated = !error && !!data.user;
      }
    } catch {
      authenticated = false;
    }
  }
  // Supabase missing in local dev = demo mode; in production the site stays locked.
  const bypass = !supabaseReady && dev;
  if (!authenticated && !bypass && (!isPublicPath(pathname) || pathname === '/')) {
    let denied: NextResponse;
    if (isApiPath(pathname)) {
      denied = NextResponse.json(
        { error: 'authRequired' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    } else {
      const target = loginRedirectPath(
        pathname,
        request.nextUrl.search,
        request.cookies.get('tv-locale')?.value,
      );
      denied = NextResponse.redirect(new URL(target, request.url), 307);
      denied.headers.set('Cache-Control', 'private, no-store');
    }
    // Propagate cookie clears from a failed refresh so stale sessions are dropped.
    response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
    denied.headers.set('Content-Security-Policy', csp);
    return denied;
  }
  response.headers.set('Content-Security-Policy', csp);
  // Auth and user-dependent responses must never be cached by shared CDNs.
  if (!request.nextUrl.pathname.startsWith('/api/tiles')) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}
export const config = {
  // Public static folders skip the proxy so they keep the cache headers from next.config.ts.
  matcher: [
    '/((?!_next/static|_next/image|images/|icons/|mobile/|website/|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
