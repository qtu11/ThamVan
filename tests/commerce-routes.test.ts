import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const fake = vi.hoisted(() => ({
  viewer: vi.fn(),
  rpc: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('@/lib/data', () => ({ getViewer: fake.viewer }));
vi.mock('@/lib/supabase/server', () => ({
  supabase: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ eq: () => fake.select() }) }) }),
  }),
  supabaseAdmin: () => ({
    rpc: fake.rpc,
    from: () => ({ update: () => ({ eq: () => ({ eq: () => fake.update() }) }) }),
  }),
}));
import { POST as checkout } from '@/app/api/checkout/route';
import { POST as webhook } from '@/app/api/payments/payos/route';
import { POST as lead } from '@/app/api/business-leads/route';
import { ownsExperience } from '@/lib/commerce';
import { paymentSignature } from '@/lib/payment-signature';
const orderId = '50000000-0000-4000-8000-000000000001';
const order = { id: orderId, order_code: 123456, amount: 69000 };
const request = (path: string, body: unknown, origin = 'http://localhost:3000') =>
  new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const purchase = { product: 'walk', experience: 'sai-gon-ben-song', locale: 'vi', consent: true };
const transaction = {
  orderCode: 123456,
  amount: 69000,
  paymentLinkId: 'link-1',
  reference: 'bank-001',
  currency: 'VND',
  code: '00',
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-public');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service');
  vi.stubEnv('COMMERCE_ENABLED', 'true');
  vi.stubEnv('PAYOS_CLIENT_ID', 'test-client');
  vi.stubEnv('PAYOS_API_KEY', 'test-api');
  vi.stubEnv('PAYOS_CHECKSUM_KEY', 'test-checksum');
  vi.stubEnv('COMMERCE_SUPPORT_EMAIL', 'support@example.test');
  vi.stubEnv('TURNSTILE_SECRET_KEY', '');
  fake.viewer.mockResolvedValue({
    id: '50000000-0000-4000-8000-000000000099',
    acceptedTerms: true,
  });
  fake.rpc.mockResolvedValue({ data: order, error: null });
  fake.update.mockResolvedValue({ error: null });
  fake.select.mockResolvedValue({ data: [], error: null });
  fake.fetch.mockResolvedValue(
    Response.json({
      code: '00',
      data: {
        amount: 69000,
        orderCode: 123456,
        checkoutUrl: 'https://pay.payos.vn/web/test',
        paymentLinkId: 'link-1',
      },
    }),
  );
  vi.stubGlobal('fetch', fake.fetch);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('checkout endpoint and fulfilment', () => {
  it('ignores forged browser prices and sends the server SKU total to the provider', async () => {
    const response = await checkout(request('/api/checkout', { ...purchase, amount: 1 }));
    expect(response.status).toBe(200);
    const payload = JSON.parse(fake.fetch.mock.calls[0][1].body);
    expect(payload.amount).toBe(69000);
    expect(payload.returnUrl).toBe(`http://localhost:3000/vi/orders/${orderId}`);
    expect(payload.items[0].price).toBe(69000);
    expect(fake.update).toHaveBeenCalledOnce();
  });
  it('requires same-origin, explicit purchase consent, authenticated account and enabled configuration', async () => {
    expect((await checkout(request('/api/checkout', purchase, 'https://evil.test'))).status).toBe(
      403,
    );
    expect((await checkout(request('/api/checkout', { ...purchase, consent: false }))).status).toBe(
      422,
    );
    fake.viewer.mockResolvedValue(null);
    expect((await checkout(request('/api/checkout', purchase))).status).toBe(401);
    vi.stubEnv('COMMERCE_ENABLED', 'false');
    expect((await checkout(request('/api/checkout', purchase))).status).toBe(503);
    expect(fake.fetch).not.toHaveBeenCalled();
  });
  it('rejects mismatched provider totals and malicious redirect URLs', async () => {
    for (const data of [
      {
        amount: 1,
        orderCode: 123456,
        checkoutUrl: 'https://pay.payos.vn/web/test',
        paymentLinkId: 'x',
      },
      {
        amount: 69000,
        orderCode: 123456,
        checkoutUrl: 'https://attacker.test/pay',
        paymentLinkId: 'x',
      },
    ]) {
      fake.fetch.mockResolvedValue(Response.json({ code: '00', data }));
      expect((await checkout(request('/api/checkout', purchase))).status).toBe(502);
    }
    expect(fake.update).not.toHaveBeenCalled();
  });
  it('never redirects a customer before persisting the provider link', async () => {
    fake.update.mockResolvedValue({ error: { message: 'storage unavailable' } });
    expect((await checkout(request('/api/checkout', purchase))).status).toBe(503);
  });
  it('only paid matching route or collection records grant access, and query failures fail closed', async () => {
    fake.select.mockResolvedValue({
      data: [{ product_id: 'walk', experience_slug: 'mot-ngay-cho-lon' }],
      error: null,
    });
    expect(await ownsExperience('sai-gon-ben-song')).toBe(false);
    expect(await ownsExperience('mot-ngay-cho-lon')).toBe(true);
    fake.select.mockResolvedValue({ data: [{ product_id: 'collection' }], error: null });
    expect(await ownsExperience('sai-gon-ben-song')).toBe(true);
    fake.select.mockResolvedValue({ data: null, error: { message: 'missing migration' } });
    expect(await ownsExperience('sai-gon-ben-song')).toBe(false);
  });
});
describe('provider webhook and lead capture', () => {
  it('accepts a valid provider callback without a browser Origin and checks the SQL result', async () => {
    fake.rpc.mockResolvedValue({ data: true, error: null });
    const body = {
      code: '00',
      success: true,
      data: transaction,
      signature: paymentSignature(transaction, 'test-checksum'),
    };
    const response = await webhook(request('/api/payments/payos', body, ''));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, matched: true });
    expect(fake.rpc).toHaveBeenCalledWith('complete_commerce_payment', {
      p_code: 123456,
      p_amount: 69000,
      p_link: 'link-1',
      p_reference: 'bank-001',
      p_currency: 'VND',
    });
  });
  it('rejects a tampered callback before touching the order ledger', async () => {
    const body = {
      code: '00',
      success: true,
      data: { ...transaction, amount: 1 },
      signature: paymentSignature(transaction, 'test-checksum'),
    };
    expect((await webhook(request('/api/payments/payos', body))).status).toBe(401);
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it('does not report success for a signed callback that mismatches an actual order', async () => {
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'PAYMENT_MISMATCH' } });
    const body = {
      code: '00',
      success: true,
      data: transaction,
      signature: paymentSignature(transaction, 'test-checksum'),
    };
    expect((await webhook(request('/api/payments/payos', body))).status).toBe(409);
  });
  it('only reports a saved lead after the database succeeds and checks consent', async () => {
    const body = {
      name: 'Test Contact',
      email: 'contact@example.test',
      organization: 'Test School',
      segment: 'school',
      message: 'A cultural learning walk for a school group.',
      locale: 'vi',
      consent: true,
    };
    expect((await lead(request('/api/business-leads', { ...body, consent: false }))).status).toBe(
      422,
    );
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'missing table' } });
    expect((await lead(request('/api/business-leads', body))).status).toBe(503);
    fake.rpc.mockResolvedValue({ data: 'lead-reference', error: null });
    const response = await lead(request('/api/business-leads', body));
    expect(await response.json()).toEqual({ reference: 'lead-reference' });
  });
});
