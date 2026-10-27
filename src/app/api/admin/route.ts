import { z } from 'zod';
import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { heritageSchema, challengeSchema } from '@/lib/validation';
import { supabase } from '@/lib/supabase/server';
const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heritage'), data: heritageSchema }),
  z.object({ type: z.literal('challenge'), data: challengeSchema }),
  z.object({ type: z.literal('report'), id: z.uuid(), status: z.enum(['resolved', 'dismissed']) }),
]);
export const POST = route(async (request) => {
  await requireViewer(true);
  const body = await readJson(request, schema);
  const db = await supabase();
  if (body.type === 'heritage') {
    const { error } = await db.from('heritage_entries').upsert(body.data);
    if (error) fail('invalidInput', 422);
  }
  if (body.type === 'report') {
    const { error } = await db
      .from('content_reports')
      .update({ status: body.status })
      .eq('id', body.id);
    if (error) fail('error', 500);
  }
  if (body.type === 'challenge') {
    const { correct_option, ...data } = body.data;
    const id = data.id || crypto.randomUUID();
    const saved = await db.from('challenges').upsert({ ...data, id, status: 'draft' });
    if (saved.error) fail('invalidInput', 422);
    const answer = await db.rpc('set_challenge_answer', {
      p_challenge_id: id,
      p_correct_option: correct_option,
    });
    if (answer.error) fail('error', 500);
    const published = await db.from('challenges').update({ status: data.status }).eq('id', id);
    if (published.error) fail('error', 500);
  }
  return ok();
});
