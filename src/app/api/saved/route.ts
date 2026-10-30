import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { savedSchema } from '@/lib/validation';
import { getCatalog } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/server';
export const POST = route(async (request) => {
  const viewer = await requireViewer(),
    body = await readJson(request, savedSchema),
    db = await supabase();
  if (body.entry_id.startsWith('HCM-')) {
    if (!(await getCatalog()).some((entry) => entry.id === body.entry_id))
      fail('invalidInput', 422);
    const quota = await supabaseAdmin().rpc('consume_workspace_quota', {
      p_user: viewer.id,
      p_bucket: 'bookmark',
      p_limit: 30,
      p_seconds: 60,
    });
    if (quota.error || !quota.data) fail('rateLimit', 429);
    const result = await supabaseAdmin()
      .from('catalog_bookmarks')
      .upsert(
        { user_id: viewer.id, entry_id: body.entry_id },
        { onConflict: 'user_id,entry_id', ignoreDuplicates: true },
      );
    if (result.error) fail('error', 503);
    return ok();
  }
  // Insert only, ignore existing rows: a second save cannot reset the original timestamp or visit.
  const { error } = await db
    .from('saved_entries')
    .upsert(
      { user_id: viewer.id, entry_id: body.entry_id },
      { onConflict: 'user_id,entry_id', ignoreDuplicates: true },
    );
  if (error) fail('error', 400);
  return ok();
});
export const PATCH = route(async (request) => {
  const viewer = await requireViewer(),
    body = await readJson(request, savedSchema),
    db = await supabase();
  const update = {
    ...(body.collection !== undefined ? { collection: body.collection } : {}),
    ...(body.visited !== undefined
      ? { visited_at: body.visited ? new Date().toISOString() : null }
      : {}),
  };
  const { data, error } = await db
    .from(body.entry_id.startsWith('HCM-') ? 'catalog_bookmarks' : 'saved_entries')
    .update(update)
    .eq('user_id', viewer.id)
    .eq('entry_id', body.entry_id)
    .select('entry_id')
    .single();
  if (error || !data) fail('error', 400);
  return ok();
});
export const DELETE = route(async (request) => {
  const viewer = await requireViewer(),
    body = await readJson(request, savedSchema),
    db = await supabase();
  const { error } = await db
    .from(body.entry_id.startsWith('HCM-') ? 'catalog_bookmarks' : 'saved_entries')
    .delete()
    .eq('user_id', viewer.id)
    .eq('entry_id', body.entry_id);
  if (error) fail('error', 500);
  return ok();
});
