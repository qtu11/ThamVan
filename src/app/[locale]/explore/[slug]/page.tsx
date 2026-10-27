import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  MapPin,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ScanEye,
  Trophy,
  ExternalLink,
} from 'lucide-react';
import { getAllMapPlaces, getViewer, getPersonalData, getChallenges } from '@/lib/data';
import { isLocale, textFor } from '@/lib/types';
import { t, dateFormat } from '@/lib/i18n';
import { Photo, HeritageCard } from '@/components/ui';
import { EntryActions } from '@/components/entry-actions';
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  const s = slug.toLowerCase();
  const entry = (await getAllMapPlaces()).find(
    (e) => e.slug.toLowerCase() === s || e.id.toLowerCase() === s,
  );
  return {
    title: entry?.name,
    description: entry
      ? textFor(entry.translations, isLocale(raw) ? raw : 'vi').summary
      : undefined,
  };
}
export default async function Entry({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const s = slug.toLowerCase();
  const [entries, viewer, personal, challenges] = await Promise.all([
    getAllMapPlaces(),
    getViewer(),
    getPersonalData(),
    getChallenges(),
  ]);
  const entry = entries.find((e) => e.slug.toLowerCase() === s || e.id.toLowerCase() === s);
  if (!entry) notFound();
  const text = textFor(entry.translations, locale);
  return (
    <div className="container section detail-page">
      <Link className="text-link back-link" href={`/${locale}/explore`}>
        <ArrowLeft size={16} />
        {t(locale, 'explore')}
      </Link>
      <div className="detail-hero">
        <Photo entry={entry} priority />
        <div className="detail-shade" />
        <div className="detail-title">
          <span className="pill">{t(locale, entry.kind)}</span>
          <h1>{entry.name}</h1>
          <p>
            <MapPin size={17} />
            {entry.region}
          </p>
        </div>
      </div>
      <div className="detail-layout">
        <article className="detail-article">
          <p className="lead">{text.summary}</p>
          <EntryActions
            id={entry.id}
            locale={locale}
            signedIn={!!viewer}
            initialSaved={personal.saved.some((e) => e.entry_id === entry.id)}
          />
          <section>
            <h2>
              <BookOpen size={22} />
              {t(locale, 'overview')}
            </h2>
            <p>{text.story}</p>
          </section>
          <section className="closer-box">
            <h2>
              <ScanEye size={23} />
              {t(locale, 'lookCloser')}
            </h2>
            <p>{text.detail}</p>
          </section>
          <section className="sources">
            <h2>{t(locale, 'sources')}</h2>
            <p>{t(locale, 'sourceNote')}</p>
            {entry.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} />
                <span>
                  <strong>{source.publisher}</strong>
                  <small>
                    {source.title} · {dateFormat(locale, source.accessed)}
                  </small>
                </span>
              </a>
            ))}
            <p className="help-text">
              {t(locale, 'updated')}: {dateFormat(locale, entry.updated_at)} ·{' '}
              {t(locale, entry.verification === 'reviewed' ? 'reviewed' : 'reference')}
            </p>
            {entry.image && entry.image_source && (
              <p className="help-text">
                {t(locale, 'photoCredit')}:{' '}
                <a href={entry.image_source} target="_blank" rel="noopener noreferrer">
                  {entry.image_author || new URL(entry.image_source).hostname}
                  {entry.image_license ? ` · ${entry.image_license}` : ''}
                </a>
                {!entry.image_license && <> · {t(locale, 'photoRightsPending')}</>}
              </p>
            )}
          </section>
        </article>
        <aside className="detail-aside">
          <span className="eyebrow">{t(locale, 'journey')}</span>
          <h2>{t(locale, 'related')}</h2>
          {entry.latitude !== null && entry.longitude !== null && (
            <>
              <Link className="button" href={`/${locale}/map?place=${entry.slug}`}>
                <MapPin size={17} />
                {t(locale, 'mapAll')}
              </Link>
              <a
                className="button secondary"
                href={`https://www.google.com/maps/dir/?api=1&destination=${entry.latitude},${entry.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(locale, 'directions')}
                <ArrowUpRight size={17} />
              </a>
              <p className="help-text">{t(locale, 'coordinateNote')}</p>
            </>
          )}
          {challenges
            .filter((c) => c.entry_id === entry.id)
            .map((c) => (
              <Link key={c.id} className="aside-challenge" href={`/${locale}/challenges#${c.id}`}>
                <Trophy size={25} />
                <span>
                  {textFor(c.translations, locale).title}
                  <small>
                    {c.points} {t(locale, 'points')}
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
        </aside>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>{t(locale, 'related')}</h2>
        </div>
        <div className="card-grid">
          {entries
            .filter((e) => e.id !== entry.id)
            .slice(0, 3)
            .map((e) => (
              <HeritageCard entry={e} locale={locale} key={e.id} />
            ))}
        </div>
      </section>
    </div>
  );
}
