import { z } from 'zod';
import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { supabase } from '@/lib/supabase/server';
export const POST = route(async (request) => {
  await requireViewer();
  const body = await readJson(
    request,
    z.object({ entry_id: z.uuid(), reason: z.string().trim().min(10).max(2000) }),
  );
  const db = await supabase();
  const { error } = await db.rpc('submit_report', {
    p_entry_id: body.entry_id,
    p_reason: body.reason,
  });
  if (error) fail(error.message.includes('RATE_LIMIT') ? 'rateLimit' : 'error', 400);
  return ok();
});
