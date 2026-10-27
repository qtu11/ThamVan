import nextEnv from '@next/env';
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
report(
  'VISION_API_KEY + VISION_MODEL (optional)',
  Boolean(process.env.VISION_API_KEY && process.env.VISION_MODEL),
);
report(
  'Turnstile site + secret keys (required for production auth)',
  Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
);
console.table(checks);
console.log(
  'Commerce storage:',
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
    ? 'CONFIGURED (apply migration 004 separately)'
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
    ? 'ENABLED (verify provider in Supabase dashboard)'
    : 'DISABLED (set AUTH_GOOGLE_ENABLED=true after setup)',
);
console.log('Values are intentionally not printed. Apply migrations and seed separately.');
if (!checks.slice(0, 3).every((c) => c.status === 'OK')) process.exitCode = 1;
