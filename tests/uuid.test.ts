import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { uuid } from '@/lib/uuid';

afterEach(() => vi.unstubAllGlobals());

it('returns a valid v4 UUID even where crypto.randomUUID is missing (insecure context)', () => {
  const real = globalThis.crypto;
  vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => real.getRandomValues(a) });
  const ids = Array.from({ length: 200 }, uuid);
  for (const id of ids) expect(z.uuid().safeParse(id).success).toBe(true);
  expect(new Set(ids).size).toBe(200);
});
