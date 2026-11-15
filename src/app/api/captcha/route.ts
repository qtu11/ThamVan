import { z } from 'zod';
import { route, readJson, ok, fail } from '@/lib/api';
import { issueChallenge, verifyAttempt } from '@/lib/human-check';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('issue') }),
  z.object({
    action: z.literal('verify'),
    challenge: z.string().max(1024),
    x: z.number().finite().min(0).max(400),
    track: z
      .array(z.tuple([z.number().finite(), z.number().finite().min(0)]))
      .max(400),
  }),
]);

export const POST = route(async (request) => {
  const body = await readJson(request, schema);
  if (body.action === 'issue') return ok(issueChallenge());
  const token = verifyAttempt(body.challenge, body.x, body.track);
  if (!token) fail('captchaError', 422);
  return ok({ token });
});
