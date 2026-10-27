'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { TERMS_VERSION } from '@/lib/auth-policy';
import { api, Status, Submit, errorText } from './ui';
export function ConsentForm({
  locale,
  next,
  name,
  email,
}: {
  locale: Locale;
  next: string;
  name: string;
  email: string;
}) {
  const router = useRouter(),
    [accepted, setAccepted] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState('');
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const result = await api('/api/auth/consent', {
        locale,
        next,
        display_name: data.get('display_name'),
        consent: accepted,
        terms_version: TERMS_VERSION,
      });
      router.replace(result.redirect);
      router.refresh();
    } catch (error) {
      setMessage(errorText(locale, error));
    } finally {
      setPending(false);
    }
  }
  async function logout() {
    setPending(true);
    try {
      await api('/api/auth', { action: 'logout', locale, email });
      router.replace(`/${locale}`);
      router.refresh();
    } catch (error) {
      setMessage(errorText(locale, error));
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <p className="help-text">{email}</p>
      <label>
        {t(locale, 'displayName')}
        <input
          name="display_name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={80}
          autoComplete="nickname"
        />
      </label>
      <div className="legal-links">
        <Link href={`/${locale}/terms`} target="_blank">
          {t(locale, 'terms')}
        </Link>
        <Link href={`/${locale}/privacy`} target="_blank">
          {t(locale, 'privacy')}
        </Link>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          required
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>{t(locale, 'consent')}</span>
      </label>
      <Status message={message} error />
      <Submit pending={pending} disabled={!accepted}>
        {t(locale, 'completeAccount')}
      </Submit>
      <button className="button secondary" type="button" onClick={logout} disabled={pending}>
        {t(locale, 'logout')}
      </button>
    </form>
  );
}
