import { z } from 'zod';
import { route, readJson, requireViewer, fail, ok } from '@/lib/api';
import { plans } from '@/lib/plans';
import { payosReady, sepayReady } from '@/lib/membership-checkout';
import { supabaseAdmin } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/env';
import { signSepay, sepayFields } from '@/lib/sepay';
import { paymentSignature } from '@/lib/payment-signature';
import { isPaymentUrl } from '@/lib/checkout-url';
export const POST = route(async (request) => {
  const body = await readJson(
    request,
    z.object({
      plan: z.enum(['premium', 'family']),
      method: z.enum(['bank', 'card']),
      locale: z.enum(['vi', 'en', 'zh']),
      consent: z.literal(true),
    }),
  );
  if (body.method === 'bank' ? !payosReady() : !sepayReady()) fail('checkoutUnavailable', 503);
  const viewer = await requireViewer();
  const provider = body.method === 'card' ? 'sepay' : 'payos';
  const db = supabaseAdmin();
  const { data: order, error } = await db.rpc('reserve_plan_order', {
    p_user: viewer.id,
    p_plan: body.plan,
    p_provider: provider,
    p_method: body.method,
  });
  if (error || !order)
    fail(
      error?.message.includes('FAMILY_ACTIVE')
        ? 'FAMILY_ACTIVE'
        : error?.message.includes('RATE_LIMIT')
          ? 'rateLimit'
          : 'checkoutUnavailable',
      409,
    );
  const amount = plans[body.plan].amount;
  const returnUrl = `${siteUrl()}/${body.locale}/billing/${order.id}`;
  if (provider === 'sepay') {
    const fields: Record<string, string> = {
      order_amount: String(amount),
      merchant: process.env.SEPAY_MERCHANT_ID!,
      currency: 'VND',
      operation: 'PURCHASE',
      order_description: `THAM VAN ${plans[body.plan].name} monthly`,
      order_invoice_number: order.id,
      customer_id: viewer.id,
      payment_method: 'CARD',
      success_url: returnUrl,
      error_url: `${returnUrl}?result=error`,
      cancel_url: `${returnUrl}?result=cancelled`,
    };
    fields.signature = signSepay(fields, process.env.SEPAY_SECRET_KEY!);
    return ok({
      provider,
      action: 'https://pay.sepay.vn/v1/checkout/init',
      fields: sepayFields
        .map((name) => [name, fields[name]])
        .filter(([, value]) => value !== undefined)
        .concat([['signature', fields.signature]]),
    });
  }
  if (order.checkout_url && isPaymentUrl(order.checkout_url))
    return ok({ provider, url: order.checkout_url });
  const payload = {
    orderCode: Number(order.order_code),
    amount,
    description: `TV ${order.order_code}`,
    cancelUrl: `${returnUrl}?result=cancelled`,
    returnUrl,
  };
  const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.PAYOS_CLIENT_ID!,
      'x-api-key': process.env.PAYOS_API_KEY!,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      ...payload,
      expiredAt: Math.floor(Date.now() / 1000) + 900,
      items: [{ name: plans[body.plan].name, quantity: 1, price: amount }],
      signature: paymentSignature(payload, process.env.PAYOS_CHECKSUM_KEY!),
    }),
    cache: 'no-store',
  });
  const result = await response.json();
  const payment = result.data;
  if (
    !response.ok ||
    result.code !== '00' ||
    !payment ||
    Number(payment.amount) !== amount ||
    Number(payment.orderCode) !== Number(order.order_code) ||
    !isPaymentUrl(payment.checkoutUrl) ||
    typeof payment.paymentLinkId !== 'string'
  )
    fail('checkoutUnavailable', 502);
  const saved = await db
    .from('plan_orders')
    .update({ payment_link_id: payment.paymentLinkId, checkout_url: payment.checkoutUrl })
    .eq('id', order.id)
    .eq('status', 'pending');
  if (saved.error) fail('checkoutUnavailable', 503);
  return ok({ provider, url: payment.checkoutUrl });
});
