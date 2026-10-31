import { z } from 'zod';
import { route, readJson, fail, ok, verifyCaptcha } from '@/lib/api';
import { hasGoogleAuth, siteUrl, googleAuthFlow } from '@/lib/env';
import { startDirectGoogle } from '@/lib/google-oauth';
import { supabase } from '@/lib/supabase/server';
import { authDestination, checkedGoogleAuthorizeUrl } from '@/lib/auth-policy';
import { locales } from '@/lib/types';
export const POST = route(async (request) => {
  const body = await readJson(
    request,
    z.object({
      locale: z.enum(locales),
      next: z.string().max(1000).optional(),
      captcha: z.string().max(2048).optional(),
    }),
  );
  if (!hasGoogleAuth()) fail('googleUnavailable', 503);
  await verifyCaptcha(body.captcha);
  const next = authDestination(body.next, body.locale);
  if (googleAuthFlow() === 'direct') {
    return ok({ url: await startDirectGoogle(body.locale, next) });
  }
  const callback = new URL('/auth/callback', siteUrl());
  callback.searchParams.set('next', next);
  callback.searchParams.set('locale', body.locale);
  const db = await supabase();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback.href,
      skipBrowserRedirect: true,
      scopes: 'email profile',
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data.url) fail('oauthFailed', 502);
  return ok({ url: checkedGoogleAuthorizeUrl(data.url, process.env.NEXT_PUBLIC_SUPABASE_URL!) });
});
