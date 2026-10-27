'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileJson, Check, Archive } from 'lucide-react';
import type { Heritage, Challenge, Locale } from '@/lib/types';
import { t, dateFormat } from '@/lib/i18n';
import { api, Status, errorText, Submit } from './ui';
type Report = {
  id: string;
  entry_id: string | null;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
};
type Audit = { id: number; actor_id: string | null; action: string; created_at: string };
export function Admin({
  locale,
  entries,
  challenges,
  reports,
  audit,
}: {
  locale: Locale;
  entries: Heritage[];
  challenges: Challenge[];
  reports: Report[];
  audit: Audit[];
}) {
  const router = useRouter(),
    [tab, setTab] = useState<'entries' | 'challenges' | 'reports' | 'audit'>('entries'),
    [editor, setEditor] = useState(''),
    [entity, setEntity] = useState<'heritage' | 'challenge'>('heritage'),
    [answer, setAnswer] = useState(''),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  function edit(data: unknown, type: 'heritage' | 'challenge') {
    setEntity(type);
    setAnswer('');
    setEditor(JSON.stringify(data, null, 2));
    setMessage('');
  }
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      let data;
      try {
        data = JSON.parse(editor);
      } catch {
        throw new Error('invalidInput');
      }
      if (entity === 'challenge') {
        if (answer === '') throw new Error('invalidInput');
        data.correct_option = Number(answer);
      }
      await api('/api/admin', { type: entity, data });
      setMessage(t(locale, 'success'));
      setError(false);
      setEditor('');
      router.refresh();
    } catch (e) {
      setMessage(errorText(locale, e));
      setError(true);
    } finally {
      setPending(false);
    }
  }
  async function moderate(id: string, status: 'resolved' | 'dismissed') {
    setPending(true);
    try {
      await api('/api/admin', { type: 'report', id, status });
      router.refresh();
    } catch (e) {
      setMessage(errorText(locale, e));
      setError(true);
    } finally {
      setPending(false);
    }
  }
  function add() {
    if (tab === 'entries') {
      const template = entries[0];
      edit(
        template
          ? { ...template, id: crypto.randomUUID(), slug: 'new-entry', name: '', status: 'draft' }
          : {
              slug: 'new-entry',
              name: '',
              kind: 'monument',
              region: '',
              translations: {
                vi: { summary: '', story: '', detail: '' },
                en: { summary: '', story: '', detail: '' },
                zh: { summary: '', story: '', detail: '' },
              },
              latitude: null,
              longitude: null,
              image: null,
              image_author: '',
              image_license: '',
              image_source: null,
              sources: [],
              status: 'draft',
              verification: 'reference',
            },
        'heritage',
      );
    } else {
      edit(
        {
          entry_id: entries[0]?.id || '',
          translations: {
            vi: { title: '', description: '', question: '', options: ['', '', '', ''] },
            en: { title: '', description: '', question: '', options: ['', '', '', ''] },
            zh: { title: '', description: '', question: '', options: ['', '', '', ''] },
          },
          correct_option: 0,
          points: 20,
          badge: '',
          status: 'draft',
          expires_at: null,
        },
        'challenge',
      );
    }
  }
  return (
    <>
      <div className="admin-tabs chips">
        {(['entries', 'challenges', 'reports', 'audit'] as const).map((key) => (
          <button
            className={`chip ${tab === key ? 'selected' : ''}`}
            key={key}
            onClick={() => {
              setTab(key);
              setEditor('');
            }}
          >
            {t(locale, key)}
          </button>
        ))}
      </div>
      <Status message={message} error={error} />
      {(tab === 'entries' || tab === 'challenges') && (
        <>
          <button className="button small" onClick={add}>
            <Plus size={16} />
            {t(locale, 'newEntry')}
          </button>
          <div className="admin-table">
            {(tab === 'entries' ? entries : challenges).map((item) => (
              <div className="admin-row" key={item.id}>
                <span>
                  <strong>{'name' in item ? item.name : item.translations[locale].title}</strong>
                  <small>{item.id}</small>
                </span>
                <span className="pill">
                  {t(locale, item.status as 'draft' | 'published' | 'archived')}
                </span>
                <button
                  className="button secondary small"
                  onClick={() => edit(item, tab === 'entries' ? 'heritage' : 'challenge')}
                >
                  <FileJson size={16} />
                  {t(locale, 'edit')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {editor && (
        <form className="admin-editor" onSubmit={submit}>
          <p>{t(locale, 'editorHint')}</p>
          {entity === 'challenge' && (
            <label>
              {t(locale, 'correctAnswer')}
              <select required value={answer} onChange={(e) => setAnswer(e.target.value)}>
                <option value="">{t(locale, 'choose')}</option>
                {['A', 'B', 'C', 'D'].map((label, i) => (
                  <option value={i} key={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label htmlFor="json-editor">{t(locale, 'jsonData')}</label>
          <textarea
            id="json-editor"
            rows={26}
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
            spellCheck={false}
          />
          <div className="entry-actions">
            <Submit pending={pending}>{t(locale, 'saveChanges')}</Submit>
            <button className="button secondary" type="button" onClick={() => setEditor('')}>
              {t(locale, 'cancel')}
            </button>
          </div>
          <Status message={message} error={error} />
        </form>
      )}
      {tab === 'reports' && (
        <div className="admin-table">
          {reports.map((r) => (
            <article className="report-row" key={r.id}>
              <div className="meta">
                {dateFormat(locale, r.created_at)} ·{' '}
                {entries.find((e) => e.id === r.entry_id)?.name || r.entry_id} ·{' '}
                {t(locale, r.status === 'open' ? 'openStatus' : r.status)}
              </div>
              <p>{r.reason}</p>
              {r.status === 'open' && (
                <div className="entry-actions">
                  <button
                    className="button small"
                    disabled={pending}
                    onClick={() => moderate(r.id, 'resolved')}
                  >
                    <Check size={16} />
                    {t(locale, 'resolve')}
                  </button>
                  <button
                    className="button secondary small"
                    disabled={pending}
                    onClick={() => moderate(r.id, 'dismissed')}
                  >
                    <Archive size={16} />
                    {t(locale, 'dismiss')}
                  </button>
                </div>
              )}
            </article>
          ))}
          {!reports.length && <p>{t(locale, 'empty')}</p>}
        </div>
      )}
      {tab === 'audit' && (
        <div className="admin-table">
          {audit.map((a) => (
            <div className="admin-row" key={a.id}>
              <code>{a.action}</code>
              <span>{dateFormat(locale, a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
