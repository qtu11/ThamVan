import 'server-only';
export const hasSupabase = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export function visionConfig() {
  try {
    const endpoint = new URL(process.env.VISION_API_URL || 'https://api.openai.com/v1/chat/completions');
    const key = process.env.VISION_API_KEY?.trim(), model = process.env.VISION_MODEL?.trim();
    const maxTokens = Number(process.env.VISION_MAX_OUTPUT_TOKENS || 3000);
    const tokenParameter = process.env.VISION_TOKEN_PARAMETER || 'max_completion_tokens';
    if (!key || !model || endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
      endpoint.hash || !Number.isInteger(maxTokens) || maxTokens < 512 || maxTokens > 8000 ||
      !['max_tokens', 'max_completion_tokens'].includes(tokenParameter)) return null;
    return { endpoint, key, model, maxTokens, tokenParameter };
  } catch { return null; }
}
export const hasVision = () => Boolean(visionConfig());
export const googleAuthFlow = () => process.env.AUTH_GOOGLE_FLOW || 'supabase';
export const hasGoogleAuth = () => hasSupabase() && process.env.AUTH_GOOGLE_ENABLED === 'true' &&
  (googleAuthFlow() === 'supabase' || (googleAuthFlow() === 'direct' &&
    Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())));
