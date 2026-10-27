import { z } from 'zod';
import { route, readJson, verifyCaptcha, fail, ok } from '@/lib/api';
import { commerceStorageReady } from '@/lib/commerce';
import { supabaseAdmin } from '@/lib/supabase/server';

export const POST = route(async (request) => {
  const body = await readJson(
    request,
    z.object({
      name: z.string().trim().min(2).max(100),
      email: z.email().max(254),
      organization: z.string().trim().min(2).max(160),
      segment: z.enum(['school', 'hotel', 'team']),
      message: z.string().trim().min(15).max(2000),
      locale: z.enum(['vi', 'en', 'zh']),
      consent: z.literal(true),
      website: z.string().max(200).optional(),
      captcha: z.string().max(2048).optional(),
    }),
  );
  if (body.website) fail('invalidInput', 422);
  if (!commerceStorageReady()) fail('leadsUnavailable', 503);
  await verifyCaptcha(body.captcha);
  const { data, error } = await supabaseAdmin().rpc('submit_business_lead', {
    p_name: body.name,
    p_email: body.email,
    p_organization: body.organization,
    p_segment: body.segment,
    p_message: body.message,
    p_locale: body.locale,
  });
  if (error || !data)
    fail(error?.message.includes('RATE_LIMIT') ? 'rateLimit' : 'leadsUnavailable', 503);
  return ok({ reference: data });
});
