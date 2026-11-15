import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
// Live evals call the real AI provider: kept out of `npm test`, run with `npm run vision:eval`.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['evals/**/*.eval.ts'], testTimeout: 60 * 60_000, hookTimeout: 60_000 },
});
