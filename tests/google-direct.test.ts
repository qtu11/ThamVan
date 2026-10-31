import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
vi.mock('server-only', () => ({}));
const fake = vi.hoisted(() => ({
  values: new Map<string, string>(), setCookie: vi.fn(),
  auth: { signInWithIdToken: vi.fn(), signOut: vi.fn() }, single: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({
  get: (name: string) => fake.values.has(name) ? { value: fake.values.get(name) } : undefined,
  set: (name: string, value: string, options: { maxAge: number }) => {
    fake.setCookie(name, value, options);
    if (options.maxAge === 0) fake.values.delete(name); else fake.values.set(name, value);
  },
}) }));
vi.mock('@/lib/data', () => ({ getViewer: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ supabase: async () => ({ auth: fake.auth,
  from: () => ({ select: () => ({ eq: () => ({ single: fake.single }) }) }),
}) }));
import { POST as start } from '@/app/api/auth/google/route';
import { GET as callback } from '@/app/auth/google/callback/route';
import { startDirectGoogle } from '@/lib/google-oauth';
import { hasGoogleAuth } from '@/lib/env';
const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); fake.values.clear(); fetchMock.mockReset();
  for (const [key, value] of Object.entries({ NODE_ENV: 'test', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public',
    AUTH_GOOGLE_ENABLED: 'true', AUTH_GOOGLE_FLOW: 'direct', GOOGLE_CLIENT_ID: 'client.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'server-secret-not-for-browser', TURNSTILE_SECRET_KEY: '' })) vi.stubEnv(key, value);
  fake.auth.signInWithIdToken.mockResolvedValue({ data: { user: { id: 'google-user-id' } }, error: null });
  fake.auth.signOut.mockResolvedValue({ error: null });
  fake.single.mockResolvedValue({ data: { terms_version: '2026-10-26', consented_at: '2026-10-31T00:00:00Z' }, error: null });
  fetchMock.mockResolvedValue(Response.json({ id_token: 'signed-google-token', access_token: 'google-access-token', token_type: 'Bearer' }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function begin(next = '/en/camera') {
  const response = await start(new Request('http://localhost:3000/api/auth/google', {
    method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale: 'en', next }),
  }));
  expect(response.status).toBe(200);
  return new URL((await response.json()).url);
}
const finish = (state: string | null, extra = 'code=google-code') => callback(new Request(`http://localhost:3000/auth/google/callback?state=${state}&${extra}`));

it('builds real Google authorize URL, with state, nonce and PKCE bound to an HttpOnly cookie', async () => {
  const url = await begin('//evil.test');
  expect(url.origin).toBe('https://accounts.google.com');
  expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/google/callback');
  expect(url.searchParams.get('scope')).toBe('openid email profile');
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(url.href).not.toContain('server-secret');
  expect(fake.setCookie.mock.calls[0][2]).toMatchObject({ httpOnly: true, sameSite: 'lax', maxAge: 600 });
  const response = await finish(url.searchParams.get('state'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/en');
  const signin = fake.auth.signInWithIdToken.mock.calls[0][0];
  expect(createHash('sha256').update(signin.nonce).digest('hex')).toBe(url.searchParams.get('nonce'));
  const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
  expect(body.get('client_secret')).toBe('server-secret-not-for-browser');
  expect(createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(url.searchParams.get('code_challenge'));
  expect(signin).toMatchObject({ provider: 'google', token: 'signed-google-token', access_token: 'google-access-token' });
  expect(fake.values.size).toBe(0);
});
it('fails closed for missing credentials and unknown flow', async () => {
  vi.stubEnv('GOOGLE_CLIENT_SECRET', ''); expect(hasGoogleAuth()).toBe(false);
  const response = await start(new Request('http://localhost:3000/api/auth/google', {
    method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: 'vi' }),
  }));
  expect(response.status).toBe(503);
  vi.stubEnv('AUTH_GOOGLE_FLOW', 'typo'); expect(hasGoogleAuth()).toBe(false);
});
it('rejects mismatched, missing, tampered and expired transactions before token exchange', async () => {
  let url = await begin(); await finish('invalid-state');
  url = await begin();
  const cookie = fake.values.get('tv-google-oauth')!;
  fake.values.set('tv-google-oauth', `x${cookie}`); await finish(url.searchParams.get('state'));
  url = await begin();
  const now = Date.now(); const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 601000);
  await finish(url.searchParams.get('state')); clock.mockRestore();
  await finish(url.searchParams.get('state'));
  expect(fetchMock).not.toHaveBeenCalled(); expect(fake.auth.signInWithIdToken).not.toHaveBeenCalled();
});
it('handles cancellation in the saved locale and never reflects provider descriptions', async () => {
  const url = await begin();
  const response = await finish(url.searchParams.get('state'), 'error=access_denied&error_description=private-error');
  const target = new URL(response.headers.get('location')!);
  expect(target.pathname).toBe('/en/auth/login'); expect(target.searchParams.get('error')).toBe('oauthCancelled');
  expect(target.href).not.toContain('private-error'); expect(fetchMock).not.toHaveBeenCalled();
});
it('requires explicit terms for new Google accounts and removes sessions if the profile cannot load', async () => {
  let url = await begin(); fake.single.mockResolvedValueOnce({ data: { terms_version: null, consented_at: null }, error: null });
  expect((await finish(url.searchParams.get('state'))).headers.get('location')).toContain('/en/auth/consent?next=');
  url = await begin(); fake.single.mockResolvedValueOnce({ data: null, error: { message: 'missing migration' } });
  expect((await finish(url.searchParams.get('state'))).headers.get('location')).toContain('error=oauthFailed');
  expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('trusts only Supabase token verification and never establishes a session after rejection', async () => {
  const url = await begin();
  fake.auth.signInWithIdToken.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad nonce or signature' } });
  const response = await finish(url.searchParams.get('state'));
  expect(response.headers.get('location')).toContain('error=oauthFailed'); expect(fake.single).not.toHaveBeenCalled();
});
it('marks transaction cookies secure on production origins', async () => {
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://thamvan.example');
  await startDirectGoogle('vi', '/vi/camera');
  expect(fake.setCookie.mock.calls[0][2].secure).toBe(true);
});
