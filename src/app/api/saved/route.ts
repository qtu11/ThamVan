import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { savedSchema } from '@/lib/validation';
import { supabase } from '@/lib/supabase/server';
export const POST = route(async (request) => {
  const viewer = await requireViewer(),
    body = await readJson(request, savedSchema),
    db = await supabase();
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
    .from('saved_entries')
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
    .from('saved_entries')
    .delete()
    .eq('user_id', viewer.id)
    .eq('entry_id', body.entry_id);
  if (error) fail('error', 500);
  return ok();
});
