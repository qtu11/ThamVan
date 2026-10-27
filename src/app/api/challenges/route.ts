import { z } from 'zod';
import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { supabase } from '@/lib/supabase/server';
export const POST = route(async (request) => {
  await requireViewer();
  const body = await readJson(
    request,
    z.object({ challenge_id: z.uuid(), answer: z.number().int().min(0).max(3).optional() }),
  );
  const db = await supabase();
  const { data, error } =
    body.answer === undefined
      ? await db.rpc('join_challenge', { p_challenge_id: body.challenge_id })
      : await db.rpc('complete_challenge', {
          p_challenge_id: body.challenge_id,
          p_answer: body.answer,
        });
  if (error) fail('error', 400);
  return ok(data ?? { success: true });
});
