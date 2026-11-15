import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import { getHcmPlacesData, getViewer, getChallenges } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { toMapPlace, type MapPlace } from '@/lib/map-types';
import { MapExplorer } from '@/components/map-explorer';
// Loaded with the page so markers and controls are positioned before the map chunk arrives.
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return { title: t(isLocale(raw) ? raw : 'vi', 'mapView') };
}

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ place?: string; focus?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const query = await searchParams;
  const focus = query.focus || query.place;
  const [catalog, challenges, viewer] = await Promise.all([
    getHcmPlacesData(),
    getChallenges(),
    getViewer(),
  ]);
  const places = catalog.map(toMapPlace).filter((place): place is MapPlace => place !== null);
  return (
    <div className="atlas-page">
      <div className="atlas-heading">
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
      </div>
      <MapExplorer
        places={places}
        locale={locale}
        focus={typeof focus === 'string' ? focus : undefined}
        challenges={challenges}
        profile={viewer?.profile}
      />
    </div>
  );
}
