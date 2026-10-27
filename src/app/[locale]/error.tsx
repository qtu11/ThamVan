'use client';
import { useParams } from 'next/navigation';
import { t } from '@/lib/i18n';
import { isLocale } from '@/lib/types';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const p = useParams();
  const locale = typeof p.locale === 'string' && isLocale(p.locale) ? p.locale : 'vi';
  return (
    <div className="container empty">
      <h1>{t(locale, 'error')}</h1>
      <p>{t(locale, 'sourceNote')}</p>
      <button className="button" onClick={reset}>
        {t(locale, 'retry')}
      </button>
    </div>
  );
}
