'use client';
import { useParams } from 'next/navigation';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
export default function PageLoading() {
  const params = useParams();
  const locale =
    typeof params.locale === 'string' && isLocale(params.locale) ? params.locale : 'vi';
  return (
    <div className="container section" aria-busy="true" aria-label={t(locale, 'loading')}>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-hero" />
      <div className="card-grid">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
