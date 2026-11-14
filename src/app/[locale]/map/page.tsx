import { MapPin } from 'lucide-react';
import { getHcmPlacesData, getViewer, getChallenges } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { MapExplorer } from '@/components/map-explorer';
import './map.css';

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
  const [places, challenges] = await Promise.all([getHcmPlacesData(), getChallenges()]);
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">
          <MapPin size={16} />{' '}
          {copy(
            locale,
            'BẢN ĐỒ DI SẢN · TP. HỒ CHÍ MINH',
            'HERITAGE ATLAS · HO CHI MINH CITY',
            '西贡遗产实景地图 · 胡志明市',
          )}
        </p>
        <h1>{t(locale, 'exploreSection')}</h1>
        <p>{t(locale, 'nearbyDesc')}</p>
      </div>
      <MapExplorer
        entries={places}
        locale={locale}
        focus={focus}
        challenges={challenges}
        profile={(await getViewer())?.profile}
      />
    </div>
  );
}
