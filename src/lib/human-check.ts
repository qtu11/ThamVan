import 'server-only';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Self-hosted slider CAPTCHA ("Tôi không phải người máy").
 * Stateless HMAC-signed challenges + single-use nonces (in-memory, per instance).
 * No third-party API involved.
 */
export const HUMAN_TEMPLATES = 5;
const PREFIX_CHALLENGE = 'hcc1.';
const PREFIX_PASS = 'hc1.';
const CHALLENGE_TTL = 120_000;
const PASS_TTL = 120_000;
const TOLERANCE = 6;

let devSecret: Buffer | undefined;
function secret(): Buffer {
  const own = process.env.CAPTCHA_SECRET;
  if (own && own.length >= 32) return Buffer.from(own);
  const jwt = process.env.SUPABASE_JWT_SECRET;
  if (jwt) return createHash('sha256').update(`thamvan-human-check:${jwt}`).digest();
  if (process.env.NODE_ENV === 'production') throw new Error('CAPTCHA_SECRET missing');
  devSecret ??= randomBytes(32);
  return devSecret;
}

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url');

function seal(prefix: string, payload: object) {
  const body = b64(payload);
  return `${prefix}${body}.${sign(prefix + body)}`;
}

function open<T>(prefix: string, token: string): T | null {
  if (!token.startsWith(prefix) || token.length > 1024) return null;
  const [body, sig] = token.slice(prefix.length).split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(prefix + body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

// Single-use registry. Best effort per server instance; TTL keeps it bounded.
const used = new Map<string, number>();
function consume(nonce: string, exp: number) {
  const now = Date.now();
  if (used.size > 5000) for (const [k, e] of used) if (e < now) used.delete(k);
  if (used.has(nonce)) return false;
  used.set(nonce, exp);
  return true;
}

type Challenge = { t: number; x: number; y: number; n: string; e: number };
type Pass = { n: string; e: number };

export function issueChallenge() {
  const payload: Challenge = {
    t: randomInt(HUMAN_TEMPLATES),
    x: randomInt(110, 241),
    y: randomInt(18, 112),
    n: randomBytes(12).toString('base64url'),
    e: Date.now() + CHALLENGE_TTL,
  };
  return {
    challenge: seal(PREFIX_CHALLENGE, payload),
    template: payload.t,
    x: payload.x,
    y: payload.y,
  };
}

/** track: [position, ms since pointerdown] samples recorded while dragging. */
export function verifyAttempt(challenge: string, x: number, track: [number, number][]) {
  const data = open<Challenge>(PREFIX_CHALLENGE, challenge);
  if (!data || data.e < Date.now()) return null;
  // One attempt per challenge: blocks brute-forcing the position.
  if (!consume(data.n, data.e)) return null;
  if (Math.abs(x - data.x) > TOLERANCE) return null;
  if (!humanLike(track)) return null;
  return seal(PREFIX_PASS, { n: randomBytes(12).toString('base64url'), e: Date.now() + PASS_TTL });
}

function humanLike(track: [number, number][]) {
  if (track.length < 6) return false;
  const duration = track[track.length - 1][1] - track[0][1];
  if (duration < 250 || duration > 60_000) return false;
  const speeds = new Set<number>();
  for (let i = 1; i < track.length; i++) {
    const dt = track[i][1] - track[i - 1][1];
    if (dt < 0) return false;
    if (dt > 0) speeds.add(Math.round(((track[i][0] - track[i - 1][0]) / dt) * 20));
  }
  // Scripted drags tend to have perfectly constant velocity.
  return speeds.size >= 3;
}

export function verifyHumanPass(token: string) {
  const data = open<Pass>(PREFIX_PASS, token);
  if (!data || data.e < Date.now()) return false;
  return consume(data.n, data.e);
}

export const isHumanPass = (token?: string) => !!token && token.startsWith(PREFIX_PASS);
