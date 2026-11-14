'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Footprints,
  ImageOff,
  MapPin,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import type { Heritage, Locale, Progress, Saved } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';
import { levelForXp, totalEarnedXp } from '@/lib/xp';
import { useJourneyPhotos } from '@/lib/journey-photos';
import { Photo } from './ui';

export function PersonalJourney({
  locale,
  viewer,
  saved,
  progress,
  entries,
}: {
  locale: Locale;
  viewer: { id: string; profile: { display_name: string } } | null;
  saved: Saved[];
  progress: Progress[];
  entries: Heritage[];
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const { photos, remove } = useJourneyPhotos();
  const [activeTab, setActiveTab] = useState<'places' | 'photos'>('places');

  const xp = totalEarnedXp(progress);
  const level = levelForXp(xp);

  const visited = useMemo(
    () =>
      saved
        .filter((item) => item.visited_at)
        .map((item) => ({
          saved: item,
          entry: entries.find((e) => e.id === item.entry_id),
        }))
        .filter((item): item is { saved: Saved; entry: Heritage } => Boolean(item.entry)),
    [saved, entries],
  );

  const completedChallenges = useMemo(
    () => progress.filter((item) => item.completed_at),
    [progress],
  );

  return (
    <section className="personal-journey" aria-label={t(locale, 'personalJourney')}>
      <div className="personal-journey-head">
        <div className="personal-journey-title">
          <span className="personal-journey-icon" aria-hidden="true">
            <Footprints size={22} />
          </span>
          <div>
            <h2>{t(locale, 'personalJourney')}</h2>
            <p>
              {viewer
                ? c(
                    `Hành trình của ${viewer.profile.display_name || 'bạn'} trên THÁM VĂN.`,
                    `${viewer.profile.display_name || 'Your'} journey on THÁM VĂN.`,
                    `${viewer.profile.display_name || '你'}在 THÁM VĂN 的旅程。`,
                  )
                : t(locale, 'profileIntro')}
            </p>
          </div>
        </div>
        <div className="personal-xp-pill" title={t(locale, 'totalXp')}>
          <Sparkles size={15} />
          <strong>{xp} XP</strong>
          <span>
            {t(locale, 'levelOf')} {level.level}
          </span>
        </div>
      </div>

      <div className="personal-journey-stats">
        <div>
          <strong>{visited.length}</strong>
          <span>{c('Địa điểm đã ghé', 'Places visited', '已到访地点')}</span>
        </div>
        <div>
          <strong>{photos.length}</strong>
          <span>{c('Ảnh đã chụp', 'Photos captured', '已拍照片')}</span>
        </div>
        <div>
          <strong>{completedChallenges.length}</strong>
          <span>{c('Thử thách hoàn thành', 'Challenges completed', '已完成挑战')}</span>
        </div>
        <div>
          <strong>{saved.length}</strong>
          <span>{c('Đã lưu', 'Saved', '已保存')}</span>
        </div>
      </div>

      <div className="personal-journey-level">
        <div className="personal-journey-level-head">
          <span>
            {t(locale, 'levelOf')} {level.level}
          </span>
          <span>
            {level.toNext} XP {c('tới cấp kế tiếp', 'to next level', '距离下一级')}
          </span>
        </div>
        <div
          className="personal-journey-track"
          role="progressbar"
          aria-valuenow={level.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={c('Tiến độ cấp độ', 'Level progress', '等级进度')}
        >
          <span style={{ width: `${level.progress}%` }} />
        </div>
      </div>

      <div className="personal-journey-tabs" role="tablist" aria-label={t(locale, 'personalJourney')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'places'}
          className={activeTab === 'places' ? 'active' : ''}
          onClick={() => setActiveTab('places')}
        >
          <MapPin size={15} />
          {t(locale, 'journeyPlaces')}
          <b>{visited.length}</b>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'photos'}
          className={activeTab === 'photos' ? 'active' : ''}
          onClick={() => setActiveTab('photos')}
        >
          <Camera size={15} />
          {t(locale, 'journeyPhotos')}
          <b>{photos.length}</b>
        </button>
      </div>

      {activeTab === 'places' &&
        (visited.length ? (
          <div className="personal-journey-grid">
            {visited.map(({ saved: item, entry }) => (
              <article key={`${item.entry_id}-${item.saved_at}`} className="personal-journey-card">
                <Link href={`/${locale}/explore/${entry.slug}`}>
                  <Photo entry={entry} />
                </Link>
                <div>
                  <strong>
                    <Link href={`/${locale}/explore/${entry.slug}`}>{entry.name}</Link>
                  </strong>
                  <small>
                    <MapPin size={12} />
                    {entry.region}
                  </small>
                  {item.visited_at && (
                    <small className="personal-journey-date">
                      {c('Đã ghé', 'Visited', '已到访')} ·{' '}
                      {new Intl.DateTimeFormat(
                        locale === 'vi' ? 'vi-VN' : locale === 'zh' ? 'zh-CN' : 'en-GB',
                        { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' },
                      ).format(new Date(item.visited_at))}
                    </small>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="personal-journey-empty">
            <ImageOff size={20} />
            {t(locale, 'journeyEmptyPlaces')}
          </p>
        ))}

      {activeTab === 'photos' &&
        (photos.length ? (
          <div className="personal-journey-gallery">
            {photos.map((photo) => (
              <figure key={photo.id} className="personal-journey-photo">
                {/* eslint-disable-next-line @next/next/no-img-element -- local device photo */}
                <img src={photo.dataUrl} alt={photo.name} loading="lazy" />
                <figcaption>
                  <strong>{photo.name}</strong>
                  <small>
                    <MapPin size={11} />
                    {photo.region}
                  </small>
                </figcaption>
                <button
                  type="button"
                  className="personal-journey-photo-remove"
                  onClick={() => remove(photo.id)}
                  aria-label={t(locale, 'removeFromJourney')}
                  title={t(locale, 'removeFromJourney')}
                >
                  <X size={14} />
                </button>
              </figure>
            ))}
          </div>
        ) : (
          <p className="personal-journey-empty">
            <Camera size={20} />
            {t(locale, 'journeyEmptyPhotos')}
          </p>
        ))}

      <div className="personal-journey-actions">
        <Link className="button secondary" href={`/${locale}/camera`}>
          <Camera size={17} />
          {t(locale, 'captureAndSave')}
        </Link>
        <Link className="button secondary" href={`/${locale}/journey`}>
          <Trophy size={17} />
          {t(locale, 'journey')}
        </Link>
      </div>
    </section>
  );
}

export function JourneyPhotoCleanup({ locale }: { locale: Locale }) {
  const { photos, remove } = useJourneyPhotos();
  if (!photos.length) return null;
  return (
    <div className="personal-journey-cleanup">
      <button type="button" className="text-btn" onClick={() => photos.forEach((p) => remove(p.id))}>
        <Trash2 size={14} />
        {copy(
          locale,
          'Xóa toàn bộ ảnh lưu trên thiết bị',
          'Clear device-saved photos',
          '清除设备本地照片',
        )}
      </button>
    </div>
  );
}
