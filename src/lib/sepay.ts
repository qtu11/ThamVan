import { createHmac, timingSafeEqual } from 'node:crypto';
export const sepayFields = [
  'order_amount',
  'merchant',
  'currency',
  'operation',
  'order_description',
  'order_invoice_number',
  'customer_id',
  'payment_method',
  'success_url',
  'error_url',
  'cancel_url',
] as const;
export function signSepay(fields: Record<string, string>, secret: string) {
  return createHmac('sha256', secret)
    .update(
      sepayFields
        .filter((key) => fields[key] !== undefined)
        .map((key) => `${key}=${fields[key]}`)
        .join(','),
    )
    .digest('base64');
}
export function secretMatches(received: string | null, expected: string) {
  if (!received || !expected) return false;
  const a = Buffer.from(received),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function exactVnd(value: unknown) {
  if (typeof value !== 'string' || !/^\d+(\.0{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
