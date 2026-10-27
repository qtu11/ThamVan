import { z } from 'zod';
import { ApiError, readJson } from '@/lib/api';
import { commerceStorageReady } from '@/lib/commerce';
import { verifyPaymentSignature } from '@/lib/payment-signature';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // Provider callbacks have no browser Origin. Authentication is the HMAC, not the redirect URL.
  if (!commerceStorageReady() || !process.env.PAYOS_CHECKSUM_KEY)
    return Response.json({ error: 'notConfigured' }, { status: 503 });
  try {
    const body = await readJson(
      request,
      z.object({
        code: z.string(),
        success: z.boolean(),
        signature: z.string(),
        data: z
          .object({
            orderCode: z.number().int().positive().safe(),
            amount: z.number().int().positive(),
            paymentLinkId: z.string().min(1),
            reference: z.string().min(1),
            currency: z.string(),
            code: z.string(),
          })
          .passthrough(),
      }),
    );
    if (!verifyPaymentSignature(body.data, body.signature, process.env.PAYOS_CHECKSUM_KEY))
      return Response.json({ error: 'invalidSignature' }, { status: 401 });
    if (body.code !== '00' || !body.success || body.data.code !== '00')
      return Response.json({ ignored: true });
    const { data, error } = await supabaseAdmin().rpc('complete_commerce_payment', {
      p_code: body.data.orderCode,
      p_amount: body.data.amount,
      p_link: body.data.paymentLinkId,
      p_reference: body.data.reference,
      p_currency: body.data.currency,
    });
    if (error) return Response.json({ error: 'paymentMismatch' }, { status: 409 });
    // payOS channel verification sends a signed sample with no matching order. Acknowledge without granting anything.
    return Response.json({ received: true, matched: data === true });
  } catch (error) {
    return Response.json(
      { error: 'invalidWebhook' },
      { status: error instanceof ApiError ? error.status : 500 },
    );
  }
}
