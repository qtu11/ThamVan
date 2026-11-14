import { z } from 'zod';
import { route, readJson, requireViewer, ok, fail } from '@/lib/api';
import { supabase, supabaseAdmin } from '@/lib/supabase/server';
import { starterChallenges } from '@/data/catalog';

const FALLBACK_HERITAGE_ID = '00000000-0000-4000-8000-000000000001';

// Kept strictly server-side so client bundles never receive starter quiz answer keys.
const STARTER_CORRECT_ANSWERS: Record<string, number> = {
  '10000000-0000-4000-8000-000000000001': 1,
  '10000000-0000-4000-8000-000000000002': 2,
  '10000000-0000-4000-8000-000000000003': 3,
  '10000000-0000-4000-8000-000000000004': 1,
  '10000000-0000-4000-8000-000000000005': 0,
  '10000000-0000-4000-8000-000000000006': 2,
  '10000000-0000-4000-8000-000000000007': 3,
  '10000000-0000-4000-8000-000000000008': 1,
  '10000000-0000-4000-8000-000000000009': 2,
  '10000000-0000-4000-8000-000000000010': 0,
  '10000000-0000-4000-8000-000000000011': 3,
  '10000000-0000-4000-8000-000000000012': 0,
};

export const POST = route(async (request) => {
  const viewer = await requireViewer();
  const body = await readJson(
    request,
    z.object({ challenge_id: z.uuid(), answer: z.number().int().min(0).max(3).optional() }),
  );
  const db = await supabase();
  const starter = starterChallenges.find((item) => item.id === body.challenge_id);
  const expectedStarterAnswer = starter ? STARTER_CORRECT_ANSWERS[starter.id] : undefined;
  const starterAnswerMatches =
    starter && body.answer !== undefined && expectedStarterAnswer !== undefined
      ? body.answer === expectedStarterAnswer
      : false;

  const runRpc = () =>
    body.answer === undefined
      ? db.rpc('join_challenge', { p_challenge_id: body.challenge_id })
      : db.rpc('complete_challenge', {
          p_challenge_id: body.challenge_id,
          // Never let stale seed answers (correct_option = 0) accept a wrong starter choice.
          p_answer: starter ? (starterAnswerMatches ? body.answer : -1) : body.answer,
        });

  let { data, error } = await runRpc();
  if (
    error?.message.includes('CHALLENGE_UNAVAILABLE') &&
    starter &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const admin = supabaseAdmin();
    const seeded = await admin.from('challenges').upsert(
      {
        id: starter.id,
        entry_id: FALLBACK_HERITAGE_ID,
        translations: starter.translations,
        points: starter.points,
        badge: starter.badge,
        status: 'published',
        expires_at: starter.expires_at,
      },
      { onConflict: 'id' },
    );
    if (seeded.error) fail('error', 500);
    ({ data, error } = await runRpc());
  }
  if (error)
    fail(
      error.message.includes('DAILY_CHALLENGE_LIMIT') ? 'DAILY_CHALLENGE_LIMIT' : 'error',
      error.message.includes('DAILY_CHALLENGE_LIMIT') ? 429 : 400,
    );

  const payload =
    data && typeof data === 'object' ? (data as { correct?: boolean; limited?: boolean }) : null;
  if (
    starterAnswerMatches &&
    starter &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    payload?.correct === false &&
    !payload.limited
  ) {
    const admin = supabaseAdmin();
    const updated = await admin
      .from('challenge_progress')
      .update({
        completed_at: new Date().toISOString(),
        awarded_points: starter.points,
      })
      .eq('user_id', viewer.id)
      .eq('challenge_id', starter.id)
      .is('completed_at', null);
    if (updated.error) fail('error', 500);
    return ok({ correct: true, points: starter.points, already_completed: false });
  }
  return ok(data ?? { success: true });
});
