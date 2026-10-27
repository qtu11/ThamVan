import { MapPin } from 'lucide-react';
import { getHcmPlacesData, getViewer } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { MapExplorer } from '@/components/map-explorer';
export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ place?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const focus = (await searchParams).place;
  const places = await getHcmPlacesData();
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">
          <MapPin size={16} /> THÁM VĂN ATLAS · TP. HỒ CHÍ MINH
        </p>
        <h1>{t(locale, 'mapAll')}</h1>
        <p>{t(locale, 'nearbyDesc')}</p>
      </div>
      <MapExplorer
        entries={places}
        locale={locale}
        focus={focus}
        profile={(await getViewer())?.profile}
      />
    </div>
  );
}
