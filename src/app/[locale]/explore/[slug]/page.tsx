import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  MapPin,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Compass,
  FileText,
  ScanEye,
  Trophy,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { getAllMapPlaces, getViewer, getPersonalData, getChallenges } from '@/lib/data';
import { isLocale, textFor } from '@/lib/types';
import { t, dateFormat } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { normalizeSearch } from '@/lib/geo';
import { Photo, HeritageCard } from '@/components/ui';
import { VisitActions } from '@/components/dashboard/visit-actions';
import { EntryActions } from '@/components/entry-actions';
import '../explore.css';

function safeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function safeHostname(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return raw;
  }
}

const CATEGORY_GROUP_LABELS: Record<string, { en: string; zh: string }> = {
  'Tín ngưỡng & Tâm linh': { en: 'Belief & Spiritual Sites', zh: '信仰与宗教场所' },
  'Di sản & Bảo tàng': { en: 'Heritage & Museums', zh: '遗产与博物馆' },
  'Giáo dục & Trường học': { en: 'Education & Campuses', zh: '教育与校园' },
  'Y tế & Bệnh viện': { en: 'Medical & Historic Hospitals', zh: '医疗与历史医院' },
  'Ẩm thực & Nhà hàng': { en: 'Cuisine & Dining', zh: '美食与餐厅' },
  'Cà phê & Check-in': { en: 'Cafes & Photo Spots', zh: '咖啡馆与打卡地' },
  'Bar, Pub & Rooftop': { en: 'Bars, Pubs & Rooftops', zh: '酒吧与天台' },
  'Mua sắm & Thương mại': { en: 'Markets & Commerce', zh: '市集与商业' },
  'Đô thị & Cao ốc': { en: 'Urban Landmarks & Towers', zh: '都市地标与高层建筑' },
  'Cảnh quan & Thiên nhiên': { en: 'Parks & Waterfronts', zh: '景观与自然绿地' },
  'Khách sạn & Nghỉ dưỡng': { en: 'Historic & City Hotels', zh: '酒店与旅宿' },
  'Spa & Chăm sóc sức khỏe': { en: 'Wellness & Spa', zh: '水疗与康养' },
  'Ngân hàng & Tài chính': { en: 'Banking & Finance', zh: '银行与金融建筑' },
  'Điểm đến & Tiện ích khác': { en: 'Civic & Other Landmarks', zh: '公共建筑与其他地标' },
};

