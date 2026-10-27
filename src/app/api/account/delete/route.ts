import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireViewer, route, readJson, ok, fail, verifyCaptcha } from '@/lib/api';
import { supabase, supabaseAdmin } from '@/lib/supabase/server';
import { recentGoogleAuthentication } from '@/lib/auth-policy';
export const POST = route(async (request) => {
  const viewer = await requireViewer();
  const body = await readJson(
    request,
    z.object({
      email: z.email(),
      password: z.string().min(1).max(128).optional(),
      method: z.enum(['password', 'google']).default('password'),
      confirmation: z.string().max(20).optional(),
      captcha: z.string().optional(),
    }),
  );
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) fail('notConfigured', 503);
  if (body.email.toLowerCase() !== viewer.email.toLowerCase()) fail('authInvalid', 401);
  await verifyCaptcha(body.captcha);
  const db = await supabase();
  if (body.method === 'google') {
    if (body.confirmation !== 'DELETE') fail('invalidInput', 422);
    const { data, error } = await db.auth.getClaims();
    if (
      !viewer.providers.includes('google') ||
      error ||
      !data ||
      !recentGoogleAuthentication(data.claims, viewer.id)
    )
      fail('reauthRequired', 403);
  } else {
    if (!body.password) fail('invalidInput', 422);
    const isolated = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await isolated.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error || data.user?.id !== viewer.id) fail('authInvalid', 401);
    await isolated.auth.signOut({ scope: 'local' });
  }
  const admin = supabaseAdmin();
  const result = await admin.auth.admin.deleteUser(viewer.id);
  if (result.error) fail('error', 500);
  await db.auth.signOut({ scope: 'local' });
  return ok();
});
