import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { hasSupabase, siteUrl } from '@/lib/env';
import {
  authDestination,
  authLocale,
  authErrorCode,
  acceptedCurrentTerms,
} from '@/lib/auth-policy';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = authLocale(url.searchParams.get('locale'), url.searchParams.get('next') || '/vi');
  const next = authDestination(url.searchParams.get('next'), locale);
  const failure = (code: string) => {
    const target = new URL(`/${locale}/auth/login`, siteUrl());
    target.searchParams.set('error', code);
    if (next !== `/${locale}`) target.searchParams.set('next', next);
    return NextResponse.redirect(target);
  };
  if (url.searchParams.has('error')) return failure(authErrorCode(url.searchParams.get('error')));
  const code = url.searchParams.get('code');
  if (hasSupabase() && code) {
    const db = await supabase();
    try {
      const { data, error } = await db.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        const profile = await db
          .from('profiles')
          .select('terms_version,consented_at')
          .eq('id', data.user.id)
          .single();
        if (!profile.error) {
          const destination = acceptedCurrentTerms(profile.data)
            ? next
            : `/${locale}/auth/consent?next=${encodeURIComponent(next)}`;
          return NextResponse.redirect(new URL(destination, siteUrl()));
        }
        await db.auth.signOut({ scope: 'local' });
      }
    } catch {
      /* Provider failures are reported without exposing tokens or raw messages. */
    }
  }
  return failure('authInvalid');
}
