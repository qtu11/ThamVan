import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import { headers } from 'next/headers';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { hasSupabase, hasGoogleAuth } from '@/lib/env';
import { getViewer } from '@/lib/data';
import { authDestination, authErrorCode } from '@/lib/auth-policy';
import { AuthForm, type AuthMode } from '@/components/auth-form';
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; mode: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale: raw, mode } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  if (!['login', 'register', 'forgot', 'reset'].includes(mode)) notFound();
  const query = await searchParams;
  const next = authDestination(query.next, locale);
  const viewer = await getViewer();
  if (viewer && (mode === 'login' || mode === 'register')) redirect(next);
  if (!viewer && mode === 'reset' && hasSupabase()) redirect(`/${locale}/auth/forgot`);
  return (
    <div className="container auth-layout">
      <div className="auth-art">
        <Image
          src="/images/hcm-0025-nha-tho-duc-ba-sai-gon.jpg"
          alt="Nhà thờ Đức Bà Sài Gòn"
          fill
          sizes="50vw"
          unoptimized
        />
        <div />
        <p className="eyebrow">THÁM VĂN</p>
        <h2>
          {t(locale, 'hero1')}
          <br />
          {t(locale, 'hero2')}
        </h2>
        <p>{t(locale, 'footerText')}</p>
      </div>
      <div className="auth-panel">
        <p className="eyebrow">{t(locale, 'slogan')}</p>
        <h1>
          {t(
            locale,
            mode === 'forgot'
              ? 'forgotTitle'
              : mode === 'reset'
                ? 'reset'
                : (mode as 'login' | 'register'),
          )}
        </h1>
        <p>{t(locale, 'welcomeDesc')}</p>
        <AuthForm
          locale={locale}
          mode={mode as AuthMode}
          configured={hasSupabase()}
          googleEnabled={hasGoogleAuth()}
          next={next}
          nonce={(await headers()).get('x-nonce') || undefined}
          initialError={query.error ? authErrorCode(query.error) : undefined}
        />
      </div>
    </div>
  );
}
