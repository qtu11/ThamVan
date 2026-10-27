'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import { api, Status, Submit, errorText } from './ui';
import { Captcha } from './captcha';
import { GoogleSignInButton } from './google-sign-in';
import type { MessageKey } from '@/lib/i18n';
export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
export function AuthForm({
  locale,
  mode,
  configured,
  googleEnabled,
  next,
  nonce,
  initialError,
}: {
  locale: Locale;
  mode: AuthMode;
  configured: boolean;
  googleEnabled: boolean;
  next: string;
  nonce?: string;
  initialError?: MessageKey;
}) {
  const router = useRouter(),
    [visible, setVisible] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(initialError ? t(locale, initialError) : ''),
    [error, setError] = useState(!!initialError),
    [captcha, setCaptcha] = useState(''),
    [captchaEpoch, setCaptchaEpoch] = useState(0);
  const googleMode = mode === 'login' || mode === 'register';
  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  async function googleSignIn() {
    setPending(true);
    setMessage('');
    try {
      const result = await api('/api/auth/google', { locale, next, captcha });
      window.location.assign(result.url);
    } catch (e) {
      setMessage(errorText(locale, e));
      setError(true);
      setCaptcha('');
      setCaptchaEpoch((n) => n + 1);
      setPending(false);
    }
  }
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('/api/auth', {
        action: mode,
        locale,
        email: form.get('email') || 'reset@account.local',
        password: form.get('password') || undefined,
        display_name: form.get('display_name') || undefined,
        consent: form.get('consent') === 'on',
        next,
        captcha,
      });
      if (result.redirect) {
        router.push(result.redirect);
        router.refresh();
      } else {
        setMessage(t(locale, 'authSent'));
        setError(false);
      }
    } catch (e) {
      setMessage(errorText(locale, e));
      setError(true);
      setCaptcha('');
      setCaptchaEpoch((n) => n + 1);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      {googleMode && (
        <div className="google-auth-section">
          <GoogleSignInButton
            locale={locale}
            enabled={googleEnabled && (!captchaRequired || !!captcha)}
            pending={pending}
            onClick={googleSignIn}
          />
          <p className="help-text">
            {t(locale, googleEnabled ? 'googleHint' : 'googleUnavailable')}
          </p>
          <Captcha key={captchaEpoch} onToken={setCaptcha} nonce={nonce} />
          <div className="auth-divider">
            <span>{t(locale, 'authOr')}</span>
          </div>
        </div>
      )}
      {mode === 'register' && (
        <label>
          {t(locale, 'displayName')}
          <input
            name="display_name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="nickname"
          />
        </label>
      )}
      {mode !== 'reset' && (
        <label>
          {t(locale, 'email')}
          <input type="email" name="email" required maxLength={254} autoComplete="email" />
        </label>
      )}
      {mode !== 'forgot' && (
        <label>
          {t(locale, 'password')}
          <span className="password-input">
            <input
              type={visible ? 'text' : 'password'}
              name="password"
              required
              minLength={mode === 'login' ? 1 : 12}
              maxLength={128}
              pattern={mode === 'login' ? undefined : '(?=.*[A-Za-z])(?=.*[0-9]).{12,128}'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={t(locale, visible ? 'hidePassword' : 'showPassword')}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </span>
          {mode !== 'login' && <small>{t(locale, 'passwordHint')}</small>}
        </label>
      )}
      {mode === 'login' && (
        <Link className="text-link forgot-link" href={`/${locale}/auth/forgot`}>
          {t(locale, 'forgot')}
        </Link>
      )}
      {mode === 'register' && (
        <>
          <label className="check-label">
            <input type="checkbox" name="consent" required />
            <span>{t(locale, 'consent')}</span>
          </label>
          <div className="legal-links">
            <Link href={`/${locale}/terms`} target="_blank">
              {t(locale, 'terms')}
            </Link>
            <Link href={`/${locale}/privacy`} target="_blank">
              {t(locale, 'privacy')}
            </Link>
          </div>
        </>
      )}
      {mode !== 'reset' && !googleMode && (
        <Captcha key={captchaEpoch} onToken={setCaptcha} nonce={nonce} />
      )}
      {!configured && <Status message={t(locale, 'notConfigured')} />}
      <Status message={message} error={error} />
      <Submit
        pending={pending}
        disabled={
          !configured ||
          (mode !== 'reset' && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captcha)
        }
      >
        {t(locale, mode === 'forgot' ? 'sendReset' : mode === 'reset' ? 'reset' : mode)}
        <ArrowRight size={17} />
      </Submit>
      <div className="auth-links">
        <Link href={`/${locale}/auth/${mode === 'login' ? 'register' : 'login'}`}>
          {t(locale, mode === 'login' ? 'register' : 'login')}
        </Link>
        <Link href={`/${locale}`}>{t(locale, 'skip')}</Link>
      </div>
    </form>
  );
}
