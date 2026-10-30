import { getViewer, getCatalog } from '@/lib/data';
import { getAccountWorkspace } from '@/lib/workspace';
import { isLocale } from '@/lib/types';
import { pushReady } from '@/lib/push';
import { CustomerDashboard } from '@/components/dashboard/customer';
export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; invite?: string }>;
}) {
  const [{ locale: raw }, query, viewer, entries] = await Promise.all([
    params,
    searchParams,
    getViewer(),
    getCatalog(),
  ]);
  const locale = isLocale(raw) ? raw : 'vi';
  let data = null;
  let unavailable = false;
  if (viewer)
    try {
      data = await getAccountWorkspace();
    } catch {
      unavailable = true;
    }
  return (
    <CustomerDashboard
      locale={locale}
      name={viewer?.profile.display_name || 'Nhà khám phá'}
      signedIn={!!viewer}
      data={data}
      unavailable={unavailable}
      pushConnected={pushReady()}
      aiConnected={Boolean(process.env.ITINERARY_API_KEY && process.env.ITINERARY_MODEL)}
      regions={[...new Set(entries.map((entry) => entry.region))].sort((a, b) =>
        a.localeCompare(b, 'vi'),
      )}
      places={entries.map(({ slug, name }) => ({ slug, name }))}
      initialTab={query.tab || 'overview'}
      invite={query.invite}
    />
  );
}
