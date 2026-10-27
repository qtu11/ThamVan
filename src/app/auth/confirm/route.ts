import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { hasSupabase, siteUrl } from '@/lib/env';
import { safeNext } from '@/lib/geo';
export async function GET(request: Request) {
  const url = new URL(request.url),
    hash = url.searchParams.get('token_hash'),
    type = url.searchParams.get('type');
  const next = safeNext(
    url.searchParams.get('next'),
    type === 'recovery' ? '/vi/auth/reset' : '/vi',
  );
  if (hasSupabase() && hash && (type === 'signup' || type === 'recovery' || type === 'email')) {
    const db = await supabase();
    const { error } = await db.auth.verifyOtp({ token_hash: hash, type });
    if (!error) return NextResponse.redirect(new URL(next, siteUrl()));
  }
  return NextResponse.redirect(new URL('/vi/auth/login?error=authInvalid', siteUrl()));
}
