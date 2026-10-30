import { z } from 'zod';
import { route, readJson, requireViewer, fail, ok } from '@/lib/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { pushReady, allowedPushEndpoint, sendUserPush } from '@/lib/push';
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('subscribe'),
    endpoint: z.url().max(2048),
    keys: z.object({ p256dh: z.string().min(50).max(200), auth: z.string().min(10).max(100) }),
  }),
  z.object({ action: z.literal('unsubscribe'), endpoint: z.string().max(2048) }),
  z.object({ action: z.literal('test') }),
]);
export const POST = route(async (request) => {
  const viewer = await requireViewer();
  const body = await readJson(request, schema);
  if (!pushReady()) fail('pushUnavailable', 503);
  const db = supabaseAdmin();
  if (body.action === 'subscribe') {
    if (!allowedPushEndpoint(body.endpoint)) fail('invalidInput', 422);
    const existing = await db
      .from('push_subscriptions')
      .select('user_id')
      .eq('endpoint', body.endpoint)
      .maybeSingle();
    if (existing.error) fail('error', 503);
    if (existing.data && existing.data.user_id !== viewer.id) fail('forbidden', 403);
    const own = await db
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', viewer.id);
    if ((own.count ?? 0) >= 5 && !existing.data) fail('deviceLimit', 409);
    const result = await db
      .from('push_subscriptions')
      .upsert(
        { user_id: viewer.id, endpoint: body.endpoint, keys: body.keys },
        { onConflict: 'endpoint' },
      );
    if (result.error) fail('error', 503);
    return ok();
  }
  if (body.action === 'unsubscribe') {
    const result = await db
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', body.endpoint)
      .eq('user_id', viewer.id);
    if (result.error) fail('error', 503);
    return ok();
  }
  const quota = await db.rpc('consume_workspace_quota', {
    p_user: viewer.id,
    p_bucket: 'push-test',
    p_limit: 3,
    p_seconds: 60,
  });
  if (quota.error || !quota.data) fail('rateLimit', 429);
  // An actual provider acceptance, not a fabricated local Notification success.
  const result = await sendUserPush(
    viewer.id,
    'THÁM VĂN',
    'Thông báo thử từ THÁM VĂN.',
    '/vi/dashboard?tab=notifications',
  );
  return ok(result);
});
