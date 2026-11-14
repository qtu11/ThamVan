'use client';
import Link from 'next/link';
import { ScanLine, ArrowUpRight, MapPin } from 'lucide-react';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';
import type { RecognitionResult } from '@/lib/recognition';
import type { Locale } from '@/lib/types';
import { Photo } from './ui';
export function RecognitionResultView({
  result,
  locale,
}: {
  result: RecognitionResult;
  locale: Locale;
}) {
  return (
    <section className="recognition-result" aria-live="polite">
      <p className="eyebrow">
        <ScanLine size={16} />
        {t(locale, 'possibleMatch')}
      </p>
      <h2>
        {t(
          locale,
          result.assessment === 'nearby_match'
            ? 'lensNearby'
            : result.assessment === 'location_conflict'
              ? 'lensConflict'
              : result.assessment === 'visual_only'
                ? 'lensVisualOnly'
                : 'lensUncertain',
        )}
      </h2>
      <p className="help-text">{t(locale, 'lensLocationNote')}</p>
      <h2>{t(locale, 'evidence')}</h2>
      <p>{result.observation}</p>
      {result.visibleText.length > 0 && (
        <p>
          <strong>{t(locale, 'lensVisibleText')}: </strong>
          {result.visibleText.join(' · ')}
        </p>
      )}
      {result.objects.length > 0 && (
        <div className="recognition-objects">
          <h3>{t(locale, 'lensObjects')}</h3>
          {result.objects.map((object, index) => (
            <article key={index}>
              <h4>{object.name}</h4>
              <p>{object.description}</p>
              {object.placeId && (
                <p className="help-text">
                  {
                    result.candidates.find((candidate) => candidate.id === object.placeId)?.entry
                      .name
                  }
                </p>
              )}
              {object.culturalContext && <p>{object.culturalContext}</p>}
            </article>
          ))}
        </div>
      )}
      {result.candidates.length ? (
        result.candidates.map((c) => {
          const entry = c.entry;
          return entry ? (
            <div className="recognition-match" key={c.id}>
              <Photo entry={entry} />
              <div>
                <Link href={`/${locale}/explore/${entry.slug}`}>
                  <h3>
                    {entry.name} <ArrowUpRight size={17} />
                  </h3>
                </Link>
                <p style={{ margin: '2px 0 8px' }}>
                  <Link
                    className="text-link"
                    href={`/${locale}/map?focus=${encodeURIComponent(entry.slug)}`}
                  >
                    <MapPin size={14} /> {t(locale, 'mapView')} <ArrowUpRight size={13} />
                  </Link>
                </p>
                <p>{c.reason}</p>
                <ul>
                  {c.evidence.map((evidence, index) => (
                    <li key={index}>{evidence}</li>
                  ))}
                </ul>
                {entry.address && <p className="help-text">{entry.address}</p>}
                {c.distanceMeters !== null && (
                  <p className="help-text">
                    {t(locale, 'lensDistance')}: {c.distanceMeters} m ·{' '}
                    {t(
                      locale,
                      c.locationAssessment === 'nearby'
                        ? 'lensNearCandidate'
                        : c.locationAssessment === 'conflict'
                          ? 'lensFarCandidate'
                          : 'lensWeakCandidate',
                    )}
                  </p>
                )}
                {entry.sources.length > 0 && (
                  <details>
                    <summary>{t(locale, 'sources')}</summary>
                    <ul>
                      {entry.sources.map((source, index) => (
                        <li key={index}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ) : null;
        })
      ) : (
        <div>
          <p>{t(locale, 'noMatch')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            <Link className="button secondary" href={`/${locale}/explore`}>
              {t(locale, 'explore')}
              <ArrowUpRight size={15} />
            </Link>
            <Link className="button secondary" href={`/${locale}/map`}>
              <MapPin size={15} />
              {t(locale, 'mapView')}
              <ArrowUpRight size={15} />
            </Link>
            <span className="help-text" style={{ alignSelf: 'center' }}>
              {copy(
                locale,
                'Mẹo: thử chụp gần bảng tên hoặc mặt tiền chính rồi đối chiếu trong danh bạ.',
                'Tip: frame signage or the main facade clearly, or search directly in the archive.',
                '提示：可尝试近距离拍摄门匾或正立面，或直接在档案库中检索。',
              )}
            </span>
          </div>
        </div>
      )}
      {result.limitations.length > 0 && (
        <div>
          <h3>{t(locale, 'lensLimitations')}</h3>
          <ul>
            {result.limitations.map((limitation, index) => (
              <li key={index}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
