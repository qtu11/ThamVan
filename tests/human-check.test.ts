import { it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { issueChallenge, verifyAttempt, verifyHumanPass, isHumanPass } from '@/lib/human-check';

function humanTrack(target: number): [number, number][] {
  const out: [number, number][] = [];
  let t = 0;
  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    const eased = 1 - Math.pow(1 - p, 3); // decelerating like a real hand
    t += 18 + (i % 3) * 7;
    out.push([8 + (target - 8) * eased, t]);
  }
  return out;
}

it('issues one of 5 templates within bounds', () => {
  for (let i = 0; i < 50; i++) {
    const c = issueChallenge();
    expect(c.template).toBeGreaterThanOrEqual(0);
    expect(c.template).toBeLessThan(5);
    expect(c.x).toBeGreaterThanOrEqual(110);
    expect(c.x).toBeLessThanOrEqual(240);
  }
});

it('accepts a human-like drag and issues a single-use pass', () => {
  const c = issueChallenge();
  const pass = verifyAttempt(c.challenge, c.x + 3, humanTrack(c.x + 3));
  expect(pass).toBeTruthy();
  expect(isHumanPass(pass!)).toBe(true);
  expect(verifyHumanPass(pass!)).toBe(true);
  expect(verifyHumanPass(pass!)).toBe(false); // replay blocked
});

it('rejects wrong position, replayed challenge, tampering and robotic tracks', () => {
  const a = issueChallenge();
  expect(verifyAttempt(a.challenge, a.x + 30, humanTrack(a.x + 30))).toBeNull();
  expect(verifyAttempt(a.challenge, a.x, humanTrack(a.x))).toBeNull(); // one shot only

  const b = issueChallenge();
  const tampered = b.challenge.slice(0, -2) + (b.challenge.endsWith('A') ? 'BB' : 'AA');
  expect(verifyAttempt(tampered, b.x, humanTrack(b.x))).toBeNull();

  const c = issueChallenge();
  const linear: [number, number][] = Array.from({ length: 10 }, (_, i) => [8 + i * 10, i * 50]);
  expect(verifyAttempt(c.challenge, c.x, [...linear, [c.x, 500]])).toBeNull();

  const d = issueChallenge();
  expect(verifyAttempt(d.challenge, d.x, [[8, 0], [d.x, 5]])).toBeNull(); // teleport
});
