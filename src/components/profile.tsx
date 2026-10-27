'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Download, LogOut, Trash2, Settings2, X } from 'lucide-react';
import type { Locale, Viewer } from '@/lib/types';
import { locales } from '@/lib/types';
import { t, localeName } from '@/lib/i18n';
import { api, Status, Submit, errorText } from './ui';
import { useDiscoveryPreferences } from './discovery';
import { Captcha } from './captcha';
import { GoogleSignInButton } from './google-sign-in';
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
    <section className="settings-card">
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
