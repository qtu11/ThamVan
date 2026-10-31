import { NextResponse } from 'next/server';
import { consumeGoogleTransaction, exchangeGoogleCode } from '@/lib/google-oauth';
import { hasGoogleAuth, googleAuthFlow, siteUrl } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { acceptedCurrentTerms, authDestination } from '@/lib/auth-policy';

export const runtime = 'nodejs';
export const maxDuration = 30;
export async function GET(request: Request) {
  const url = new URL(request.url);
  const transaction = await consumeGoogleTransaction(url.searchParams.get('state'));
  const locale = transaction?.locale || 'vi';
  const next = authDestination(transaction?.next, locale);
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, siteUrl()));
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  };
  const failure = (error: string) => redirect(`/${locale}/auth/login?${new URLSearchParams({ error, next })}`);
  if (!transaction || !hasGoogleAuth() || googleAuthFlow() !== 'direct') return failure('authInvalid');
  if (url.searchParams.has('error')) return failure(url.searchParams.get('error') === 'access_denied' ? 'oauthCancelled' : 'oauthFailed');
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096) return failure('authInvalid');
  const db = await supabase();
  try {
    const tokens = await exchangeGoogleCode(code, transaction.verifier);
    // Auth verifies signed issuer/audience/expiry/nonce. No user is trusted from locally decoded JWTs.
    const { data, error } = await db.auth.signInWithIdToken({ provider: 'google', token: tokens.id_token,
      access_token: tokens.access_token, nonce: transaction.nonce });
    if (error || !data.user) return failure('oauthFailed');
    const profile = await db.from('profiles').select('terms_version,consented_at').eq('id', data.user.id).single();
    if (!profile.error && profile.data) {
      return redirect(acceptedCurrentTerms(profile.data) ? next : `/${locale}/auth/consent?next=${encodeURIComponent(next)}`);
    }
    await db.auth.signOut({ scope: 'local' });
  } catch {
    // No tokens, coordinates, email or provider payloads in logs or redirects.
    await db.auth.signOut({ scope: 'local' }).catch(() => {});
  }
  return failure('oauthFailed');
}
