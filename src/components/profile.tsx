'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Download,
  LogOut,
  Trash2,
  Settings2,
  X,
  Footprints,
  Pencil,
  Languages,
  Award,
  Check,
} from 'lucide-react';
import type { Locale, Viewer } from '@/lib/types';
import { locales } from '@/lib/types';
import { t, localeName } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { api, Status, Submit, errorText } from './ui';
import { useDiscoveryPreferences } from './discovery';
import { Captcha } from './captcha';
import { GoogleSignInButton } from './google-sign-in';

export function ExplorerProfileHeader({
  locale,
  viewer,
  completedCount = 0,
  savedCount = 0,
}: {
  locale: Locale;
  viewer: Viewer | null;
  completedCount?: number;
  savedCount?: number;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const [activeTab, setActiveTab] = useState<'overview' | 'titles' | 'history' | 'settings'>(
    'overview',
  );
  const [editingName, setEditingName] = useState(false);
  const [guestName, setGuestName] = useState(
    viewer?.profile.display_name || c('Khách khám phá', 'Guest Explorer', '探索访客'),
  );
  const [draftName, setDraftName] = useState(guestName);

  const topics = [
    {
      label: c('Di tích lịch sử', 'Historical monuments', '历史古迹'),
      done: 0,
      total: 35,
    },
    {
      label: c('Tín ngưỡng/Tôn giáo', 'Beliefs & religion', '信仰与宗教'),
      done: 0,
      total: 33,
    },
    {
      label: c('Kiến trúc nghệ thuật', 'Architectural art', '建筑艺术'),
      done: 2,
      total: 24,
    },
    {
      label: c('Thắng cảnh', 'Scenic landscapes', '名胜景观'),
      done: 0,
      total: 4,
    },
    {
      label: c('Làng nghề', 'Craft villages', '传统工艺村'),
      done: 0,
      total: 4,
    },
  ];

  const quests = [
    {
      label: c('Nhà thám hiểm', 'City explorer', '城市探险家'),
      done: 1,
      total: 5,
    },
    {
      label: c('Mắt tinh tường', 'Sharp eye', '敏锐之眼'),
      done: 1,
      total: 3,
    },
    {
      label: c(
        'Giải mã dấu ấn kiến trúc Sài Gòn',
        'Decoding Saigon architectural marks',
        '解码西贡建筑印记',
      ),
      done: 1,
      total: 6,
    },
    {
      label: c(
        'Săn chi tiết mái ngói & hoa văn',
        'Hunting roof tiles & motifs',
        '寻访屋瓦与纹样细节',
      ),
      done: 1,
      total: 2,
    },
  ];

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
            <h1>{viewer?.profile.display_name || guestName}</h1>
            <p className="explorer-rank">
              {c('Người Qua Đường', 'Passerby Explorer', '路过探索者')}
            </p>
          </div>
        </div>

        <span className="explorer-lang-pill">
          <Languages size={14} />
          {locale.toUpperCase()}
        </span>
      </div>

      {/* Level & XP Progress Card */}
      <div className="explorer-xp-card">
        <div className="explorer-xp-top">
          <strong>{c('Cấp 1', 'Level 1', '等级 1')}</strong>
          <span>
            {c(
              '20/100 XP tới cấp tiếp theo',
              '20/100 XP to next level',
              '距离下一级 20/100 XP',
            )}
          </span>
        </div>

        <div
          className="explorer-progress-track"
          role="progressbar"
          aria-valuenow={20}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={c('Tiến độ cấp độ', 'Level progress', '等级进度')}
        >
          <div className="explorer-progress-fill" style={{ width: '20%' }} />
        </div>

        {editingName ? (
          <div className="explorer-inline-edit">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={60}
              aria-label={t(locale, 'displayName')}
            />
            <button
              type="button"
              className="explorer-edit-btn"
              onClick={() => {
                if (draftName.trim()) setGuestName(draftName.trim());
                setEditingName(false);
              }}
            >
              <Check size={13} />
              {t(locale, 'saveChanges')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="explorer-edit-btn"
            onClick={() => {
              setDraftName(guestName);
              setEditingName(true);
            }}
          >
            <Pencil size={13} />
            {c('Chỉnh sửa hồ sơ', 'Edit profile', '编辑个人资料')}
          </button>
        )}
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="explorer-stats-grid">
        <div className="explorer-stat-card">
          <strong>{completedCount}</strong>
          <span>{c('Thử thách', 'Challenges', '挑战')}</span>
        </div>
        <div className="explorer-stat-card">
          <strong>{Math.max(2, savedCount)}</strong>
          <span>{c('Đã khám phá', 'Explored', '已探索')}</span>
        </div>
        <div className="explorer-stat-card">
          <strong>1</strong>
          <span>{c('Danh hiệu', 'Titles', '头衔')}</span>
        </div>
        <div className="explorer-stat-card">
          <strong>{Math.max(1, completedCount)}</strong>
          <span>{c('Huy hiệu', 'Badges', '徽章')}</span>
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
              <strong>{c('Người Qua Đường', 'Passerby Explorer', '路过探索者')}</strong>
              <p>
                {c(
                  'Danh hiệu khởi đầu dành cho người bắt đầu bước chân khám phá di sản Sài Gòn.',
                  'Starter title for explorers beginning their Saigon heritage walks.',
                  '授予开启西贡遗产探索之旅的初始头衔。',
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="explorer-topics-card">
          <p className="explorer-saved-empty">
            {c(
              'Đã xem 2 công trình kiến trúc nghệ thuật tại Quận 1 (Bưu điện Trung tâm Sài Gòn, Nhà hát Thành phố).',
              'Explored 2 architectural heritage landmarks in District 1.',
              '已探索第一郡 2 处建筑艺术遗产。',
            )}
          </p>
        </div>
      )}

      {/* Cultural Topics Learned */}
      <section className="explorer-section">
        <h2 className="explorer-section-title">
          {c(
            'Chủ đề văn hóa đã tìm hiểu',
            'Cultural topics explored',
            '已了解的文化主题',
          )}
        </h2>
        <div className="explorer-topics-card">
          {topics.map((item) => {
            const pct = Math.round((item.done / item.total) * 100);
            return (
              <div key={item.label} className="explorer-topic-row">
                <div className="explorer-topic-meta">
                  <span>{item.label}</span>
                  <span className="explorer-topic-count">
                    {item.done}/{item.total}
                  </span>
                </div>
                <div className="explorer-progress-track small">
                  <div
                    className="explorer-progress-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active & Completed Quests */}
      <section className="explorer-section">
        <h2 className="explorer-section-title">
          {c(
            'Thử thách đang làm & đã xong',
            'Active & completed challenges',
            '进行中与已完成的挑战',
          )}
        </h2>
        <div className="explorer-quest-list">
          {quests.map((q) => {
            const pct = Math.round((q.done / q.total) * 100);
            return (
              <div key={q.label} className="explorer-quest-card">
                <div className="explorer-topic-meta">
                  <strong>{q.label}</strong>
                  <span className="explorer-topic-count">
                    {q.done}/{q.total}
                  </span>
                </div>
                <div className="explorer-progress-track small">
                  <div
                    className="explorer-progress-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Saved for Later */}
      <section className="explorer-section">
        <h2 className="explorer-section-title">
          {c('Đã lưu để đi sau', 'Saved for later', '已保存待访')}
        </h2>
        <p className="explorer-saved-empty">
          {c(
            'Chưa lưu địa điểm nào. Bấm “Lưu vào hành trình” trên trang chi tiết.',
            'No saved places yet. Tap “Save to journey” on any place detail page.',
            '尚未保存任何地点。可在详情页点击“保存到旅程”。',
          )}
        </p>
      </section>
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
              value={name}
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
      await api('/api/auth', { action: 'logout', locale, email: viewer.email });
      router.push(`/${locale}`);
      router.refresh();
    } catch (e) {
      setMessage(errorText(locale, e));
    } finally {
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
      router.push(`/${locale}`);
      router.refresh();
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
