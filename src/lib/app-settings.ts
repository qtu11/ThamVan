import 'server-only';
import { commerceStorageReady } from './commerce';
import { supabaseAdmin } from './supabase/server';

/**
 * Admin switch app_settings.payments_live. `stored` = the settings table/row exists (migration 010).
 * Any missing table, row or error means preview mode: fail closed, never charge by accident.
 */
export async function paymentSettings() {
  if (!commerceStorageReady()) return { live: false, stored: false };
  try {
    const { data, error } = await supabaseAdmin()
      .from('app_settings')
      .select('value')
      .eq('key', 'payments_live')
      .maybeSingle();
    return { live: !error && data?.value === true, stored: !error && !!data };
  } catch {
    return { live: false, stored: false };
  }
}

export const paymentsLive = async () => (await paymentSettings()).live;
