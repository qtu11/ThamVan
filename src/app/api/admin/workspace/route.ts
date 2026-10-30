import { z } from 'zod';
import { route, readJson, requireViewer, fail, ok } from '@/lib/api';
import { sendUserPush, pushReady } from '@/lib/push';
import { supabase } from '@/lib/supabase/server';
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
  z.object({
    action: z.literal('fee'),
    order: z.uuid(),
    amount: z.number().int().min(0).max(1000000),
  }),
]);
export const POST = route(async (request) => {
  await requireViewer(true);
  const body = await readJson(request, schema);
  const db = await supabase();
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
    if (item.data?.user_id)
      await sendUserPush(
        item.data.user_id,
        body.approve ? 'Địa điểm đã được duyệt' : 'Đề xuất cần điều chỉnh',
        body.note,
        '/vi/dashboard?tab=contributions',
      ).catch(() => {});
  }
  return ok({ success: true });
});
