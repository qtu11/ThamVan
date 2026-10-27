import { z } from 'zod';
import { route, readJson, requireViewer, fail, ok } from '@/lib/api';
import { supabase } from '@/lib/supabase/server';
import { TERMS_VERSION, authDestination } from '@/lib/auth-policy';
import { locales } from '@/lib/types';
export const POST = route(async (request) => {
  await requireViewer(false, true);
  const body = await readJson(
    request,
    z.object({
      display_name: z.string().trim().min(2).max(80),
      locale: z.enum(locales),
      consent: z.literal(true),
      terms_version: z.literal(TERMS_VERSION),
      next: z.string().max(1000).optional(),
    }),
  );
  const db = await supabase();
  const { error } = await db.rpc('accept_current_terms', {
    p_version: body.terms_version,
    p_display_name: body.display_name,
    p_locale: body.locale,
  });
  if (error) fail('error', 500);
  return ok({ redirect: authDestination(body.next, body.locale) });
});
