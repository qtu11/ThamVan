import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasSupabase, siteUrl } from './env';
import { getViewer } from './data';
import { limitedBody } from './vision';
export class ApiError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function fail(code: string, status = 400): never {
  throw new ApiError(code, status);
}
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    fail('invalidInput', 415);
  let text: string;
  try {
    text = (await limitedBody(request, 65536)).toString('utf8');
  } catch {
    fail('invalidInput', 413);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    fail('invalidInput');
  }
  const result = schema.safeParse(value);
  if (!result.success) fail('invalidInput', 422);
  return result.data;
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = new URL(siteUrl()).origin;
  if (origin !== allowed) fail('forbidden', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') fail('forbidden', 403);
}
export async function requireViewer(admin = false, allowUnconsented = false) {
  if (!hasSupabase()) fail('notConfigured', 503);
  const viewer = await getViewer();
  if (!viewer) fail('authRequired', 401);
  if (!allowUnconsented && !viewer.acceptedTerms) fail('termsRequired', 403);
  if (admin && !viewer.admin) fail('forbidden', 403);
  return viewer;
}
export function route(handler: (request: Request, context?: never) => Promise<Response>) {
  return async (request: Request) => {
    try {
      assertOrigin(request);
      return await handler(request);
    } catch (error) {
      if (error instanceof ApiError)
        return NextResponse.json({ error: error.code }, { status: error.status });
      // Log only the exception category, never bodies, tokens, email or provider messages.
      console.error('request_failed', error instanceof Error ? error.name : 'unknown');
      return NextResponse.json({ error: 'error' }, { status: 500 });
    }
  };
}
export const ok = (data: unknown = { success: true }) =>
  NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
export async function verifyCaptcha(token?: string) {
  const key = process.env.TURNSTILE_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') fail('notConfigured', 503);
    return;
  }
  if (!token) fail('captchaError', 422);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: key, response: token }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!data.success || data.hostname !== new URL(siteUrl()).hostname) fail('captchaError', 422);
}
