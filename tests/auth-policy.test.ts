import { it, expect } from 'vitest';
import { createServerClient } from '@supabase/ssr';
import {
  acceptedCurrentTerms,
  authDestination,
  authLocale,
  checkedGoogleAuthorizeUrl,
  recentGoogleAuthentication,
} from '@/lib/auth-policy';
it('requires recorded current consent and prevents auth redirect loops', () => {
  expect(acceptedCurrentTerms({ terms_version: '2026-10-26', consented_at: null })).toBe(false);
  expect(acceptedCurrentTerms({ terms_version: 'old', consented_at: '2026-10-27' })).toBe(false);
  for (const next of [
    'https://evil.test',
    '//evil.test',
    '/vi/../../evil',
    '/en/auth/consent?next=/en/auth/consent',
  ])
    expect(authDestination(next, 'en')).toBe('/en');
  expect(authDestination('/en/journey?sort=new', 'en')).toBe('/en/journey?sort=new');
  expect(authDestination('/en/auth/reset', 'en')).toBe('/en/auth/reset');
  expect(authLocale(null, '/zh/profile')).toBe('zh');
});
it('accepts only the configured Supabase Google authorization URL', () => {
  expect(
    checkedGoogleAuthorizeUrl(
      'https://project.supabase.co/auth/v1/authorize?provider=google',
      'https://project.supabase.co',
    ),
  ).toContain('provider=google');
  for (const bad of [
    'https://evil.test/auth/v1/authorize?provider=google',
    'https://project.supabase.co/auth/v1/authorize?provider=github',
    'https://project.supabase.co/not-auth?provider=google',
  ])
    expect(() => checkedGoogleAuthorizeUrl(bad, 'https://project.supabase.co')).toThrow();
});
it('only accepts recent OAuth authentication from verified same-user claims for deletion', () => {
  const now = 1800000000,
    sub = 'user-id';
  const claims = { sub, amr: [{ method: 'oauth', timestamp: now - 20 }] };
  expect(recentGoogleAuthentication(claims, sub, now)).toBe(true);
  expect(recentGoogleAuthentication(claims, 'other-user', now)).toBe(false);
  for (const amr of [
    [],
    [{ method: 'password', timestamp: now }],
    [{ method: 'oauth', timestamp: now - 301 }],
    [{ method: 'oauth', timestamp: now + 60 }],
    [{ method: 'oauth', timestamp: String(now) }],
  ])
    expect(recentGoogleAuthentication({ sub, amr }, sub, now)).toBe(false);
});
it('uses the real SSR SDK to set an HttpOnly PKCE verifier and generate S256 authorization', async () => {
  let cookies: { name: string; value: string; options?: { httpOnly?: boolean } }[] = [];
  const db = createServerClient('https://project.supabase.co', 'sb_publishable_test', {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: true, path: '/' },
    cookies: {
      getAll: () => cookies,
      setAll: (items) => {
        cookies = items;
      },
    },
  });
  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      skipBrowserRedirect: true,
      redirectTo: 'https://thamvan.example/auth/callback?locale=en',
      scopes: 'email profile',
      queryParams: { prompt: 'select_account' },
    },
  });
  expect(error).toBeNull();
  const target = new URL(data.url!);
  expect(target.searchParams.get('code_challenge_method')).toBe('s256');
  expect(target.searchParams.get('code_challenge')).toBeTruthy();
  expect(target.searchParams.get('redirect_to')).toContain('/auth/callback');
  expect(cookies.some((c) => c.name.includes('code-verifier') && c.options?.httpOnly)).toBe(true);
});
