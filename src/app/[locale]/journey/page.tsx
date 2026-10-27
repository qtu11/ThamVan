import { Route } from 'lucide-react';
import { getViewer, getCatalog, getPersonalData } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { AuthGate } from '@/components/auth-gate';
import { Journey } from '@/components/journey';
import { PurchaseLibrary } from '@/components/commerce/purchase-library';
import { PassportPreview } from '@/components/experience/passport-preview';
export default async function JourneyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const viewer = await getViewer();
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">
          <Route size={16} /> THÁM VĂN JOURNAL
        </p>
        <h1>{t(locale, 'journey')}</h1>
        <p>{t(locale, 'journeyIntro')}</p>
      </div>
      <div className="journey-passport">
        <PassportPreview locale={locale} />
      </div>
      {viewer && <PurchaseLibrary locale={locale} userId={viewer.id} />}
      {viewer ? (
        <Journey
          saved={(await getPersonalData()).saved}
          entries={await getCatalog()}
          locale={locale}
        />
      ) : (
        <AuthGate locale={locale} next={`/${locale}/journey`} />
      )}
    </div>
  );
}
