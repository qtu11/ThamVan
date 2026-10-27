import { Compass } from 'lucide-react';
import { getCatalog } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { DiscoveryList } from '@/components/discovery';
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
          <Compass size={16} /> THÁM VĂN COLLECTION
        </p>
        <h1>{t(locale, 'explore')}</h1>
        <p>{t(locale, 'featuredDesc')}</p>
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
