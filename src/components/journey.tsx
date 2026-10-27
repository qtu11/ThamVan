'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Check, Trash2 } from 'lucide-react';
import type { Saved, Heritage, Locale } from '@/lib/types';
import { t, dateFormat } from '@/lib/i18n';
import { api, Photo, Status, errorText, Empty } from './ui';
function JourneyItem({ saved, entry, locale }: { saved: Saved; entry: Heritage; locale: Locale }) {
  const router = useRouter(),
    [group, setGroup] = useState(saved.collection),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState('');
  async function mutate(method: string, data: object = {}) {
    setPending(true);
    setMessage('');
    try {
      await api('/api/saved', { entry_id: entry.id, ...data }, method);
      router.refresh();
    } catch (e) {
      setMessage(errorText(locale, e));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="journey-item">
      <Link href={`/${locale}/explore/${entry.slug}`}>
        <Photo entry={entry} />
      </Link>
      <div className="journey-copy">
        <span className="meta">
          <MapPin size={13} />
          {entry.region}
        </span>
        <h2>
          <Link href={`/${locale}/explore/${entry.slug}`}>{entry.name}</Link>
        </h2>
        <p className="help-text">
          {t(locale, 'saved')}: {dateFormat(locale, saved.saved_at)}
          {saved.visited_at &&
            ` · ${t(locale, 'visited')}: ${dateFormat(locale, saved.visited_at)}`}
        </p>
        <form
          className="collection-form"
          onSubmit={(e) => {
            e.preventDefault();
            mutate('PATCH', { collection: group });
          }}
        >
          <label className="sr-only" htmlFor={`group-${entry.id}`}>
            {t(locale, 'collection')}
          </label>
          <input
            id={`group-${entry.id}`}
            value={group}
            maxLength={80}
            onChange={(e) => setGroup(e.target.value)}
            placeholder={t(locale, 'collection')}
          />
          <button className="icon-button" aria-label={t(locale, 'saveChanges')} disabled={pending}>
            <Check size={18} />
          </button>
        </form>
        <div className="entry-actions">
          <button
            className="button secondary small"
            disabled={pending}
            onClick={() => mutate('PATCH', { visited: !saved.visited_at })}
          >
            {t(locale, saved.visited_at ? 'unvisit' : 'markVisited')}
          </button>
          <button
            className="button quiet small"
            disabled={pending}
            onClick={() => mutate('DELETE')}
          >
            <Trash2 size={15} />
            {t(locale, 'remove')}
          </button>
        </div>
        <Status message={message} error />
      </div>
    </article>
  );
}
export function Journey({
  saved,
  entries,
  locale,
}: {
  saved: Saved[];
  entries: Heritage[];
  locale: Locale;
}) {
  const [filter, setFilter] = useState('all');
  const groups = [...new Set(saved.map((s) => s.collection).filter(Boolean))];
  const filtered = saved.filter(
    (s) => filter === 'all' || (filter === 'visited' ? !!s.visited_at : s.collection === filter),
  );
  return (
    <>
      <div className="chips">
        <button
          className={`chip ${filter === 'all' ? 'selected' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t(locale, 'savedPlaces')} · {saved.length}
        </button>
        <button
          className={`chip ${filter === 'visited' ? 'selected' : ''}`}
          onClick={() => setFilter('visited')}
        >
          {t(locale, 'visited')} · {saved.filter((s) => s.visited_at).length}
        </button>
        {groups.map((g) => (
          <button
            key={g}
            className={`chip ${filter === g ? 'selected' : ''}`}
            onClick={() => setFilter(g)}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="journey-list">
        {filtered.map((s) => {
          const e = entries.find((e) => e.id === s.entry_id);
          return e ? (
            <JourneyItem
              key={`${s.entry_id}-${s.collection}-${s.visited_at}`}
              saved={s}
              entry={e}
              locale={locale}
            />
          ) : null;
        })}
      </div>
      {!filtered.length && <Empty locale={locale} message="journeyEmpty" />}
      <p className="help-text">{t(locale, 'visitNote')}</p>
    </>
  );
}
