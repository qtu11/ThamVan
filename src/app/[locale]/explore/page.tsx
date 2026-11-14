import Link from 'next/link';
import { Compass, MapPin } from 'lucide-react';
import { getCatalog } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { DiscoveryList } from '@/components/discovery';
import './explore.css';
export default async function Explore({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; kind?: string; region?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const query = await searchParams;
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">
          <Compass size={16} />{' '}
          {copy(
            locale,
            'ẤN PHẨM DI SẢN SÀI GÒN',
            'SAIGON HERITAGE ARCHIVE',
            '西贡文化遗产档案',
          )}
        </p>
        <h1>{t(locale, 'explore')}</h1>
        <p>{t(locale, 'featuredDesc')}</p>
        <div className="explore-view-switch">
          <Link className="active" href={`/${locale}/explore`}>
            <Compass size={15} />
            {t(locale, 'listView')}
          </Link>
          <Link href={`/${locale}/map`}>
            <MapPin size={15} />
            {t(locale, 'mapView')}
          </Link>
        </div>
      </div>
      <DiscoveryList
        entries={await getCatalog()}
        locale={locale}
        initialQuery={typeof query.q === 'string' ? query.q.slice(0, 100) : ''}
        initialKind={typeof query.kind === 'string' ? query.kind : ''}
        initialRegion={typeof query.region === 'string' ? query.region.slice(0, 100) : ''}
      />
    </div>
  );
}
