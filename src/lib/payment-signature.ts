import { createHmac, timingSafeEqual } from 'node:crypto';

// payOS payment-requests canonicalisation; deliberately not the payouts format.
export function paymentSignature(data: Record<string, unknown>, key: string) {
  const canonical = Object.keys(data)
    .sort()
    .filter((name) => data[name] !== undefined)
    .map((name) => {
      let value = data[name];
      if (Array.isArray(value))
        value = JSON.stringify(
          value.map((item) => {
            if (typeof item !== 'object' || item === null) return item;
            return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
          }),
        );
      if (value === null || value === 'undefined' || value === 'null') value = '';
      return `${name}=${String(value)}`;
    })
    .join('&');
  return createHmac('sha256', key).update(canonical).digest('hex');
}
export function verifyPaymentSignature(
  data: Record<string, unknown>,
  signature: string,
  key: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(paymentSignature(data, key), 'hex'),
    Buffer.from(signature, 'hex'),
  );
}
export { isPaymentUrl } from './checkout-url';
