import { beforeEach, afterEach, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const fake = vi.hoisted(() => ({
  viewer: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
  auth: {
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    signOut: vi.fn(),
    getClaims: vi.fn(),
  },
  deleteUser: vi.fn(),
}));
vi.mock('@/lib/data', () => ({ getViewer: fake.viewer }));
vi.mock('@/lib/supabase/server', () => ({
  supabase: async () => ({
    auth: fake.auth,
    rpc: fake.rpc,
    from: () => ({ select: () => ({ eq: () => ({ single: fake.single }) }) }),
  }),
  supabaseAdmin: () => ({ auth: { admin: { deleteUser: fake.deleteUser } } }),
}));
import { POST as startGoogle } from '@/app/api/auth/google/route';
import { POST as acceptConsent } from '@/app/api/auth/consent/route';
import { GET as callback } from '@/app/auth/callback/route';
import { POST as deleteAccount } from '@/app/api/account/delete/route';
const userId = '40000000-0000-4000-8000-000000000001';
const request = (path: string, body: unknown, origin = 'http://localhost:3000') =>
  new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key');
  vi.stubEnv('AUTH_GOOGLE_ENABLED', 'true');
  vi.stubEnv('AUTH_GOOGLE_FLOW', 'supabase');
  vi.stubEnv('TURNSTILE_SECRET_KEY', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-only-key');
  fake.auth.signInWithOAuth.mockResolvedValue({
    data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
    error: null,
  });
  fake.auth.exchangeCodeForSession.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  fake.auth.signOut.mockResolvedValue({ error: null });
  fake.single.mockResolvedValue({
    data: { terms_version: '2026-10-26', consented_at: '2026-10-27T00:00:00Z' },
    error: null,
  });
  fake.rpc.mockResolvedValue({ error: null });
  fake.deleteUser.mockResolvedValue({ error: null });
  fake.viewer.mockResolvedValue({
    id: userId,
    email: 'explorer@example.test',
    acceptedTerms: true,
    providers: ['google'],
    profile: {},
  });
});
afterEach(() => vi.unstubAllEnvs());
it('starts Google without requesting an email or password and uses canonical callback', async () => {
  const response = await startGoogle(
    request('/api/auth/google', { locale: 'en', next: '/en/journey' }),
  );
  expect(response.status).toBe(200);
  const options = fake.auth.signInWithOAuth.mock.calls[0][0];
  expect(options.provider).toBe('google');
  expect(options.options.skipBrowserRedirect).toBe(true);
  const redirect = new URL(options.options.redirectTo);
  expect(redirect.origin).toBe('http://localhost:3000');
  expect(redirect.searchParams.get('next')).toBe('/en/journey');
  expect(redirect.searchParams.get('locale')).toBe('en');
});
it('blocks cross-site OAuth starts, unavailable provider and invalid payloads', async () => {
  expect(
    (await startGoogle(request('/api/auth/google', { locale: 'vi' }, 'https://evil.test'))).status,
  ).toBe(403);
  expect((await startGoogle(request('/api/auth/google', { locale: 'evil' }))).status).toBe(422);
  vi.stubEnv('AUTH_GOOGLE_ENABLED', 'false');
  const r = await startGoogle(request('/api/auth/google', { locale: 'vi' }));
  expect(r.status).toBe(503);
  expect(await r.json()).toEqual({ error: 'googleUnavailable' });
  expect(fake.auth.signInWithOAuth).not.toHaveBeenCalled();
});
it('returns a safe code when the provider cannot start', async () => {
  fake.auth.signInWithOAuth.mockResolvedValue({
    data: { url: null },
    error: { message: 'private provider error' },
  });
  const r = await startGoogle(request('/api/auth/google', { locale: 'vi' }));
  expect(await r.json()).toEqual({ error: 'oauthFailed' });
});
it('routes Google cancellation to the selected language without reflecting provider details', async () => {
  const r = await callback(
    new Request(
      'http://localhost:3000/auth/callback?locale=zh&next=/zh/journey&error=access_denied&error_description=secret',
    ),
  );
  const target = new URL(r.headers.get('location')!);
  expect(target.pathname).toBe('/zh/auth/login');
  expect(target.searchParams.get('error')).toBe('oauthCancelled');
  expect(target.searchParams.get('next')).toBe('/zh/journey');
  expect(target.href).not.toContain('secret');
  expect(fake.auth.exchangeCodeForSession).not.toHaveBeenCalled();
});
it('sends a new Google account to explicit consent and an existing account to its original route', async () => {
  fake.single.mockResolvedValueOnce({
    data: { terms_version: null, consented_at: null },
    error: null,
  });
  const pending = await callback(
    new Request('http://localhost:3000/auth/callback?code=valid&locale=en&next=/en/journey'),
  );
  expect(new URL(pending.headers.get('location')!).pathname).toBe('/en/auth/consent');
  const accepted = await callback(
    new Request('http://localhost:3000/auth/callback?code=valid&locale=en&next=/en/journey'),
  );
  expect(accepted.headers.get('location')).toBe('http://localhost:3000/en/journey');
});
it('handles stale codes, unsafe return URLs and missing profile migrations', async () => {
  fake.auth.exchangeCodeForSession.mockResolvedValueOnce({
    data: { user: null },
    error: { message: 'expired' },
  });
  const failed = await callback(
    new Request(
      'http://localhost:3000/auth/callback?code=expired&locale=en&next=https://evil.test',
    ),
  );
  expect(failed.headers.get('location')).toBe(
    'http://localhost:3000/en/auth/login?error=authInvalid',
  );
  fake.single.mockResolvedValueOnce({ data: null, error: { message: 'missing migration' } });
  await callback(new Request('http://localhost:3000/auth/callback?code=valid'));
  expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('allows pending users to explicitly accept only the current terms version', async () => {
  fake.viewer.mockResolvedValue({ id: userId, acceptedTerms: false });
  const r = await acceptConsent(
    request('/api/auth/consent', {
      display_name: 'Explorer',
      locale: 'en',
      consent: true,
      terms_version: '2026-10-26',
      next: '/en/journey',
    }),
  );
  expect(r.status).toBe(200);
  expect(fake.rpc).toHaveBeenCalledWith('accept_current_terms', {
    p_version: '2026-10-26',
    p_display_name: 'Explorer',
    p_locale: 'en',
  });
  const invalid = await acceptConsent(
    request('/api/auth/consent', {
      display_name: 'Explorer',
      locale: 'en',
      consent: false,
      terms_version: 'old',
    }),
  );
  expect(invalid.status).toBe(422);
});
it('never deletes a Google account from an old or password-only session', async () => {
  fake.auth.getClaims.mockResolvedValue({
    data: { claims: { sub: userId, amr: [{ method: 'oauth', timestamp: 1 }] } },
    error: null,
  });
  const r = await deleteAccount(
    request('/api/account/delete', {
      email: 'explorer@example.test',
      method: 'google',
      confirmation: 'DELETE',
    }),
  );
  expect(r.status).toBe(403);
  expect(await r.json()).toEqual({ error: 'reauthRequired' });
  expect(fake.deleteUser).not.toHaveBeenCalled();
});
it('deletes only the authenticated account after fresh verified OAuth and explicit confirmation', async () => {
  fake.auth.getClaims.mockResolvedValue({
    data: { claims: { sub: userId, amr: [{ method: 'oauth', timestamp: Date.now() / 1000 }] } },
    error: null,
  });
  const r = await deleteAccount(
    request('/api/account/delete', {
      email: 'explorer@example.test',
      method: 'google',
      confirmation: 'DELETE',
    }),
  );
  expect(r.status).toBe(200);
  expect(fake.deleteUser).toHaveBeenCalledExactlyOnceWith(userId);
});
