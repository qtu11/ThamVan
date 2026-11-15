import nextEnv from '@next/env';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const checks = [];
const report = (name, ok) => checks.push({ name, status: ok ? 'OK' : 'MISSING / INVALID' });
const site = process.env.NEXT_PUBLIC_SITE_URL;
let validSite = false;
try {
  const url = new URL(site);
  validSite =
    url.origin === site &&
    !url.username &&
    !url.password &&
    (url.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname));
} catch {}
report('NEXT_PUBLIC_SITE_URL', validSite);
let validSupabase = false;
try {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  validSupabase = url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
} catch {}
report('NEXT_PUBLIC_SUPABASE_URL', validSupabase);
report(
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
);
report(
  'SUPABASE_SERVICE_ROLE_KEY (account deletion)',
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
);
report('THEHIVE_API_KEY (camera AI + Family planner, DeepSeek)', Boolean(process.env.THEHIVE_API_KEY));
const maxTokens = Number(process.env.VISION_MAX_OUTPUT_TOKENS || 3000);
report(
  'VISION_MAX_OUTPUT_TOKENS (512-8000)',
  Number.isInteger(maxTokens) && maxTokens >= 512 && maxTokens <= 8000,
);
let validPrompt = false;
try {
  const prompt = await readFile(
    path.resolve(process.cwd(), process.env.VISION_PROMPT_FILE || 'prompts/recognition.md'),
    'utf8',
  );
  validPrompt =
    Boolean(prompt.trim()) &&
    prompt.length + (process.env.VISION_SYSTEM_PROMPT || '').length <= 16000;
} catch {}
report('VISION_PROMPT_FILE + VISION_SYSTEM_PROMPT', validPrompt);
const googleFlow = process.env.AUTH_GOOGLE_FLOW || 'supabase';
const googleReady =
  googleFlow === 'supabase' ||
  (googleFlow === 'direct' &&
    Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET));
report('Google OAuth flow + credentials', googleReady);
report(
  'CAPTCHA_SECRET (>= 32 chars) or SUPABASE_JWT_SECRET (slider captcha fails closed without one)',
  (process.env.CAPTCHA_SECRET || '').length >= 32 || Boolean(process.env.SUPABASE_JWT_SECRET),
);
console.table(checks);
console.log(
  'Commerce storage:',
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
    ? 'CONFIGURED (apply migrations 001-008 separately)'
    : 'NOT CONFIGURED',
);
console.log(
  'Checkout:',
  process.env.COMMERCE_ENABLED === 'true' &&
    Boolean(
      process.env.PAYOS_CLIENT_ID &&
      process.env.PAYOS_API_KEY &&
      process.env.PAYOS_CHECKSUM_KEY &&
      process.env.COMMERCE_SUPPORT_EMAIL,
    )
    ? 'ENABLED (verify real webhook and fulfilment separately)'
    : 'DISABLED / INCOMPLETE',
);
console.log(
  'Google sign-in:',
  process.env.AUTH_GOOGLE_ENABLED === 'true'
    ? googleReady
      ? `ENABLED (${googleFlow}; verify Supabase provider and real callback)`
      : 'INCOMPLETE (missing flow or credentials)'
    : 'DISABLED (set AUTH_GOOGLE_ENABLED=true after setup)',
);
console.log(
  'Google redirect URI:',
  validSite
    ? new URL(googleFlow === 'direct' ? '/auth/google/callback' : '/auth/callback', site).href
    : 'INVALID SITE ORIGIN',
);
console.log(
  'Recognition: consented device GPS only; no IP/default location. Images and GPS are not persisted.',
);
for (const [label, keys] of [
  ['SePay card merchant + IPN', ['SEPAY_MERCHANT_ID', 'SEPAY_SECRET_KEY', 'SEPAY_IPN_SECRET']],
  ['Family AI planner', ['THEHIVE_API_KEY']],
  ['Web Push VAPID', ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']],
])
  console.log(
    label + ':',
    keys.every((key) => Boolean(process.env[key]))
      ? 'CONFIGURED (live operation unverified)'
      : 'NOT CONFIGURED',
  );
console.log('Values are intentionally not printed. Apply migrations and seed separately.');
if (!checks.slice(0, 3).every((c) => c.status === 'OK')) process.exitCode = 1;
if (process.argv.includes('--strict') && !checks.every((c) => c.status === 'OK'))
  process.exitCode = 1;
