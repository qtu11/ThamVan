import { NextResponse } from 'next/server';
import {
  consumeGoogleTransaction,
  exchangeGoogleCode,
  verifyGoogleIdTokenClaims,
} from '@/lib/google-oauth';
import { hasGoogleAuth, googleAuthFlow, siteUrl } from '@/lib/env';
import { supabase, supabaseAdmin } from '@/lib/supabase/server';
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
  const failure = (error: string) =>
    redirect(`/${locale}/auth/login?${new URLSearchParams({ error, next })}`);
  if (!transaction || !hasGoogleAuth() || googleAuthFlow() !== 'direct')
    return failure('authInvalid');
  if (url.searchParams.has('error'))
    return failure(
      url.searchParams.get('error') === 'access_denied' ? 'oauthCancelled' : 'oauthFailed',
    );
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096) return failure('authInvalid');
  const db = await supabase();
  try {
    const tokens = await exchangeGoogleCode(code, transaction.verifier);
    // Auth verifies signed issuer/audience/expiry/nonce. No user is trusted from locally decoded JWTs.
    const { data, error } = await db.auth.signInWithIdToken({
      provider: 'google',
      token: tokens.id_token,
      access_token: tokens.access_token,
      nonce: transaction.nonce,
    });
    let signedInUser = !error ? data.user : null;
    if (
      !signedInUser &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (error?.code === 'provider_disabled' ||
        error?.message?.toLowerCase().includes('not enabled'))
    ) {
      const claims = verifyGoogleIdTokenClaims(tokens.id_token, transaction.nonce);
      const admin = supabaseAdmin();
      const displayName = (claims.name || claims.email.split('@')[0] || 'Thành viên').slice(0, 80);
      const created = await admin.auth.admin
        .createUser({
          email: claims.email,
          email_confirm: true,
          user_metadata: {
            display_name: displayName,
            full_name: displayName,
            avatar_url: claims.picture,
            locale,
            google_sub: claims.sub,
            terms_version: '2026-10-26',
          },
          app_metadata: {
            provider: 'google',
            providers: ['google'],
            oauth_provider: 'google',
          },
        })
        .catch(() => null);
      if (created && !created.error && created.data?.user?.id) {
        await admin
          .from('profiles')
          .upsert(
            {
              id: created.data.user.id,
              display_name: displayName,
              locale,
              terms_version: null,
              consented_at: null,
            },
            { onConflict: 'id' },
          );
      }
      const link = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: claims.email,
      });
      const tokenHash = link.data?.properties?.hashed_token;
      if (!link.error && tokenHash) {
        if (link.data.user?.id) {
          await admin.auth.admin
            .updateUserById(link.data.user.id, {
              app_metadata: {
                ...(link.data.user.app_metadata || {}),
                oauth_provider: 'google',
              },
            })
            .catch(() => {});
          await admin
            .from('profiles')
            .upsert(
              { id: link.data.user.id, display_name: displayName, locale },
              { onConflict: 'id', ignoreDuplicates: true },
            );
        }
        const verified = await db.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });
        if (!verified.error && verified.data.user) {
          signedInUser = verified.data.user;
        }
      }
    }
    if (!signedInUser) return failure('oauthFailed');
    const profile = await db
      .from('profiles')
      .select('terms_version,consented_at')
      .eq('id', signedInUser.id)
      .single();
    if (!profile.error && profile.data) {
      return redirect(
        acceptedCurrentTerms(profile.data)
          ? next
          : `/${locale}/auth/consent?next=${encodeURIComponent(next)}`,
      );
    }
    await db.auth.signOut({ scope: 'local' });
  } catch {
    // No tokens, coordinates, email or provider payloads in logs or redirects.
    await db.auth.signOut({ scope: 'local' }).catch(() => {});
  }
  return failure('oauthFailed');
}
