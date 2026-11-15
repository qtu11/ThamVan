import { issueChallenge, verifyAttempt } from '@/lib/human-check';

/** A real single-use HumanCheck pass, produced the way the slider UI does it. */
export function humanPass() {
  const c = issueChallenge();
  let t = 0;
  const track: [number, number][] = Array.from({ length: 21 }, (_, i) => {
    t += 18 + (i % 3) * 7;
    return [8 + (c.x - 8) * (1 - Math.pow(1 - i / 20, 3)), t];
  });
  const pass = verifyAttempt(c.challenge, c.x, track);
  if (!pass) throw new Error('human pass not issued');
  return pass;
}
