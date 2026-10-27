import { expect, it } from 'vitest';
import {
  aliases,
  matchPhoto,
  sourceFileTitle,
  eligibleLicense,
  reviewedLocationPhoto,
} from '../scripts/lib/photo-discovery';

it('requires a location view review of the exact photo rather than a name or license match', () => {
  const visualReview = { decision: 'accepted', subject: 'LOCATION_VIEW', sha256: 'photo-a' };
  expect(reviewedLocationPhoto({ sha256: 'photo-a', visualReview })).toBe(true);
  expect(reviewedLocationPhoto({ sha256: 'photo-b', visualReview })).toBe(false);
  expect(reviewedLocationPhoto({ sha256: 'photo-a' })).toBe(false);
  expect(
    reviewedLocationPhoto({
      sha256: 'photo-a',
      visualReview: { ...visualReview, subject: 'FOOD' },
    }),
  ).toBe(false);
  expect(
    reviewedLocationPhoto({
      sha256: 'photo-a',
      visualReview: { ...visualReview, decision: 'rejected' },
    }),
  ).toBe(false);
});

it('requires both place identity and local context, and rejects maps and another city', () => {
  const place = { name: 'Trường Tiểu học Lê Lợi', address: 'TP.HCM', lat: 10.8, lon: 106.7 };
  expect(matchPhoto(place, 'File:Trường Tiểu học Lê Lợi.jpg', 'A school in Hanoi')).toBeNull();
  expect(matchPhoto(place, 'File:Trường Tiểu học Lê Lợi map.jpg', 'Ho Chi Minh City')).toBeNull();
  expect(matchPhoto(place, 'File:Trường Tiểu học Lê Lợi.jpg', '')).toBeNull();
  expect(matchPhoto(place, 'File:Trường Tiểu học Lê Lợi.jpg', 'Ho Chi Minh City')).toMatchObject({
    method: 'EXACT_NAME_AND_GEOGRAPHY',
  });
  expect(
    matchPhoto(place, 'File:Trường Tiểu học Lê Lợi.jpg', 'Ho Chi Minh City', { lat: 21, lon: 105 }),
  ).toBeNull();
});

it('handles short names without inventing a distinguishing alias', () => {
  expect(aliases({ name: 'Mùa', address: 'Unknown' })).toEqual([]);
  expect(
    matchPhoto({ name: 'Mùa', address: 'Unknown' }, 'Mùa Saigon', 'Ho Chi Minh City'),
  ).toBeNull();
});

it('does not treat an address in parentheses or a mention in a travel caption as the venue', () => {
  const restaurant = {
    name: 'Bếp Mẹ In (Lê Thánh Tôn)',
    aliases: ['Bếp Mẹ In', 'Lê Thánh Tôn'],
    address: 'TP.HCM',
  };
  expect(aliases(restaurant)).not.toContain('Lê Thánh Tôn');
  expect(
    matchPhoto(restaurant, 'File:Le Thanh Ton Street Ho Chi Minh City.jpg', 'We ate at Bếp Mẹ In.'),
  ).toBeNull();
  expect(
    matchPhoto(
      restaurant,
      'File:Bếp Mẹ In Ho Chi Minh City.jpg',
      'The restaurant in Ho Chi Minh City',
    ),
  ).not.toBeNull();
});

it('keeps the original wiki project when resolving a photo source', () => {
  expect(sourceFileTitle('https://upload.wikimedia.org/wikipedia/vi/a/ab/Example.jpg')).toBeNull();
  expect(sourceFileTitle('https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg')).toBe(
    'File:Example.jpg',
  );
  expect(sourceFileTitle('https://evil.example/File:Example.jpg')).toBeNull();
});

it('accepts documented reusable licenses and rejects restricted or unknown rights', () => {
  expect(eligibleLicense('CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/')).toBe(
    true,
  );
  expect(eligibleLicense('CC BY-NC 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/')).toBe(
    false,
  );
  expect(eligibleLicense('Unknown', '')).toBe(false);
});
