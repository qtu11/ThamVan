'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
export default function NotFound() {
  const params = useParams();
  const locale =
    typeof params.locale === 'string' && isLocale(params.locale) ? params.locale : 'vi';
  return (
    <div className="container empty">
      <span className="eyebrow">404 · THÁM VĂN</span>
      <h1>{t(locale, 'notFound')}</h1>
      <p>{t(locale, 'notFoundDesc')}</p>
      <Link href={`/${locale}`} className="button">
        {t(locale, 'home')}
      </Link>
    </div>
  );
}