function labelCategoryGroup(group: string, locale: 'en' | 'zh'): string {
  return CATEGORY_GROUP_LABELS[group]?.[locale] ?? group;
}

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
  const safeRefUrl = safeExternalUrl(entry.referenceUrl);
  const safeImageSource = safeExternalUrl(entry.image_source);
  const extraRefNeeded =
    safeRefUrl && !entry.sources.some((src) => src.url === safeRefUrl) ? safeRefUrl : null;
  const hasDistinctHistory =
    Boolean(entry.history?.trim()) &&
    normalizeSearch(entry.history || '') !== normalizeSearch(text.story);
  const distinctAliases = (entry.aliases || []).filter(
    (alias) => normalizeSearch(alias) !== normalizeSearch(entry.name),
  );
  const relatedEntries = entries
    .filter((candidate) => candidate.id !== entry.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.region === entry.region) score += 4;
      if (entry.categoryGroup && candidate.categoryGroup === entry.categoryGroup) score += 3;
      if (candidate.kind === entry.kind) score += 2;
      if (candidate.image) score += 1;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.candidate);

  return (
    <div className="container section detail-page">
      <div className="detail-breadcrumbs">
        <Link href={`/${locale}/explore`}>
          <ArrowLeft size={16} />
          {t(locale, 'explore')}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/${locale}/explore?region=${encodeURIComponent(entry.region)}`}>
          {entry.region}
        </Link>
      </div>
      <div className="detail-hero">
        <Photo entry={entry} priority />
        <div className="detail-shade" />
        <div className="detail-title">
          <div className="detail-title-pills">
            <span className="pill">{t(locale, entry.kind)}</span>
            <span className="detail-catalog-code">{entry.id.toUpperCase()}</span>
          </div>
          <h1>{entry.name}</h1>
          <p>
            <MapPin size={17} />
            {entry.address || entry.region}
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
          <VisitActions
            slug={entry.slug}
            locale={locale}
            signedIn={!!viewer}
            gps={entry.latitude !== null && entry.longitude !== null}
          />
          <div
            className="dossier-card"
            aria-label={copy(locale, 'Phiếu tư liệu địa điểm', 'Archival catalog dossier', '地点档案卡')}
          >
            <div className="dossier-header">
              <span className="dossier-eyebrow">
                <FileText size={15} />
                {copy(locale, 'PHIẾU TƯ LIỆU ĐÔ THỊ', 'HERITAGE ARCHIVE RECORD', '城市档案记录')}
              </span>
              <span className="dossier-badge">
                <ShieldCheck size={13} />
                {t(locale, entry.verification === 'reviewed' ? 'reviewed' : 'reference')}
              </span>
            </div>
            <dl className="dossier-grid">
              <div className="dossier-item">
                <dt>{copy(locale, 'Mã lưu trữ', 'Catalog ID', '档案编号')}</dt>
                <dd>{entry.id.toUpperCase()}</dd>
              </div>
              <div className="dossier-item">
                <dt>{copy(locale, 'Phân loại', 'Classification', '类别')}</dt>
                <dd>
                  {locale === 'vi'
                    ? entry.category || entry.categoryGroup || t(locale, entry.kind)
                    : entry.categoryGroup
                      ? labelCategoryGroup(entry.categoryGroup, locale)
                      : t(locale, entry.kind)}
                </dd>
              </div>
              <div className="dossier-item">
                <dt>{copy(locale, 'Khu vực', 'District / Area', '区域')}</dt>
                <dd>{entry.region}</dd>
              </div>
              <div className="dossier-item">
                <dt>{copy(locale, 'Cập nhật tư liệu', 'Record updated', '更新日期')}</dt>
                <dd>{dateFormat(locale, entry.updated_at)}</dd>
              </div>
              {entry.address && (
                <div className="dossier-item full">
                  <dt>{copy(locale, 'Địa chỉ thực địa', 'Street address', '实地地址')}</dt>
                  <dd>{entry.address}</dd>
                </div>
              )}
              {entry.latitude !== null && entry.longitude !== null && (
                <div className="dossier-item full">
                  <dt>{copy(locale, 'Tọa độ tham chiếu', 'Coordinates', '参考坐标')}</dt>
                  <dd>
                    {entry.latitude.toFixed(5)}°N, {entry.longitude.toFixed(5)}°E
                  </dd>
                </div>
              )}
              {distinctAliases.length > 0 && (
                <div className="dossier-item full">
                  <dt>{copy(locale, 'Tên gọi khác', 'Also known as', '别称')}</dt>
                  <dd>{distinctAliases.join(' · ')}</dd>
                </div>
              )}
            </dl>
          </div>
          <section>
            <h2>
              <BookOpen size={22} />
              {t(locale, 'overview')}
            </h2>
            <p>{text.story}</p>
            {hasDistinctHistory && (
              <div className="dossier-history-note">
                <strong>
                  {copy(
                    locale,
                    'Ghi chú lịch sử & bối cảnh',
                    'Archival historical note (Vietnamese source)',
                    '历史背景附注（越南语文献）',
                  )}
                </strong>
                {entry.history}
              </div>
            )}
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
            {extraRefNeeded && (
              <a href={extraRefNeeded} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} />
                <span>
                  <strong>{safeHostname(extraRefNeeded)}</strong>
                  <small>
                    {copy(
                      locale,
                      'Hồ sơ địa điểm tham khảo bổ sung',
                      'Additional reference record',
                      '补充参考档案',
                    )}
                  </small>
                </span>
              </a>
            )}
            <p className="help-text">
              {t(locale, 'updated')}: {dateFormat(locale, entry.updated_at)} ·{' '}
              {t(locale, entry.verification === 'reviewed' ? 'reviewed' : 'reference')}
            </p>
            {entry.image && safeImageSource && (
              <p className="help-text">
                {t(locale, 'photoCredit')}:{' '}
                <a href={safeImageSource} target="_blank" rel="noopener noreferrer">
                  {entry.image_author || safeHostname(safeImageSource)}
                  {entry.image_license ? ` · ${entry.image_license}` : ''}
                </a>
                {!entry.image_license && <> · {t(locale, 'photoRightsPending')}</>}
              </p>
            )}
          </section>
        </article>
        <aside className="detail-aside">
          <span className="eyebrow">{t(locale, 'journey')}</span>
          <h2>{copy(locale, 'Thực địa & Di chuyển', 'Field & Navigation', '实地导览与路线')}</h2>
          <div className="detail-aside-actions">
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
              </>
            )}
            <Link className="button secondary" href={`/${locale}/journey`}>
              <Compass size={17} />
              {copy(locale, 'Mở hộ chiếu hành trình', 'Open heritage passport', '打开探索护照')}
            </Link>
          </div>
          {entry.latitude !== null && entry.longitude !== null && (
            <p className="detail-aside-note">{t(locale, 'coordinateNote')}</p>
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
          {relatedEntries.map((e) => (
            <HeritageCard entry={e} locale={locale} key={e.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
