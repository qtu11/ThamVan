import 'server-only';
import { getViewer } from './data';
import { supabase } from './supabase/server';
import { hasSupabase } from './env';
import { getMembership } from './workspace';
export const paymentWindowExpired = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() > 900000;

export const commerceStorageReady = () =>
  hasSupabase() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
export const checkoutReady = () =>
  commerceStorageReady() &&
  process.env.COMMERCE_ENABLED === 'true' &&
  Boolean(
    process.env.PAYOS_CLIENT_ID &&
    process.env.PAYOS_API_KEY &&
    process.env.PAYOS_CHECKSUM_KEY &&
    process.env.COMMERCE_SUPPORT_EMAIL,
  );

export async function ownsExperience(slug: string) {
  const viewer = await getViewer();
  if (!viewer || !hasSupabase()) return false;
  try {
    const access = await getMembership();
    if (access?.plan === 'premium' || access?.plan === 'family') return true;
  } catch {
    /* Keep legacy purchase access available if membership migration is not deployed. */
  }
  const db = await supabase();
  const { data, error } = await db
    .from('commerce_orders')
    .select('product_id,experience_slug')
    .eq('user_id', viewer.id)
    .eq('status', 'paid');
  // Migration/configuration failures must never grant access.
  if (error) return false;
  return data.some((order) => order.product_id === 'collection' || order.experience_slug === slug);
}
