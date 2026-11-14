'use client';
import { useParams } from 'next/navigation';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
export default function PageLoading() {
  const params = useParams();
  const locale =
    typeof params.locale === 'string' && isLocale(params.locale) ? params.locale : 'vi';
  return (
    <div
      className="container section"
      role="status"
      aria-busy="true"
      aria-label={t(locale, 'loading')}
    >
      <span className="sr-only">{t(locale, 'loading')}</span>
      <div className="skeleton skeleton-title" aria-hidden="true" />
      <div className="skeleton skeleton-hero" aria-hidden="true" />
      <div className="card-grid" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
