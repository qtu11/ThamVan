import { z } from 'zod';
import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { checkoutReady } from '@/lib/commerce';
import { products, findExperience } from '@/data/experiences';
import { supabaseAdmin } from '@/lib/supabase/server';
import { paymentSignature, isPaymentUrl } from '@/lib/payment-signature';
import { siteUrl } from '@/lib/env';

export const POST = route(async (request) => {
  const body = await readJson(
    request,
    z.object({
      product: z.enum(['walk', 'collection']),
      experience: z.string().max(80).optional(),
      locale: z.enum(['vi', 'en', 'zh']),
      consent: z.literal(true),
    }),
  );
  if (!checkoutReady()) fail('checkoutUnavailable', 503);
  const viewer = await requireViewer();
  if (body.product === 'walk' && !findExperience(body.experience || '')) fail('invalidInput', 422);
  const db = supabaseAdmin();
  const { data: order, error } = await db.rpc('reserve_commerce_order', {
    p_user: viewer.id,
    p_product: body.product,
    p_experience: body.product === 'walk' ? body.experience : null,
  });
  if (error || !order)
    fail(
      error?.message.includes('RATE_LIMIT')
        ? 'rateLimit'
        : error?.message.includes('ALREADY_OWNED')
          ? 'alreadyOwned'
          : 'checkoutUnavailable',
      409,
    );
  if (order.checkout_url && isPaymentUrl(order.checkout_url))
    return ok({ url: order.checkout_url });
  const product = products[body.product];
  const payload = {
    orderCode: Number(order.order_code),
    amount: product.amount,
    description: `THAMVAN ${order.order_code}`,
    cancelUrl: `${siteUrl()}/${body.locale}/orders/${order.id}?cancel=1`,
    returnUrl: `${siteUrl()}/${body.locale}/orders/${order.id}`,
  };
  let response: Response;
  try {
    response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.PAYOS_CLIENT_ID!,
        'x-api-key': process.env.PAYOS_API_KEY!,
      },
      body: JSON.stringify({
        ...payload,
        items: [{ name: product.title, quantity: 1, price: product.amount }],
        expiredAt: Math.floor(Date.now() / 1000) + 900,
        signature: paymentSignature(payload, process.env.PAYOS_CHECKSUM_KEY!),
      }),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
  } catch {
    fail('checkoutUnavailable', 502);
  }
  const result = await response.json();
  const payment = result.data;
  if (
    !response.ok ||
    result.code !== '00' ||
    !payment ||
    !isPaymentUrl(payment.checkoutUrl) ||
    Number(payment.amount) !== product.amount ||
    Number(payment.orderCode) !== Number(order.order_code) ||
    typeof payment.paymentLinkId !== 'string'
  )
    fail('checkoutUnavailable', 502);
  const saved = await db
    .from('commerce_orders')
    .update({ payment_link_id: payment.paymentLinkId, checkout_url: payment.checkoutUrl })
    .eq('id', order.id)
    .eq('status', 'pending');
  if (saved.error) fail('checkoutUnavailable', 503);
  return ok({ url: payment.checkoutUrl });
});
