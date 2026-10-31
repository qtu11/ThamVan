import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { siteUrl } from './env';
import { limitedBody } from './vision';
import { locales, type Locale } from './types';
import { authDestination } from './auth-policy';

const COOKIE = 'tv-google-oauth';
const MAX_AGE = 600;
const transactionSchema = z.object({
  state: z.string().length(43), nonce: z.string().length(43), verifier: z.string().length(43),
  locale: z.enum(locales), next: z.string().max(1000), issuedAt: z.number(),
});
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, path: '/', maxAge: MAX_AGE });
const callbackUrl = () => new URL('/auth/google/callback', siteUrl()).href;
const signature = (payload: string) => createHmac('sha256', process.env.GOOGLE_CLIENT_SECRET!).update(payload).digest();
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function startDirectGoogle(locale: Locale, next: string) {
  const transaction = { state: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'), verifier: randomBytes(32).toString('base64url'),
    locale, next: authDestination(next, locale), issuedAt: Date.now() };
  const payload = Buffer.from(JSON.stringify(transaction)).toString('base64url');
  (await cookies()).set(COOKIE, `${payload}.${signature(payload).toString('base64url')}`, cookieOptions());
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: callbackUrl(),
    response_type: 'code', scope: 'openid email profile', prompt: 'select_account',
    state: transaction.state,
    // Supabase hashes the raw nonce during ID-token validation.
    nonce: createHash('sha256').update(transaction.nonce).digest('hex'),
    code_challenge: createHash('sha256').update(transaction.verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  return url.href;
}

export async function consumeGoogleTransaction(state: string | null) {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  store.set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  if (!value || !state || value.length > 5000) return null;
  try {
    const [payload, mac, extra] = value.split('.');
    if (!payload || !mac || extra) return null;
    const actual = Buffer.from(mac, 'base64url'), expected = signature(payload);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const transaction = transactionSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
    if (!equal(transaction.state, state) || Date.now() - transaction.issuedAt > MAX_AGE * 1000 ||
      transaction.issuedAt > Date.now() + 30000) return null;
    return transaction;
  } catch { return null; }
}

export async function exchangeGoogleCode(code: string, verifier: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: callbackUrl(),
      grant_type: 'authorization_code', code_verifier: verifier }),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('GOOGLE_EXCHANGE_FAILED'); }
  return z.object({ id_token: z.string().min(1).max(16384), access_token: z.string().min(1).max(16384),
    token_type: z.string().refine((type) => type.toLowerCase() === 'bearer') })
    .parse(JSON.parse((await limitedBody(response, 65536)).toString('utf8')));
}
