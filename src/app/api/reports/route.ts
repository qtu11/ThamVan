import { z } from 'zod';
import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { getCatalog } from '@/lib/data';
import { supabase, supabaseAdmin } from '@/lib/supabase/server';

const uuidSchema = z.uuid();
const schema = z.object({
  entry_id: z.union([uuidSchema, z.string().trim().regex(/^HCM-[A-Z0-9-]{1,80}$/)]),
  reason: z.string().trim().min(10).max(2000),
});

export const POST = route(async (request) => {
  const viewer = await requireViewer();
  const body = await readJson(request, schema);

  if (uuidSchema.safeParse(body.entry_id).success) {
    const db = await supabase();
    const { error } = await db.rpc('submit_report', {
      p_entry_id: body.entry_id,
      p_reason: body.reason,
    });
    if (error) {
      if (error.message.includes('RATE_LIMIT')) fail('rateLimit', 429);
      if (error.message.includes('NOT_FOUND')) fail('notFound', 404);
      fail('error', 400);
    }
    return ok();
  }

  const catalog = await getCatalog();
  const place = catalog.find((item) => item.id === body.entry_id);
  if (!place) fail('notFound', 404);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) fail('error', 503);

  const admin = supabaseAdmin();
  const quota = await admin.rpc('consume_workspace_quota', {
    p_user: viewer.id,
    p_bucket: 'report',
    p_limit: 5,
    p_seconds: 3600,
  });
  if (quota.error) fail('error', 503);
  if (!quota.data) fail('rateLimit', 429);

  const reason = `[${place.id} · ${place.slug}] ${body.reason}`.slice(0, 2000);
  const inserted = await admin.from('content_reports').insert({
    user_id: viewer.id,
    entry_id: null,
    reason,
  });
  if (inserted.error) fail('error', 500);
  return ok();
});
