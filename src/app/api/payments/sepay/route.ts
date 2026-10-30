import { z } from 'zod';
import { readJson, ApiError } from '@/lib/api';
import { secretMatches, exactVnd } from '@/lib/sepay';
import { supabaseAdmin } from '@/lib/supabase/server';
import { commerceStorageReady } from '@/lib/commerce';
export async function POST(request: Request) {
  if (!commerceStorageReady() || !process.env.SEPAY_IPN_SECRET)
    return Response.json({ error: 'notConfigured' }, { status: 503 });
  if (!secretMatches(request.headers.get('X-Secret-Key'), process.env.SEPAY_IPN_SECRET))
    return Response.json({ error: 'forbidden' }, { status: 401 });
  try {
    const body = await readJson(
      request,
      z.object({
        timestamp: z.number().int(),
        notification_type: z.string(),
        order: z.object({
          order_invoice_number: z.uuid(),
          order_status: z.string(),
          order_currency: z.string(),
          order_amount: z.string(),
        }),
        transaction: z.object({
          transaction_id: z.string().min(1).max(150),
          transaction_status: z.string(),
          transaction_type: z.string(),
          transaction_currency: z.string(),
          transaction_amount: z.string(),
        }),
      }),
    );
    if (body.notification_type !== 'ORDER_PAID') return Response.json({ ignored: true });
    const amount = exactVnd(body.order.order_amount);
    const transactionAmount = exactVnd(body.transaction.transaction_amount);
    if (
      body.order.order_status !== 'CAPTURED' ||
      body.transaction.transaction_status !== 'APPROVED' ||
      body.transaction.transaction_type !== 'PAYMENT' ||
      body.order.order_currency !== 'VND' ||
      body.transaction.transaction_currency !== 'VND' ||
      amount === null ||
      amount !== transactionAmount
    )
      return Response.json({ error: 'paymentMismatch' }, { status: 409 });
    const { data, error } = await supabaseAdmin().rpc('activate_plan_order', {
      p_order: body.order.order_invoice_number,
      p_amount: amount,
      p_currency: 'VND',
      p_provider: 'sepay',
      p_reference: `sepay:${body.transaction.transaction_id}`,
    });
    if (error || !data) return Response.json({ error: 'paymentMismatch' }, { status: 409 });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: 'invalidWebhook' },
      { status: error instanceof ApiError ? error.status : 500 },
    );
  }
}
