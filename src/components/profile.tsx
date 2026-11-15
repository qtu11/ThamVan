'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Bell,
  Download,
  LogOut,
  MapPin,
  Trash2,
  Settings2,
  X,
  Footprints,
  Pencil,
  Award,
  Check,
  Sparkles,
} from 'lucide-react';
import type { Challenge, Heritage, Kind, Locale, Progress, Saved, Viewer } from '@/lib/types';
import { locales, textFor } from '@/lib/types';
import { t, localeName, dateFormat } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { levelForXp, totalEarnedXp } from '@/lib/xp';
import { api, Status, Submit, errorText } from './ui';
import { useDiscoveryPreferences } from './discovery';
import { Captcha } from './captcha';
import { GoogleSignInButton } from './google-sign-in';

type TopicProgress = { kind: Kind; done: number; total: number };

const GUEST_NAME_KEY = 'tv-guest-name';

function subscribeGuestName(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('tv-guest-name', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('tv-guest-name', callback);
  };
}

function rankForLevel(level: number, locale: Locale) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  if (level >= 10) {
    return {
      title: c('Giám Tuyển Thực Địa', 'Chief Field Curator', '首席实地策展人'),
      desc: c(
        'Học giả am tường từng lớp ký ức, kiến trúc và tư liệu Sài Gòn.',
        'Veteran researcher fluent in Saigon architectural and cultural archives.',
        '熟稔西贡建筑脉络与城市记忆文献的资深策展人。',
      ),
    };
  }
  if (level >= 6) {
    return {
      title: c('Biên Khảo Di Sản', 'Heritage Researcher', '遗产考据者'),
      desc: c(
        'Người ghi chép bền bỉ với nhiều chặng thực địa và thử thách đã hoàn tất.',
        'Dedicated field researcher with verified walks and completed challenges.',
        '持续记录城市遗迹并完成多项实地考据挑战的探索者。',
      ),
    };
  }
  if (level >= 3) {
    return {
      title: c('Người Đọc Phố', 'Street Archivist', '街巷档案人'),
      desc: c(
        'Đã quen thuộc với các khu phố lịch sử và tư liệu di sản tại Sài Gòn.',
        'Familiar with Saigon historic quarters and archival field records.',
        '熟悉西贡历史街区与城市档案线索的同行者。',
      ),
    };
  }
  return {
    title: c('Người Chép Ký Ức', 'Memory Chronicler', '城市记忆记录者'),
    desc: c(
      'Cộng tác viên đồng hành ghi dấu ký ức, công trình và nếp sống đô thị Sài Gòn.',
      'Field chronicler documenting Saigon landmarks, architecture, and living heritage.',
      '记录西贡城市地标、建筑与生活印记的同行记录者。',
    ),
  };
}

