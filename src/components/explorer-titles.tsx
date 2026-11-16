'use client';
import { useMemo, useState } from 'react';
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Lock,
  Search,
  Sparkles,
} from 'lucide-react';
import type { Challenge, Locale } from '@/lib/types';
import { textFor } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import {
  TIER_ORDER,
  tierMeta,
  type EvaluatedExplorerTitle,
  type TitleTier,
} from '@/lib/explorer-titles';

const PAGE_SIZE = 12;
const SPOTLIGHT_PAGE_SIZE = 3;

function SpotlightBadgeClass(tier: TitleTier, unlocked: boolean) {
  return `title-card tier-${tier} ${unlocked ? 'is-unlocked' : 'is-locked'}`;
}

export function ExplorerTitlesSpotlight({
  locale,
  titles,
  activeTitle,
  equippedId,
  onEquip,
  onOpenAll,
}: {
  locale: Locale;
  titles: EvaluatedExplorerTitle[];
  activeTitle: EvaluatedExplorerTitle;
  equippedId: string;
  onEquip: (id: string) => void;
  onOpenAll: () => void;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const [slide, setSlide] = useState(0);

  const spotlightList = useMemo(() => {
    const unlocked = titles.filter((item) => item.unlocked);
    const nextByTier = TIER_ORDER.flatMap((tier) =>
      titles.filter((item) => item.tier === tier && !item.unlocked).slice(0, 3),
    );
    const merged: EvaluatedExplorerTitle[] = [];
    const seen = new Set<string>();
    for (const item of [...unlocked.slice(-6).reverse(), ...nextByTier]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
    return merged.length > 0 ? merged : titles.slice(0, 12);
  }, [titles]);

  const totalSlides = Math.max(1, Math.ceil(spotlightList.length / SPOTLIGHT_PAGE_SIZE));
  const safeSlide = Math.min(slide, totalSlides - 1);
  const visible = spotlightList.slice(
    safeSlide * SPOTLIGHT_PAGE_SIZE,
    safeSlide * SPOTLIGHT_PAGE_SIZE + SPOTLIGHT_PAGE_SIZE,
  );
  const unlockedCount = titles.filter((item) => item.unlocked).length;

  return (
    <section
      className="explorer-section"
      aria-label={c('Lộ trình danh hiệu', 'Explorer titles showcase', '探索头衔陈列')}
    >
      <div className="explorer-section-head">
        <div>
          <h2 className="explorer-section-title">
            {c(
              `Kho danh hiệu hành trình (${titles.length})`,
              `Explorer Title Vault (${titles.length})`,
              `探索头衔库（${titles.length}）`,
            )}
          </h2>
          <p className="titles-spotlight-sub">
            {c(
              `Đang đeo: ${activeTitle.title} · Đã mở ${unlockedCount}/${titles.length} danh hiệu từ Dễ đến Cực khó`,
              `Equipped: ${activeTitle.title} · Unlocked ${unlockedCount}/${titles.length} from Easy to Legendary`,
              `当前佩戴：${activeTitle.title} · 已解锁 ${unlockedCount}/${titles.length} 项（由简入难）`,
            )}
          </p>
        </div>
        <div className="titles-carousel-controls">
          <button
            type="button"
            className="titles-arrow-btn"
            onClick={() => setSlide((prev) => (prev <= 0 ? totalSlides - 1 : prev - 1))}
            aria-label={c('Lướt xem danh hiệu trước', 'Previous titles', '上一组头衔')}
            title={c('Trước (<)', 'Previous (<)', '上一组 (<)')}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="titles-page-indicator" aria-live="polite">
            {safeSlide + 1} / {totalSlides}
          </span>
          <button
            type="button"
            className="titles-arrow-btn"
            onClick={() => setSlide((prev) => (prev + 1) % totalSlides)}
            aria-label={c('Lướt xem danh hiệu tiếp theo', 'Next titles', '下一组头衔')}
            title={c('Sau (>)', 'Next (>)', '下一组 (>)')}
          >
            <ChevronRight size={18} />
          </button>
          <button type="button" className="titles-open-all-btn" onClick={onOpenAll}>
            {c(`Xem tất cả ${titles.length}`, `View all ${titles.length}`, `查看全部 ${titles.length}`)}
          </button>
        </div>
      </div>

      <div className="titles-spotlight-grid">
        {visible.map((item) => {
          const isEquipped = item.id === equippedId && item.unlocked;
          return (
            <article key={item.id} className={SpotlightBadgeClass(item.tier, item.unlocked)}>
              <div className="title-card-top">
                <span className={`title-tier-pill tier-${item.tier}`}>
                  #{String(item.order).padStart(3, '0')} · {item.difficultyLabel}
                </span>
                <span className={`title-lock-pill ${item.unlocked ? 'unlocked' : ''}`}>
                  {item.unlocked ? <Sparkles size={12} /> : <Lock size={12} />}
                  {item.unlocked
                    ? c('Đã mở', 'Unlocked', '已解锁')
                    : `${item.progressPct}%`}
                </span>
              </div>
              <h3 className="title-card-name">{item.title}</h3>
              <p className="title-card-motto">{item.motto}</p>
              <div className="title-card-how">
                <small>{c('Cách đạt được', 'How to earn', '解锁方式')}</small>
                <span>{item.howToEarn}</span>
              </div>
              <div className="explorer-progress-track small">
                <div className="explorer-progress-fill" style={{ width: `${item.progressPct}%` }} />
              </div>
              {item.unlocked && (
                <button
                  type="button"
                  className={`title-equip-btn ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => onEquip(item.id)}
                >
                  {isEquipped ? (
                    <>
                      <Check size={13} />
                      {c('Đang đeo', 'Equipped', '佩戴中')}
                    </>
                  ) : (
                    <>
                      <Award size={13} />
                      {c('Đeo danh hiệu', 'Equip title', '佩戴头衔')}
                    </>
                  )}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ExplorerTitlesBrowser({
  locale,
  titles,
  activeTitle,
  equippedId,
  onEquip,
  earnedBadges,
}: {
  locale: Locale;
  titles: EvaluatedExplorerTitle[];
  activeTitle: EvaluatedExplorerTitle;
  equippedId: string;
  onEquip: (id: string) => void;
  earnedBadges: Challenge[];
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const [tierFilter, setTierFilter] = useState<'all' | TitleTier>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const tierStats = useMemo(
    () =>
      TIER_ORDER.map((tier) => {
        const items = titles.filter((item) => item.tier === tier);
        const unlocked = items.filter((item) => item.unlocked).length;
        return {
          ...tierMeta(tier, locale),
          total: items.length,
          unlocked,
        };
      }),
    [titles, locale],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return titles.filter((item) => {
      if (tierFilter !== 'all' && item.tier !== tierFilter) return false;
      if (statusFilter === 'unlocked' && !item.unlocked) return false;
      if (statusFilter === 'locked' && item.unlocked) return false;
      if (q) {
        const hay = `${item.title} ${item.motto} ${item.howToEarn} ${item.difficultyLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [titles, tierFilter, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const startIdx = safePage * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const unlockedTotal = titles.filter((item) => item.unlocked).length;

  function selectTier(next: 'all' | TitleTier) {
    setTierFilter(next);
    setPage(0);
  }

  function selectStatus(next: 'all' | 'unlocked' | 'locked') {
    setStatusFilter(next);
    setPage(0);
  }

  function prevPage() {
    setPage((p) => (p <= 0 ? totalPages - 1 : p - 1));
  }

  function nextPage() {
    setPage((p) => (p + 1 >= totalPages ? 0 : p + 1));
  }

  function handleDeckKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prevPage();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextPage();
    }
  }

  const activeTierInfo = tierMeta(activeTitle.tier, locale);

  return (
    <div className="titles-browser-stack" onKeyDown={handleDeckKeyDown}>
      {/* Active Equipped Banner & Mastery Overview */}
      <div className="titles-mastery-banner">
        <div className="titles-active-summary">
          <div className="titles-active-icon" aria-hidden="true">
            <Compass size={26} />
          </div>
          <div>
            <span className="titles-active-eyebrow">
              {c('DANH HIỆU ĐANG HIỂN THỊ', 'ACTIVE EXPLORER TITLE', '当前展示头衔')} ·{' '}
              {activeTierInfo.shortLabel} ({activeTierInfo.difficulty})
            </span>
            <h3>{activeTitle.title}</h3>
            <p>{activeTitle.motto}</p>
            <small className="titles-active-how">
              {c('Điều kiện:', 'Requirement:', '解锁条件：')} {activeTitle.howToEarn}
            </small>
          </div>
        </div>

        <div className="titles-tier-roadmap">
          <div className="titles-roadmap-head">
            <strong>
              {c(
                `Đã chinh phục ${unlockedTotal} / ${titles.length} danh hiệu`,
                `${unlockedTotal} / ${titles.length} titles unlocked`,
                `已解锁 ${unlockedTotal} / ${titles.length} 项头衔`,
              )}
            </strong>
            <span>
              {Math.round((unlockedTotal / Math.max(1, titles.length)) * 100)}%
            </span>
          </div>
          <div className="titles-roadmap-pills">
            {tierStats.map((st) => (
              <button
                key={st.tier}
                type="button"
                className={`titles-roadmap-pill tier-${st.tier} ${tierFilter === st.tier ? 'is-selected' : ''}`}
                onClick={() => selectTier(tierFilter === st.tier ? 'all' : st.tier)}
                title={st.summary}
              >
                <span className="titles-roadmap-name">{st.difficulty}</span>
                <strong>
                  {st.unlocked}/{st.total}
                </strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters + Search + Top Carousel Arrow Controls */}
      <div className="titles-toolbar">
        <div className="titles-filter-row" role="group" aria-label={c('Lọc theo độ khó', 'Filter by difficulty', '按难度筛选')}>
          <button
            type="button"
            className={`titles-filter-chip ${tierFilter === 'all' ? 'active' : ''}`}
            onClick={() => selectTier('all')}
          >
            {c(`Tất cả (${titles.length})`, `All (${titles.length})`, `全部 (${titles.length})`)}
          </button>
          {tierStats.map((st) => (
            <button
              key={st.tier}
              type="button"
              className={`titles-filter-chip ${tierFilter === st.tier ? 'active' : ''}`}
              onClick={() => selectTier(st.tier)}
            >
              {st.shortLabel} · {st.difficulty}
            </button>
          ))}
        </div>

        <div className="titles-controls-row">
          <div className="titles-status-group" role="group" aria-label={c('Trạng thái mở khóa', 'Unlock status', '解锁状态')}>
            {(
              [
                ['all', c('Tất cả', 'All', '全部')],
                ['unlocked', c(`Đã đạt (${unlockedTotal})`, `Unlocked (${unlockedTotal})`, `已解锁 (${unlockedTotal})`)],
                ['locked', c(`Chưa đạt (${titles.length - unlockedTotal})`, `Locked (${titles.length - unlockedTotal})`, `未解锁 (${titles.length - unlockedTotal})`)],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`titles-status-btn ${statusFilter === key ? 'active' : ''}`}
                onClick={() => selectStatus(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="titles-search-box">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={c(
                'Tìm danh hiệu hoặc cách đạt...',
                'Search title or unlock rule...',
                '搜索头衔或解锁条件...',
              )}
              aria-label={c('Tìm kiếm danh hiệu', 'Search titles', '搜索头衔')}
            />
          </label>
        </div>

        <div className="titles-nav-bar">
          <span className="titles-range-text">
            {filtered.length === 0
              ? c('Không có danh hiệu khớp bộ lọc', 'No matching titles', '没有符合条件的头衔')
              : c(
                  `Hiển thị ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, filtered.length)} trên ${filtered.length} danh hiệu (từ dễ đến khó)`,
                  `Showing ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, filtered.length)} of ${filtered.length} titles (Easy to Legendary)`,
                  `显示第 ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, filtered.length)} 项，共 ${filtered.length} 项（由易到难）`,
                )}
          </span>
          <div className="titles-carousel-controls">
            <button
              type="button"
              className="titles-arrow-btn large"
              onClick={prevPage}
              disabled={totalPages <= 1}
              aria-label={c('Trang danh hiệu trước', 'Previous titles page', '上一页头衔')}
            >
              <ChevronLeft size={18} />
              <span>{c('Trước', 'Prev', '上一页')}</span>
            </button>
            <span className="titles-page-indicator" aria-live="polite">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="titles-arrow-btn large"
              onClick={nextPage}
              disabled={totalPages <= 1}
              aria-label={c('Trang danh hiệu sau', 'Next titles page', '下一页头衔')}
            >
              <span>{c('Sau', 'Next', '下一页')}</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Deck */}
      {pageItems.length > 0 ? (
        <div className="titles-grid">
          {pageItems.map((item) => {
            const isEquipped = item.id === equippedId && item.unlocked;
            return (
              <article key={item.id} className={SpotlightBadgeClass(item.tier, item.unlocked)}>
                <div className="title-card-top">
                  <span className={`title-tier-pill tier-${item.tier}`}>
                    #{String(item.order).padStart(3, '0')} · {item.tierLabel} · {item.difficultyLabel}
                  </span>
                  <span className={`title-lock-pill ${item.unlocked ? 'unlocked' : ''}`}>
                    {item.unlocked ? <Sparkles size={12} /> : <Lock size={12} />}
                    {item.unlocked
                      ? c('Đã đạt', 'Unlocked', '已解锁')
                      : c('Chưa mở', 'Locked', '未解锁')}
                  </span>
                </div>

                <h3 className="title-card-name">{item.title}</h3>
                <p className="title-card-motto">{item.motto}</p>

                <div className="title-card-how">
                  <small>{c('Cách đạt được', 'How to earn', '解锁方式')}</small>
                  <span>{item.howToEarn}</span>
                </div>

                <div className="title-card-progress-meta">
                  <span>
                    {item.current.toLocaleString(
                      locale === 'vi' ? 'vi-VN' : locale === 'zh' ? 'zh-CN' : 'en-US',
                    )}{' '}
                    /{' '}
                    {item.target.toLocaleString(
                      locale === 'vi' ? 'vi-VN' : locale === 'zh' ? 'zh-CN' : 'en-US',
                    )}
                  </span>
                  <strong>{item.progressPct}%</strong>
                </div>
                <div
                  className="explorer-progress-track small"
                  role="progressbar"
                  aria-valuenow={item.progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={item.title}
                >
                  <div className="explorer-progress-fill" style={{ width: `${item.progressPct}%` }} />
                </div>

                {item.unlocked ? (
                  <button
                    type="button"
                    className={`title-equip-btn ${isEquipped ? 'equipped' : ''}`}
                    onClick={() => onEquip(item.id)}
                  >
                    {isEquipped ? (
                      <>
                        <Check size={13} />
                        {c('Đang đeo trên hồ sơ', 'Equipped on profile', '已佩戴于档案')}
                      </>
                    ) : (
                      <>
                        <Award size={13} />
                        {c('Đeo danh hiệu này', 'Equip this title', '佩戴此头衔')}
                      </>
                    )}
                  </button>
                ) : (
                  <p className="title-locked-hint">
                    {c(
                      `Còn ${Math.max(0, 100 - item.progressPct)}% tiến độ để mở khóa`,
                      `${Math.max(0, 100 - item.progressPct)}% remaining to unlock`,
                      `还差 ${Math.max(0, 100 - item.progressPct)}% 即可解锁`,
                    )}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="explorer-topics-card">
          <p className="explorer-saved-empty">
            {c(
              'Không tìm thấy danh hiệu phù hợp. Hãy thử đổi từ khóa hoặc chọn lại bộ lọc độ khó.',
              'No titles match your current filter. Try another search term or difficulty tier.',
              '未找到匹配的头衔，请尝试更换搜索词或筛选难度阶梯。',
            )}
          </p>
        </div>
      )}

      {/* Bottom < > Pager */}
      {totalPages > 1 && (
        <div className="titles-bottom-pager">
          <button
            type="button"
            className="titles-arrow-btn large"
            onClick={prevPage}
            aria-label={c('Trang trước', 'Previous page', '上一页')}
          >
            <ChevronLeft size={18} />
            <span>{c('Lướt trước', 'Previous', '上一页')}</span>
          </button>
          <span className="titles-page-indicator">
            {c('Trang', 'Page', '第')} {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="titles-arrow-btn large"
            onClick={nextPage}
            aria-label={c('Trang sau', 'Next page', '下一页')}
          >
            <span>{c('Lướt tiếp', 'Next', '下一页')}</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Existing Challenge Badges */}
      {earnedBadges.length > 0 && (
        <section className="explorer-topics-card" aria-label={c('Huy hiệu thử thách', 'Challenge badges', '挑战徽章')}>
          <h3 className="explorer-section-title" style={{ fontSize: 17 }}>
            {c(
              `Huy hiệu thử thách đã đạt (${earnedBadges.length})`,
              `Earned Challenge Badges (${earnedBadges.length})`,
              `已获得的挑战徽章（${earnedBadges.length}）`,
            )}
          </h3>
          {earnedBadges.map((ch) => (
            <div key={ch.id} className="explorer-title-badge-row">
              <Sparkles size={18} />
              <div>
                <strong>{ch.badge}</strong>
                <p>{textFor(ch.translations, locale).title}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
