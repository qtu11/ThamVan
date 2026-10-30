import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { signSepay, secretMatches, exactVnd } from '@/lib/sepay';
import { validateItinerary } from '@/lib/itinerary';
describe('payment and itinerary validation', () => {
  it('signs SePay fields in gateway order, excluding extras and optional omissions', () => {
    const fields = {
      merchant: 'M1',
      currency: 'VND',
      operation: 'PURCHASE',
      order_amount: '39000',
      order_invoice_number: 'order',
      order_description: 'THAM VAN',
      payment_method: 'CARD',
      extra: 'ignore',
    };
    const expected = createHmac('sha256', 'secret')
      .update(
        'order_amount=39000,merchant=M1,currency=VND,operation=PURCHASE,order_description=THAM VAN,order_invoice_number=order,payment_method=CARD',
      )
      .digest('base64');
    expect(signSepay(fields, 'secret')).toBe(expected);
  });
  it('rejects missing secrets and partial/rounded amounts', () => {
    expect(secretMatches(null, 'secret')).toBe(false);
    expect(secretMatches('', '')).toBe(false);
    expect(secretMatches('x', 'secret')).toBe(false);
    expect(secretMatches('secret', 'secret')).toBe(true);
    for (const invalid of ['39000.10', '39000x', 39000, '1e4', '-39000', 'Infinity', '0'])
      expect(exactVnd(invalid)).toBeNull();
    expect(exactVnd('89000.00')).toBe(89000);
  });
  const draft = {
    title: 'A real catalog itinerary',
    days: [
      {
        day: 1,
        stops: [
          { slug: 'real-a', time: '09:00', minutes: 45, reason: 'Fits the requested interests' },
          { slug: 'real-b', time: '10:00', minutes: 30, reason: 'Nearby catalog place' },
        ],
      },
    ],
  };
  const slugs = new Set(['real-a', 'real-b']);
  it('accepts a bounded itinerary only using catalog slugs', () =>
    expect(validateItinerary(draft, slugs, 1, 2)).toEqual(draft));
  it('rejects invented/duplicate places, overlapping stops, wrong days and excessive duration', () => {
    const forged = structuredClone(draft);
    forged.days[0].stops[1].slug = 'imaginary';
    expect(() => validateItinerary(forged, slugs, 1, 2)).toThrow('INVALID_PLACE');
    forged.days[0].stops[1].slug = 'real-a';
    expect(() => validateItinerary(forged, slugs, 1, 2)).toThrow('INVALID_PLACE');
    forged.days[0].stops[1].slug = 'real-b';
    forged.days[0].stops[1].time = '09:10';
    expect(() => validateItinerary(forged, slugs, 1, 2)).toThrow('OVERLAPPING_STOPS');
    forged.days[0].stops[1].time = '14:00';
    expect(() => validateItinerary(forged, slugs, 1, 2)).toThrow('DAY_TOO_LONG');
    expect(() => validateItinerary(draft, slugs, 2, 2)).toThrow('INVALID_DAY_COUNT');
  });
});
