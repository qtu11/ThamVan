import { expect, it } from 'vitest';
import { messages } from '@/lib/i18n';

it('has a non-empty vi, en and zh string for every message key', () => {
  const missing = Object.entries(messages).flatMap(([key, values]) =>
    values.flatMap((value, index) => (value.trim() ? [] : [`${key}[${['vi', 'en', 'zh'][index]}]`])),
  );
  expect(missing).toEqual([]);
});
