import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { authDestination } from '@/lib/auth-policy';
import { ConsentForm } from '@/components/consent-form';
export default async function ConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const next = authDestination((await searchParams).next, locale);
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
  if (viewer.acceptedTerms) redirect(next);
  return (
    <div className="container section consent-page">
      <p className="eyebrow">THÁM VĂN</p>
      <h1>{t(locale, 'completeAccount')}</h1>
      <p>{t(locale, 'consentIntro')}</p>
      <ConsentForm
        locale={locale}
        next={next}
        name={viewer.profile.display_name}
        email={viewer.email}
      />
    </div>
  );
}
