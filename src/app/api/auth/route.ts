import { z } from 'zod';
import { route, readJson, ok, fail, verifyCaptcha, requireViewer } from '@/lib/api';
import { authSchema, passwordSchema } from '@/lib/validation';
import { hasSupabase, siteUrl } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { safeNext } from '@/lib/geo';
import { TERMS_VERSION } from '@/lib/auth-policy';
export const POST = route(async (request) => {
  const body = await readJson(
    request,
    authSchema.extend({ action: z.enum(['login', 'register', 'forgot', 'reset', 'logout']) }),
  );
  if (!hasSupabase()) fail('notConfigured', 503);
  const db = await supabase();
  const next = safeNext(body.next, `/${body.locale}`);
  if (body.action === 'logout') {
    const { error } = await db.auth.signOut();
    if (error) fail('error', 500);
    return ok({ redirect: `/${body.locale}` });
  }
  if (body.action === 'reset') {
    await requireViewer();
    if (!passwordSchema.safeParse(body.password).success) fail('invalidInput', 422);
    const { error } = await db.auth.updateUser({ password: body.password! });
    if (error) fail('invalidInput', 422);
    await db.auth.signOut({ scope: 'global' });
    return ok({ redirect: `/${body.locale}/auth/login` });
  }
  await verifyCaptcha(body.captcha);
  if (body.action === 'forgot') {
    await db.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/${body.locale}/auth/reset`,
    });
    return ok({ message: 'authSent' });
  }
  if (body.action === 'register') {
    if (!body.consent || !body.display_name || !passwordSchema.safeParse(body.password).success)
      fail('invalidInput', 422);
    const { data, error } = await db.auth.signUp({
      email: body.email,
      password: body.password!,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?next=/${body.locale}`,
        data: { display_name: body.display_name, terms_version: TERMS_VERSION },
      },
    });
    if (error && error.status === 429) fail('rateLimit', 429);
    if (error) fail('authInvalid', 400);
    return data.session ? ok({ redirect: next }) : ok({ message: 'authSent' });
  }
  if (!body.password) fail('invalidInput', 422);
  const { error } = await db.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (error)
    fail(error.status === 429 ? 'rateLimit' : 'authInvalid', error.status === 429 ? 429 : 401);
  return ok({ redirect: next });
});
