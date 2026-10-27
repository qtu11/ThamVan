import { describe, it, expect } from 'vitest';
import { paymentSignature, verifyPaymentSignature } from '@/lib/payment-signature';
import { isPaymentUrl } from '@/lib/checkout-url';
describe('payOS payment-requests authenticity', () => {
  const key = '1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675';
  const data = {
    orderCode: 123,
    amount: 3000,
    description: 'VQRIO123',
    accountNumber: '12345678',
    reference: 'TF230204212323',
    transactionDateTime: '2023-02-04 18:25:00',
    currency: 'VND',
    paymentLinkId: '124c33293c43417ab7879e14c8d9eb18',
    code: '00',
    desc: 'Thành công',
    counterAccountBankId: '',
    counterAccountBankName: '',
    counterAccountName: '',
    counterAccountNumber: '',
    virtualAccountName: '',
    virtualAccountNumber: '',
  };
  it('matches the official provider reference vector', () =>
    expect(paymentSignature(data, key)).toBe(
      '412e915d2871504ed31be63c8f62a149a4410d34c4c42affc9006ef9917eaa03',
    ));
  it('rejects amount tampering, invalid encoding and another channel key', () => {
    const signature = paymentSignature(data, key);
    expect(verifyPaymentSignature(data, signature, key)).toBe(true);
    expect(verifyPaymentSignature({ ...data, amount: 1 }, signature, key)).toBe(false);
    expect(verifyPaymentSignature(data, signature, 'another-key')).toBe(false);
    for (const malformed of ['', 'x'.repeat(64), 'ab', '0'.repeat(66)])
      expect(verifyPaymentSignature(data, malformed, key)).toBe(false);
  });
  it('only redirects to the HTTPS hosted checkout origin', () => {
    expect(isPaymentUrl('https://pay.payos.vn/web/payment/123')).toBe(true);
    for (const bad of [
      'https://pay.payos.vn.evil.com/a',
      'javascript:alert(1)',
      'http://pay.payos.vn/a',
      'https://me:pass@pay.payos.vn/a',
      'https://evil.com',
      null,
      {},
    ])
      expect(isPaymentUrl(bad)).toBe(false);
  });
});
