import { z } from 'zod';
import { route, readJson, requireViewer, fail, ok } from '@/lib/api';
import { copy } from '@/lib/locale-copy';
import { isLocale } from '@/lib/types';
import { sendUserPush, pushReady } from '@/lib/push';
import { supabase, supabaseAdmin } from '@/lib/supabase/server';
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('review'),
    id: z.uuid(),
    approve: z.boolean(),
    note: z.string().trim().min(5).max(1000),
  }),
  z.object({
    action: z.literal('expense'),
    amount: z.number().int().positive().max(1000000000),
    category: z.enum(['hosting', 'content', 'marketing', 'tax', 'other']),
    description: z.string().trim().min(3).max(500),
    date: z.iso.date(),
  }),
  z.object({ action: z.literal('payments'), live: z.boolean() }),
  z.object({
    action: z.literal('fee'),
    order: z.uuid(),
    amount: z.number().int().min(0).max(1000000),
  }),
]);
export const POST = route(async (request) => {
  const viewer = await requireViewer(true);
  const body = await readJson(request, schema);
  const db = await supabase();
  if (body.action === 'payments') {
    // Written with the admin's own session so the RLS policy re-checks the role in the database.
    const saved = await db
      .from('app_settings')
      .upsert({
        key: 'payments_live',
        value: body.live,
        updated_at: new Date().toISOString(),
        updated_by: viewer.id,
      })
      .select('value')
      .single();
    if (saved.error || saved.data?.value !== body.live) fail('error', 400);
    return ok({ live: body.live });
  }
  const result =
    body.action === 'review'
      ? await db.rpc('review_place', { p_id: body.id, p_approve: body.approve, p_note: body.note })
      : body.action === 'expense'
        ? await db.rpc('admin_expense', {
            p_amount: body.amount,
            p_category: body.category,
            p_description: body.description,
            p_date: body.date,
          })
        : await db.rpc('admin_record_fee', { p_order: body.order, p_fee: body.amount });
  if (result.error) fail('error', 400);
  if (body.action === 'review' && pushReady()) {
    const item = await db
      .from('place_submissions')
      .select('user_id')
      .eq('id', body.id)
      .maybeSingle();
    if (item.data?.user_id) {
      let targetLocale: 'vi' | 'en' | 'zh' = 'vi';
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const profile = await supabaseAdmin()
          .from('profiles')
          .select('locale')
          .eq('id', item.data.user_id)
          .maybeSingle();
        if (profile.data?.locale && isLocale(profile.data.locale)) {
          targetLocale = profile.data.locale;
        }
      }
      const title = body.approve
        ? copy(targetLocale, 'Địa điểm đã được duyệt', 'Submission approved', '地点已通过审核')
        : copy(targetLocale, 'Đề xuất cần điều chỉnh', 'Submission needs updates', '建议修改提交内容');
      await sendUserPush(
        item.data.user_id,
        title,
        body.note,
        `/${targetLocale}/dashboard?tab=contributions`,
      ).catch(() => {});
    }
  }
  return ok({ success: true });
});
