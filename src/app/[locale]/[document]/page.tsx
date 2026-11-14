import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { legal } from '@/data/legal';
import { getCatalog } from '@/lib/data';
import images from '@/data/image-manifest.json';
import { commerceLegal } from '@/data/commerce-legal';

function safeExternalUrl(raw?: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

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
        <p className="eyebrow">
          {copy(
            locale,
            'THÁM VĂN · HỒ SƠ PHÁP LÝ & NGUỒN TƯ LIỆU',
            'THÁM VĂN · POLICY & ARCHIVE CREDITS',
            'THÁM VĂN · 政策与文献署名',
          )}
        </p>
        <h1>{t(locale, document as 'terms' | 'privacy' | 'credits')}</h1>
      </div>
      {document === 'credits' ? (
        <>
          <p>{t(locale, 'sourceNote')}</p>
          {(await getCatalog()).map((e) => {
            const imgHref = safeExternalUrl(e.image_source);
            const manifestLicenseHref = safeExternalUrl(
              images.find((i) => i.id === e.slug)?.licenseUrl,
            );
            return (
              <section key={e.id}>
                <h2>{e.name}</h2>
                {e.sources.map((s) => {
                  const href = safeExternalUrl(s.url);
                  if (!href) return null;
                  return (
                    <p key={s.url}>
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {s.publisher} · {s.title}
                      </a>
                    </p>
                  );
                })}
                {imgHref && (
                  <p>
                    <a href={imgHref} target="_blank" rel="noopener noreferrer">
                      {t(locale, 'photoCredit')}: {e.image_author}
                    </a>{' '}
                    ·{' '}
                    <a
                      href={manifestLicenseHref || imgHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {e.image_license}
                    </a>
                  </p>
                )}
              </section>
            );
          })}
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
