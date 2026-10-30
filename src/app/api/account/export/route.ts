import { requireViewer, route, ok, fail } from '@/lib/api';
import { getPersonalData } from '@/lib/data';
import { supabase } from '@/lib/supabase/server';
// POST prevents cross-site speculative navigation from triggering a personal export.
export const POST = route(async () => {
  const viewer = await requireViewer();
  const db = await supabase();
  const { data: reports, error } = await db
    .from('content_reports')
    .select('entry_id,reason,status,created_at')
    .eq('user_id', viewer.id);
  if (error) fail('error', 500);
  const orders = await db
    .from('commerce_orders')
    .select(
      'id,order_code,product_id,experience_slug,amount,currency,status,created_at,paid_at,refunded_at,purchase_terms_version,purchase_consented_at',
    )
    .eq('user_id', viewer.id);
  const tables = [
    'catalog_bookmarks',
    'memberships',
    'plan_orders',
    'discovery_visits',
    'travel_sessions',
    'place_submissions',
    'user_notifications',
    'itineraries',
  ] as const;
  const workspace = await Promise.all(
    tables.map(async (table) => {
      const result = await db.from(table).select('*').eq('user_id', viewer.id).limit(20000);
      return [
        table,
        {
          available: !result.error,
          limit: 20000,
          may_be_truncated: result.data?.length === 20000,
          data: result.error ? null : result.data,
        },
      ];
    }),
  );
  const points = await db
    .from('travel_points')
    .select('*')
    .order('session_id')
    .order('sequence')
    .limit(20000);
  return ok({
    workspace: Object.fromEntries(workspace),
    gps_points: {
      available: !points.error,
      limit: 20000,
      may_be_truncated: points.data?.length === 20000,
      data: points.error ? null : points.data,
    },
    exported_at: new Date().toISOString(),
    account: { email: viewer.email, profile: viewer.profile },
    ...(await getPersonalData()),
    reports,
    commerce_orders: orders.error ? null : orders.data,
    commerce_export_available: !orders.error,
  });
});
