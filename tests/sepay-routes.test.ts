import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const fake = vi.hoisted(() => ({ rpc: vi.fn(), viewer: vi.fn() }));
vi.mock('@/lib/data', () => ({ getViewer: fake.viewer }));
vi.mock('@/lib/supabase/server', () => ({ supabaseAdmin: () => ({ rpc: fake.rpc }) }));
import { POST } from '@/app/api/payments/sepay/route';
const order = '80000000-0000-4000-8000-000000000001';
const body = {
  timestamp: 123456,
  notification_type: 'ORDER_PAID',
  order: {
    order_invoice_number: order,
    order_status: 'CAPTURED',
    order_currency: 'VND',
    order_amount: '39000.00',
  },
  transaction: {
    transaction_id: 'actual-reference',
    transaction_status: 'APPROVED',
    transaction_type: 'PAYMENT',
    transaction_currency: 'VND',
    transaction_amount: '39000',
    card_number: 'must-not-forward',
  },
};
const request = (value: unknown = body, secret = 'correct-secret') =>
  new Request('http://localhost:3000/api/payments/sepay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Secret-Key': secret },
    body: JSON.stringify(value),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service');
  vi.stubEnv('SEPAY_IPN_SECRET', 'correct-secret');
  fake.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe('SePay gateway IPN', () => {
  it('requires configured authentication and rejects forged callbacks without touching the ledger', async () => {
    expect((await POST(request(body, ''))).status).toBe(401);
    expect((await POST(request(body, 'wrong-secret'))).status).toBe(401);
    expect(fake.rpc).not.toHaveBeenCalled();
    vi.stubEnv('SEPAY_IPN_SECRET', '');
    expect((await POST(request())).status).toBe(503);
  });
  it('activates only a captured approved VND payment with exact matching amounts and strips card fields', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(fake.rpc).toHaveBeenCalledWith('activate_plan_order', {
      p_order: order,
      p_amount: 39000,
      p_currency: 'VND',
      p_provider: 'sepay',
      p_reference: 'sepay:actual-reference',
    });
    expect(JSON.stringify(fake.rpc.mock.calls)).not.toContain('card_number');
  });
  it('rejects wrong amount/status/currency and propagates ledger mismatches', async () => {
    for (const transaction of [
      { ...body.transaction, transaction_amount: '1' },
      { ...body.transaction, transaction_amount: '39000.01' },
      { ...body.transaction, transaction_status: 'DECLINED' },
      { ...body.transaction, transaction_currency: 'USD' },
    ])
      expect((await POST(request({ ...body, transaction }))).status).toBe(409);
    expect(fake.rpc).not.toHaveBeenCalled();
    fake.rpc.mockResolvedValue({ data: false, error: null });
    expect((await POST(request())).status).toBe(409);
  });
});
