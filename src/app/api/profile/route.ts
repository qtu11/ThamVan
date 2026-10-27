import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { profileSchema } from '@/lib/validation';
import { supabase } from '@/lib/supabase/server';
export const PATCH = route(async (request) => {
  const viewer = await requireViewer();
  const body = await readJson(
    request,
    profileSchema.partial().refine((v) => Object.keys(v).length > 0),
  );
  const db = await supabase();
  const { error } = await db.from('profiles').update(body).eq('id', viewer.id);
  if (error) fail('error', 500);
  return ok();
});