export function ExplorerProfileHeader({
  locale,
  viewer,
  completedCount = 0,
  savedCount = 0,
  visitedCount = 0,
  progress = [],
  topicTotals = [],
  savedEntries = [],
  savedRecords = [],
  challenges = [],
}: {
  locale: Locale;
  viewer: Viewer | null;
  completedCount?: number;
  savedCount?: number;
  visitedCount?: number;
  progress?: Progress[];
  topicTotals?: TopicProgress[];
  savedEntries?: Heritage[];
  savedRecords?: Saved[];
  challenges?: Challenge[];
}) {
  const router = useRouter();
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const [activeTab, setActiveTab] = useState<'overview' | 'titles' | 'history' | 'settings'>(
    'overview',
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const storedGuestName = useSyncExternalStore(
    subscribeGuestName,
    () => {
      try {
        return localStorage.getItem(GUEST_NAME_KEY) || '';
      } catch {
        return '';
      }
    },
    () => '',
  );
  const [viewerNameOverride, setViewerNameOverride] = useState<string | null>(null);
  const fallbackName = c('Khách khám phá', 'Guest Explorer', '探索访客');
  const defaultName = viewer
    ? viewerNameOverride ?? (viewer.profile.display_name || fallbackName)
    : storedGuestName || fallbackName;
  const [draftName, setDraftName] = useState(defaultName);
  const xp = totalEarnedXp(progress);
  const xpState = levelForXp(xp);
  const rank = rankForLevel(xpState.level, locale);

  const earnedBadges = challenges.filter((ch) =>
    progress.some((p) => p.challenge_id === ch.id && p.completed_at),
  );
  const totalTitlesCount = 1 + earnedBadges.length;

  const visitedItems = savedRecords
    .filter((s) => s.visited_at)
    .map((s) => ({
      record: s,
      entry: savedEntries.find((e) => e.id === s.entry_id),
    }))
    .filter((item): item is { record: Saved; entry: Heritage } => Boolean(item.entry));

  const savedForLater = savedEntries.filter((e) => {
    const rec = savedRecords.find((s) => s.entry_id === e.id);
    return !rec?.visited_at;
  });

  async function saveInlineName() {
    const next = draftName.trim();
    if (next.length < 2) {
      setNameFeedback({
        text: c(
          'Tên hiển thị cần ít nhất 2 ký tự.',
          'Display name must be at least 2 characters.',
          '显示名称至少需要 2 个字符。',
        ),
        error: true,
      });
      return;
    }
    setNameFeedback(null);
    if (viewer) {
      setSavingName(true);
      try {
        await api(
          '/api/profile',
          {
            display_name: next,
            locale: viewer.profile.locale,
            radius_km: viewer.profile.radius_km,
            notifications: viewer.profile.notifications,
          },
          'PATCH',
        );
        setViewerNameOverride(next);
        setEditingName(false);
        setNameFeedback({ text: t(locale, 'success'), error: false });
        router.refresh();
      } catch (e) {
        setNameFeedback({ text: errorText(locale, e), error: true });
      } finally {
        setSavingName(false);
      }
      return;
    }
    try {
      localStorage.setItem(GUEST_NAME_KEY, next);
      window.dispatchEvent(new Event('tv-guest-name'));
    } catch {
      // Ignore unavailable storage
    }
    setEditingName(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      if (viewer) {
        await api('/api/auth', {
          action: 'logout',
          locale,
          email: viewer.email || 'logout@account.local',
        });
      }
    } catch {
      // Ignored
    } finally {
      window.location.assign(`/${locale}/auth/login`);
    }
  }

  function handleTabSelect(tab: 'overview' | 'titles' | 'history' | 'settings') {
    setActiveTab(tab);
    if (tab === 'settings') {
      document
        .getElementById('profile-settings-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="explorer-profile-shell">
      {/* Top Identity Row */}
      <div className="explorer-header-row">
        <div className="explorer-identity">
          <div className="explorer-avatar" aria-hidden="true">
            <Footprints size={28} />
          </div>
          <div className="explorer-title-block">
            <h1>{defaultName}</h1>
            <p className="explorer-rank">{rank.title}</p>
          </div>
        </div>

        <button
          type="button"
          className="explorer-logout-btn"
          onClick={handleLogout}
          disabled={loggingOut}
          title={t(locale, 'logout')}
          aria-label={t(locale, 'logout')}
        >
          <LogOut size={14} />
          <span>{t(locale, 'logout')}</span>
        </button>
      </div>

      {/* Level & XP Progress Card */}
      <div className="explorer-xp-card">
        <div className="explorer-xp-top">
          <strong>
            {t(locale, 'levelOf')} {xpState.level}
          </strong>
          <span>
            <Sparkles size={13} />
            {xp} XP ·{' '}
            {xpState.toNext} {c('XP tới cấp kế tiếp', 'XP to next level', 'XP 距离下一级')}
          </span>
        </div>

        <div
          className="explorer-progress-track"
          role="progressbar"
          aria-valuenow={xpState.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={c('Tiến độ cấp độ', 'Level progress', '等级进度')}
        >
          <div className="explorer-progress-fill" style={{ width: `${xpState.progress}%` }} />
        </div>

        {editingName ? (
          <div className="explorer-inline-edit">
            <input
              type="text"
              value={draftName ?? ''}
              onChange={(e) => setDraftName(e.target.value)}
              minLength={2}
              maxLength={60}
              disabled={savingName}
              aria-label={t(locale, 'displayName')}
            />
            <button
              type="button"
              className="explorer-edit-btn"
              disabled={savingName}
              onClick={saveInlineName}
            >
              <Check size={13} />
              {t(locale, savingName ? 'loading' : 'saveChanges')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="explorer-edit-btn"
            onClick={() => {
              setDraftName(defaultName ?? '');
              setNameFeedback(null);
              setEditingName(true);
            }}
          >
            <Pencil size={13} />
            {c('Chỉnh sửa tên hiển thị', 'Edit display name', '修改显示名称')}
          </button>
        )}
        {nameFeedback && (
          <p
            className={`explorer-inline-status ${nameFeedback.error ? 'error' : ''}`}
            role="status"
          >
            {nameFeedback.text}
          </p>
        )}
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="explorer-stats-grid">
        <div className="explorer-stat-card">
          <strong>{completedCount}</strong>
          <span>{c('Thử thách', 'Challenges', '挑战')}</span>
        </div>
        <div className="explorer-stat-card">
          <strong>
            {visitedCount > 0 && savedCount > 0
              ? `${visitedCount} / ${savedCount}`
              : visitedCount > 0
                ? visitedCount
                : savedCount}
          </strong>
          <span>
            {visitedCount > 0 && savedCount > 0
              ? c('Đã ghé · Đã lưu', 'Visited · Saved', '已访 · 已存')
              : visitedCount > 0
                ? c('Đã ghé thực tế', 'Visited', '已实地到访')
                : c('Đã lưu hành trình', 'Saved', '已保存')}
          </span>
        </div>
        <div className="explorer-stat-card">
          <strong>{totalTitlesCount}</strong>
          <span>{c('Danh hiệu', 'Titles', '头衔')}</span>
        </div>
        <div className="explorer-stat-card explorer-stat-xp">
          <strong>
            <Sparkles size={16} />
            {xp} XP
          </strong>
          <span>{c('XP của bạn', 'Your XP', '你的 XP')}</span>
        </div>
      </div>

      {/* 4 Segmented Tabs */}
      <div className="explorer-tabs" role="tablist" aria-label={t(locale, 'profile')}>
        {(
          [
            ['overview', c('Tổng quan', 'Overview', '概览')],
            ['titles', c('Danh hiệu', 'Titles', '头衔')],
            ['history', c('Lịch sử', 'History', '历史')],
            ['settings', c('Cài đặt', 'Settings', '设置')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={`explorer-tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => handleTabSelect(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'titles' && (
        <div className="explorer-topics-card">
          <div className="explorer-title-badge-row">
            <Award size={22} />
            <div>
              <strong>{rank.title}</strong>
              <p>{rank.desc}</p>
            </div>
          </div>
          {earnedBadges.length > 0 &&
            earnedBadges.map((ch) => (
              <div key={ch.id} className="explorer-title-badge-row">
                <Sparkles size={20} />
                <div>
                  <strong>{ch.badge}</strong>
                  <p>{textFor(ch.translations, locale).title}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="explorer-topics-card">
          {completedCount > 0 || visitedItems.length > 0 ? (
            <div className="explorer-saved-list">
              {completedCount > 0 && (
                <div className="explorer-saved-card">
                  <strong>
                    {c(
                      `Hoàn thành ${completedCount} thử thách`,
                      `Completed ${completedCount} challenges`,
                      `已完成 ${completedCount} 项挑战`,
                    )}
                  </strong>
                  <small>{xp} XP</small>
                </div>
              )}
              {visitedItems.slice(0, 6).map(({ record, entry }) => (
                <Link
                  key={`${record.entry_id}-${record.visited_at}`}
                  href={`/${locale}/explore/${entry.slug}`}
                  className="explorer-saved-card"
                >
                  <strong>{entry.name}</strong>
                  <small>
                    <MapPin size={12} />
                    {entry.region} · {record.visited_at ? dateFormat(locale, record.visited_at) : ''}
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="explorer-saved-empty">
              {c(
                'Chưa có lượt ghé thực địa hoặc thử thách hoàn thành. Khám phá một địa danh để ghi dấu nhật ký đầu tiên.',
                'No field visits or completed challenges yet. Explore a landmark to record your first entry.',
                '暂无实地打卡或完成挑战记录。前往探索地标即可留下第一条档案。',
              )}
            </p>
          )}
        </div>
      )}

      {/* Cultural Topics Learned (Real Distribution) */}
      {activeTab === 'overview' && (
        <>
          {topicTotals.length > 0 && (
            <section className="explorer-section">
              <h2 className="explorer-section-title">
                {c(
                  'Chủ đề văn hóa đã lưu & khám phá',
                  'Cultural archive coverage',
                  '文化主题档案分布',
                )}
              </h2>
              <div className="explorer-topics-card">
                {topicTotals.map((item) => {
                  const pct =
                    item.total > 0 ? Math.min(100, Math.round((item.done / item.total) * 100)) : 0;
                  return (
                    <Link
                      key={item.kind}
                      href={`/${locale}/explore?kind=${item.kind}`}
                      className="explorer-topic-link"
                    >
                      <div className="explorer-topic-row">
                        <div className="explorer-topic-meta">
                          <span>{t(locale, item.kind)}</span>
                          <span className="explorer-topic-count">
                            {item.done}/{item.total}
                          </span>
                        </div>
                        <div className="explorer-progress-track small">
                          <div className="explorer-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Active & Completed Quests (Real Challenges) */}
          <section className="explorer-section">
            <div className="explorer-section-head">
              <h2 className="explorer-section-title">
                {c(
                  'Thử thách thực địa',
                  'Field challenges',
                  '实地探索挑战',
                )}
              </h2>
              <Link className="text-link" href={`/${locale}/challenges`}>
                {t(locale, 'challenges')} <ArrowUpRight size={15} />
              </Link>
            </div>
            {challenges.length > 0 ? (
              <div className="explorer-quest-list">
                {challenges.slice(0, 4).map((ch) => {
                  const prog = progress.find((p) => p.challenge_id === ch.id);
                  const done = prog?.completed_at ? 1 : 0;
                  const pct = done ? 100 : prog ? 40 : 0;
                  return (
                    <Link
                      key={ch.id}
                      href={`/${locale}/challenges#${ch.id}`}
                      className="explorer-quest-card"
                    >
                      <div className="explorer-topic-meta">
                        <strong>{textFor(ch.translations, locale).title}</strong>
                        <span className="explorer-topic-count">
                          {done ? t(locale, 'completed') : `${ch.points} XP`}
                        </span>
                      </div>
                      <div className="explorer-progress-track small">
                        <div className="explorer-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="explorer-saved-empty">
                {c(
                  'Đăng nhập để tham gia hệ thống thử thách kiến trúc và tích lũy XP.',
                  'Sign in to participate in architectural field challenges and earn XP.',
                  '登录后即可参与建筑实地挑战并累积 XP。',
                )}
              </p>
            )}
          </section>

          {/* Saved for Later */}
          <section className="explorer-section">
            <div className="explorer-section-head">
              <h2 className="explorer-section-title">
                {c('Đã lưu để đi sau', 'Saved for later', '已保存待访')}
              </h2>
              {savedEntries.length > 0 && (
                <Link className="text-link" href={`/${locale}/journey`}>
                  {t(locale, 'journey')} <ArrowUpRight size={15} />
                </Link>
              )}
            </div>
            {savedForLater.length > 0 ? (
              <div className="explorer-saved-list">
                {savedForLater.slice(0, 6).map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/${locale}/explore/${entry.slug}`}
                    className="explorer-saved-card"
                  >
                    <strong>{entry.name}</strong>
                    <small>
                      <MapPin size={12} />
                      {entry.address || entry.region}
                    </small>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="explorer-saved-empty">
                {c(
                  'Chưa có điểm chờ ghé. Bấm “Lưu hành trình” trên trang chi tiết bất kỳ địa danh nào.',
                  'No places queued yet. Tap “Save journey” on any place detail page.',
                  '暂无待访地点。可在任意地点档案页点击“保存旅程”。',
                )}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function Preferences({ locale, viewer }: { locale: Locale; viewer: Viewer | null }) {
  const router = useRouter(),
    { radius, notifications, store, ready } = useDiscoveryPreferences(viewer?.profile),
    [name, setName] = useState(viewer?.profile.display_name || ''),
    [language, setLanguage] = useState(locale),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      if (viewer)
        await api(
          '/api/profile',
          { display_name: name, locale: language, radius_km: radius, notifications },
          'PATCH',
        );
      store(radius, notifications);
      document.cookie = `tv-locale=${language};path=/;max-age=31536000;SameSite=Lax`;
      setMessage(t(language, 'success'));
      setError(false);
      if (language !== locale) router.push(`/${language}/profile`);
      router.refresh();
    } catch (e) {
      setMessage(errorText(locale, e));
      setError(true);
    } finally {
      setPending(false);
    }
  }
  async function enable() {
    if (typeof Notification === 'undefined') {
      setMessage(t(locale, 'notificationsDenied'));
      setError(true);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      store(radius, true);
    } else {
      store(radius, false);
      setMessage(t(locale, 'notificationsDenied'));
      setError(true);
    }
  }
  return (
    <section className="settings-card" id="profile-settings-section">
      <h2>
        <Settings2 size={22} />
        {t(locale, 'settings')}
      </h2>
      <form onSubmit={save}>
        {viewer && (
          <label>
            {t(locale, 'displayName')}
            <input
              value={name ?? ''}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
          </label>
        )}
        <label>
          {t(locale, 'language')}
          <select value={language} onChange={(e) => setLanguage(e.target.value as Locale)}>
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeName[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="radius-field">
          <span>
            {t(locale, 'radius')}
            <b>{radius} km</b>
          </span>
          <input
            type="range"
            min={3}
            max={10}
            disabled={!ready}
            value={radius}
            onChange={(e) => store(Number(e.target.value))}
          />
        </label>
        <div className="notification-setting">
          <label className="check-label">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => {
                if (e.target.checked) enable();
                else store(radius, false);
              }}
            />
            <span>
              <Bell size={17} />
              {t(locale, 'notifications')}
            </span>
          </label>
          <p className="help-text">{t(locale, 'notificationNote')}</p>
        </div>
        <Status message={message} error={error} />
        <Submit pending={pending} disabled={!ready}>
          {t(locale, 'saveChanges')}
        </Submit>
      </form>
    </section>
  );
}
export function AccountControls({
  locale,
  viewer,
  nonce,
  googleEnabled,
}: {
  locale: Locale;
  viewer: Viewer;
  nonce?: string;
  googleEnabled: boolean;
}) {
  const router = useRouter(),
    dialog = useRef<HTMLDialogElement>(null),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [captcha, setCaptcha] = useState(''),
    [captchaEpoch, setCaptchaEpoch] = useState(0);
  const googleAccount = viewer.providers.includes('google');
  async function reauthenticate() {
    setPending(true);
    setMessage('');
    try {
      const result = await api('/api/auth/google', { locale, next: `/${locale}/profile`, captcha });
      window.location.assign(result.url);
    } catch (e) {
      setMessage(errorText(locale, e));
      setCaptcha('');
      setCaptchaEpoch((n) => n + 1);
      setPending(false);
    }
  }
  async function logout() {
    setPending(true);
    try {
      await api('/api/auth', {
        action: 'logout',
        locale,
        email: viewer.email || 'logout@account.local',
      });
      window.location.assign(`/${locale}/auth/login`);
    } catch (e) {
      setMessage(errorText(locale, e));
      setPending(false);
    }
  }
  async function exportData() {
    setPending(true);
    try {
      const data = await api('/api/account/export', {});
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tham-van-data.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setMessage(errorText(locale, e));
    } finally {
      setPending(false);
    }
  }
  async function deleteAccount(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/api/account/delete', {
        email: form.get('email'),
        password: form.get('password') || undefined,
        method: googleAccount ? 'google' : 'password',
        confirmation: form.get('confirmation') || undefined,
        captcha,
      });
      dialog.current?.close();
      window.location.assign(`/${locale}/auth/login`);
    } catch (e) {
      setMessage(errorText(locale, e));
      setCaptcha('');
      setCaptchaEpoch((n) => n + 1);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="settings-card">
      <h2>{t(locale, 'account')}</h2>
      <div className="account-links">
        <button onClick={exportData} disabled={pending}>
          <Download size={18} />
          {t(locale, 'exportData')}
        </button>
        <button onClick={logout} disabled={pending}>
          <LogOut size={18} />
          {t(locale, 'logout')}
        </button>
        <button onClick={() => dialog.current?.showModal()} className="danger-text">
          <Trash2 size={18} />
          {t(locale, 'deleteAccount')}
        </button>
        {viewer.admin && <Link href={`/${locale}/admin`}>{t(locale, 'admin')}</Link>}
      </div>
      <Status message={message} error />
      <dialog ref={dialog} className="modal" aria-labelledby="delete-title">
        <div className="modal-header">
          <h2 id="delete-title">{t(locale, 'deleteAccount')}</h2>
          <button
            className="icon-button"
            onClick={() => dialog.current?.close()}
            aria-label={t(locale, 'cancel')}
          >
            <X />
          </button>
        </div>
        <p>{t(locale, googleAccount ? 'deleteGoogleHint' : 'deleteHint')}</p>
        <form onSubmit={deleteAccount}>
          <label>
            {t(locale, 'email')}
            <input type="email" name="email" required autoComplete="email" />
          </label>
          {googleAccount ? (
            <>
              <GoogleSignInButton
                locale={locale}
                enabled={
                  googleEnabled && (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !!captcha)
                }
                pending={pending}
                onClick={reauthenticate}
                label={t(locale, 'reauthGoogle')}
              />
              <label>
                {t(locale, 'deleteConfirmation')}
                <input name="confirmation" required pattern="DELETE" autoComplete="off" />
              </label>
            </>
          ) : (
            <label>
              {t(locale, 'password')}
              <input
                type="password"
                name="password"
                required
                maxLength={128}
                autoComplete="current-password"
              />
            </label>
          )}
          <Captcha key={captchaEpoch} onToken={setCaptcha} nonce={nonce} />
          <Status message={message} error />
          <button
            className="button terracotta"
            disabled={pending || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captcha)}
          >
            {t(locale, pending ? 'loading' : 'deleteAccount')}
          </button>
        </form>
      </dialog>
    </section>
  );
}
