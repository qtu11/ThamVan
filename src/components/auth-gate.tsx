import Link from 'next/link';
import { UserRound, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { t } from '@/lib/i18n';
export function AuthGate({ locale, next }: { locale: Locale; next: string }) {
  return (
    <div className="empty auth-gate">
      <UserRound size={40} />
      <h2>{t(locale, 'journeyEmpty')}</h2>
      <p>{t(locale, 'authRequired')}</p>
      <Link className="button" href={`/${locale}/auth/login?next=${encodeURIComponent(next)}`}>
        {t(locale, 'login')}
        <ArrowRight size={17} />
      </Link>
      <Link className="text-link" href={`/${locale}/explore`}>
        {t(locale, 'explore')}
      </Link>
    </div>
  );
}
