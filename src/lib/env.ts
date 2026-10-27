import 'server-only';
export const hasSupabase = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const hasVision = () => Boolean(process.env.VISION_API_KEY && process.env.VISION_MODEL);
export const hasGoogleAuth = () => hasSupabase() && process.env.AUTH_GOOGLE_ENABLED === 'true';
