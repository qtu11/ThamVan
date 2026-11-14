import { Route } from 'lucide-react';
import { getViewer, getAllMapPlaces, getPersonalData } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { AuthGate } from '@/components/auth-gate';
import { Journey } from '@/components/journey';
import { PurchaseLibrary } from '@/components/commerce/purchase-library';
import { PassportPreview } from '@/components/experience/passport-preview';
export default async function JourneyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const viewer = await getViewer();
  const personal = viewer ? await getPersonalData() : null;
  const savedIds = new Set((personal?.saved || []).map((s) => s.entry_id));
  const matchedEntries = personal?.saved.length
    ? (await getAllMapPlaces()).filter((e) => savedIds.has(e.id))
    : [];
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">
          <Route size={16} />{' '}
          {copy(
            locale,
            'NHẬT KÝ THỰC ĐỊA THÁM VĂN',
            'THÁM VĂN FIELD JOURNAL',
            '探文实地探索日志',
          )}
        </p>
        <h1>{t(locale, 'journey')}</h1>
        <p>{t(locale, 'journeyIntro')}</p>
      </div>
      <div className="journey-passport">
        <PassportPreview locale={locale} />
      </div>
      {viewer && <PurchaseLibrary locale={locale} userId={viewer.id} />}
      {viewer && personal ? (
        <Journey saved={personal.saved} entries={matchedEntries} locale={locale} />
      ) : (
        <AuthGate locale={locale} next={`/${locale}/journey`} />
      )}
    </div>
  );
}
