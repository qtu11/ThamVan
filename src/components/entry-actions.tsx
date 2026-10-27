'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Share2, Flag, X } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { api, Status, errorText } from './ui';
export function EntryActions({
  id,
  locale,
  signedIn,
  initialSaved,
}: {
  id: string;
  locale: Locale;
  signedIn: boolean;
  initialSaved: boolean;
}) {
  const router = useRouter(),
    dialog = useRef<HTMLDialogElement>(null);
  const [saved, setSaved] = useState(initialSaved),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  function authenticate() {
    router.push(`/${locale}/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  async function save() {
    if (!signedIn) {
      authenticate();
      return;
    }
    setPending(true);
    setMessage('');
    try {
      await api('/api/saved', { entry_id: id }, saved ? 'DELETE' : 'POST');
      setSaved(!saved);
      router.refresh();
    } catch (e) {
      setMessage(errorText(locale, e));
      setError(true);
    } finally {
      setPending(false);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage(t(locale, 'copied'));
      setError(false);
    } catch {
      setMessage(t(locale, 'error'));
      setError(true);
    }
  }
  async function report(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      await api('/api/reports', { entry_id: id, reason: data.get('reason') });
      dialog.current?.close();
      setMessage(t(locale, 'success'));
      setError(false);
    } catch (e) {
      setMessage(errorText(locale, e));
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="entry-actions">
        <button
          className={`button ${saved ? 'secondary' : ''}`}
          disabled={pending}
          aria-pressed={saved}
          onClick={save}
        >
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
          {t(locale, saved ? 'saved' : 'save')}
        </button>
        <button className="button secondary" onClick={share}>
          <Share2 size={17} />
          {t(locale, 'share')}
        </button>
        <button
          className="button quiet"
          onClick={() => (signedIn ? dialog.current?.showModal() : authenticate())}
        >
          <Flag size={16} />
          {t(locale, 'report')}
        </button>
      </div>
      <Status message={message} error={error} />
      <dialog ref={dialog} aria-labelledby="report-title" className="modal">
        <div className="modal-header">
          <h2 id="report-title">{t(locale, 'report')}</h2>
          <button
            className="icon-button"
            aria-label={t(locale, 'cancel')}
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <form onSubmit={report}>
          <label>
            {t(locale, 'reportReason')}
            <textarea name="reason" required minLength={10} maxLength={2000} rows={5} />
          </label>
          <Status message={error ? message : ''} error />
          <button className="button" disabled={pending}>
            {t(locale, pending ? 'loading' : 'send')}
          </button>
        </form>
      </dialog>
    </>
  );
}
