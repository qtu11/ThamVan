import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { legal } from '@/data/legal';
import { getCatalog } from '@/lib/data';
import images from '@/data/image-manifest.json';
import { commerceLegal } from '@/data/commerce-legal';
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ locale: string; document: string }>;
}) {
  const { locale: raw, document } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  if (!['privacy', 'terms', 'credits'].includes(document)) notFound();
  return (
    <div className="container section legal-page">
      <div className="page-heading">
        <p className="eyebrow">THÁM VĂN · 27.10.2026</p>
        <h1>{t(locale, document as 'terms' | 'privacy' | 'credits')}</h1>
      </div>
      {document === 'credits' ? (
        <>
          <p>{t(locale, 'sourceNote')}</p>
          {(await getCatalog()).map((e) => (
            <section key={e.id}>
              <h2>{e.name}</h2>
              {e.sources.map((s) => (
                <p key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.publisher} · {s.title}
                  </a>
                </p>
              ))}
              {e.image_source && (
                <p>
                  <a href={e.image_source} target="_blank" rel="noopener noreferrer">
                    {t(locale, 'photoCredit')}: {e.image_author}
                  </a>{' '}
                  ·{' '}
                  <a
                    href={images.find((i) => i.id === e.slug)?.licenseUrl || e.image_source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {e.image_license}
                  </a>
                </p>
              )}
            </section>
          ))}
        </>
      ) : (
        [
          ...legal[document as 'privacy' | 'terms'][locale],
          ...commerceLegal(locale, document as 'privacy' | 'terms'),
        ].map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))
      )}
    </div>
  );
}
