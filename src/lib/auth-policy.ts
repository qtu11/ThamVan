import { safeNext } from './geo';
import { isLocale, type Locale } from './types';
export const TERMS_VERSION = '2026-10-26';
export function acceptedCurrentTerms(profile: {
  terms_version?: string | null;
  consented_at?: string | null;
}) {
  return profile.terms_version === TERMS_VERSION && Boolean(profile.consented_at);
}
export function authDestination(value: unknown, locale: Locale) {
  const next = safeNext(value, `/${locale}`);
  const path = new URL(next, 'https://internal.invalid').pathname;
  return /^\/(vi|en|zh)\/auth\/(login|register|consent)(\/|$)/.test(path) ? `/${locale}` : next;
}
export function authLocale(value: unknown, next: string): Locale {
  if (typeof value === 'string' && isLocale(value)) return value;
  const segment = next.split('/')[1]?.split('?')[0];
  return isLocale(segment) ? segment : 'vi';
}
export function authErrorCode(value: unknown) {
  return value === 'access_denied' || value === 'oauthCancelled'
    ? ('oauthCancelled' as const)
    : value === 'oauthFailed'
      ? ('oauthFailed' as const)
      : ('authInvalid' as const);
}
export function checkedGoogleAuthorizeUrl(value: string, supabaseUrl: string) {
  const url = new URL(value),
    expected = new URL(supabaseUrl);
  if (
    url.origin !== expected.origin ||
    url.pathname !== '/auth/v1/authorize' ||
    url.searchParams.get('provider') !== 'google' ||
    url.username ||
    url.password
  )
    throw new Error('INVALID_OAUTH_URL');
  return url.href;
}
// Only call with claims returned by Supabase getClaims(), never with decoded client input.
export function recentGoogleAuthentication(
  claims: Record<string, unknown>,
  userId: string,
  now = Date.now() / 1000,
) {
  if (claims.sub !== userId || !Array.isArray(claims.amr)) return false;
  return claims.amr.some((method: unknown) => {
    if (!method || typeof method !== 'object') return false;
    const item = method as Record<string, unknown>;
    return (
      item.method === 'oauth' &&
      typeof item.timestamp === 'number' &&
      Number.isFinite(item.timestamp) &&
      item.timestamp <= now + 30 &&
      now - item.timestamp <= 300
    );
  });
}
