/**
 * Site-wide access policy: everything requires an authenticated session
 * except the minimum needed to sign in, read the legal documents and
 * receive server-to-server webhooks. Pure + edge-safe so it can run in proxy.ts.
 */
const LOCALES = ['vi', 'en', 'zh'] as const;
const L = `(?:${LOCALES.join('|')})`;

const PUBLIC_PAGES: RegExp[] = [
  /^\/$/, // root only redirects to /{locale}
  new RegExp(`^\\/${L}\\/auth\\/(?:login|register|forgot|reset)\\/?$`),
  new RegExp(`^\\/${L}\\/(?:terms|privacy|credits)\\/?$`),
  /^\/auth\/(?:callback|confirm|google\/callback)\/?$/,
];

const PUBLIC_API: RegExp[] = [
  /^\/api\/auth\/?$/, // login / register / forgot / logout (captcha-guarded)
  /^\/api\/auth\/google\/?$/, // start Google OAuth (captcha-guarded)
  /^\/api\/captcha\/?$/, // slider puzzle challenge/verify
  /^\/api\/payments\/(?:payos|sepay)\/?$/, // provider webhooks, signature-verified in handler
];

const PUBLIC_STATIC: RegExp[] = [
  /^\/(?:manifest\.webmanifest|robots\.txt|sitemap\.xml|sw\.js|favicon\.ico)$/,
  /^\/(?:icons|images|mobile|website)\//,
  /^\/\.well-known\//,
  /^\/_next\//,
  /^\/__nextjs/,
];

export function isApiPath(pathname: string) {
  return pathname === '/api' || pathname.startsWith('/api/');
}

export function isPublicPath(pathname: string) {
  // Reject traversal/encoding tricks outright: they never match a public route.
  if (pathname.includes('..') || pathname.includes('//') || /%2e|%2f|%5c/i.test(pathname)) return false;
  const list = isApiPath(pathname) ? PUBLIC_API : [...PUBLIC_PAGES, ...PUBLIC_STATIC];
  return list.some((re) => re.test(pathname));
}

export function loginRedirectPath(pathname: string, search: string, cookieLocale?: string) {
  const first = pathname.split('/')[1];
  const locale = (LOCALES as readonly string[]).includes(first)
    ? first
    : cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)
      ? cookieLocale
      : 'vi';
  const next = pathname + search;
  const home = `/${locale}`;
  return `/${locale}/auth/login${next && next !== '/' && next !== home ? `?next=${encodeURIComponent(next)}` : ''}`;
}
