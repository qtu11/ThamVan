import 'server-only';
export const hasSupabase = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
// One AI provider for the whole app: TheHive's OpenAI-compatible endpoint with a DeepSeek model.
export const THEHIVE_CHAT_URL = new URL('https://api.thehive.ai/api/v3/chat/completions');
export const DEFAULT_THEHIVE_MODEL = 'deepseek-ai/deepseek-v4.1-flash-1017';
export const theHiveKey = () => process.env.THEHIVE_API_KEY?.trim() || null;
export function visionConfig() {
  const key = theHiveKey();
  const model = process.env.VISION_MODEL?.trim() || DEFAULT_THEHIVE_MODEL;
  const maxTokens = Number(process.env.VISION_MAX_OUTPUT_TOKENS || 3000);
  if (!key || !Number.isInteger(maxTokens) || maxTokens < 512 || maxTokens > 8000) return null;
  return { endpoint: THEHIVE_CHAT_URL, key, model, maxTokens };
}
export function itineraryConfig() {
  const key = theHiveKey();
  return key
    ? { endpoint: THEHIVE_CHAT_URL, key, model: process.env.ITINERARY_MODEL?.trim() || DEFAULT_THEHIVE_MODEL }
    : null;
}
export const hasVision = () => Boolean(visionConfig());
export const googleAuthFlow = () => process.env.AUTH_GOOGLE_FLOW || 'supabase';
export const hasGoogleAuth = () =>
  hasSupabase() &&
  process.env.AUTH_GOOGLE_ENABLED === 'true' &&
  (googleAuthFlow() === 'supabase' ||
    (googleAuthFlow() === 'direct' &&
      Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())));
