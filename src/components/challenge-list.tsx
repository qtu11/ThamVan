'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Trophy, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { Challenge, Heritage, Locale, Progress } from '@/lib/types';
import { textFor } from '@/lib/types';
import { t } from '@/lib/i18n';
import { api, Photo, Status, errorText, Empty } from './ui';
function ChallengeCard({
  challenge,
  entry,
  locale,
  progress,
  signedIn,
}: {
  challenge: Challenge;
  entry: Heritage;
  locale: Locale;
  progress?: Progress;
  signedIn: boolean;
}) {
  const router = useRouter(),
    [joined, setJoined] = useState(!!progress),
    [complete, setComplete] = useState(!!progress?.completed_at),
    [answer, setAnswer] = useState<number | null>(null),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  const text = textFor(challenge.translations, locale),
    expired = !!challenge.expires_at && new Date(challenge.expires_at) < new Date();
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) {
      router.push(`/${locale}/auth/login?next=/${locale}/challenges`);
      return;
    }
    setPending(true);
    setMessage('');
    try {
      const result = await api('/api/challenges', {
        challenge_id: challenge.id,
        ...(joined ? { answer } : {}),
      });
      if (!joined) setJoined(true);
      else {
        setComplete(result.correct === true);
        setMessage(t(locale, result.limited ? 'rateLimit' : result.correct ? 'correct' : 'wrong'));
        setError(!result.correct);
      }
      router.refresh();
    } catch (e) {
      setMessage(errorText(locale, e));
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="challenge-card" id={challenge.id}>
      <div className="challenge-photo">
        <Photo entry={entry} />
        <span className={`pill ${complete ? 'earned' : ''}`}>
          {complete ? <CheckCircle2 size={14} /> : <Trophy size={14} />}{' '}
          {t(
            locale,
            complete ? 'completed' : expired ? 'expired' : joined ? 'inProgress' : 'notJoined',
          )}
        </span>
      </div>
      <div className="challenge-body">
        <div className="meta">
          <span>{entry.region}</span>
          <b>
            +{challenge.points} {t(locale, 'points')}
          </b>
        </div>
        <h2>{text.title}</h2>
        <p>{text.description}</p>
        <Link className="text-link" href={`/${locale}/explore/${entry.slug}`}>
          {t(locale, 'readMore')}
          <ArrowUpRight size={16} />
        </Link>
        <div className={`badge-line ${complete ? 'earned' : ''}`}>
          <Award size={24} />
          {t(locale, 'badge')}: {challenge.badge}
        </div>
        {!complete && !expired && (
          <form onSubmit={submit}>
            {joined && (
              <fieldset>
                <legend>{text.question}</legend>
                {text.options.map((option, i) => (
                  <label className="answer-option" key={i}>
                    <input
                      type="radio"
                      name={`answer-${challenge.id}`}
                      value={i}
                      required
                      checked={answer === i}
                      onChange={() => setAnswer(i)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <button className="button" disabled={pending || (joined && answer === null)}>
              {t(locale, pending ? 'loading' : joined ? 'answer' : 'join')}
            </button>
          </form>
        )}
        <Status message={message} error={error} />
      </div>
    </article>
  );
}
export function ChallengeList({
  challenges,
  entries,
  locale,
  progress,
  signedIn,
}: {
  challenges: Challenge[];
  entries: Heritage[];
  locale: Locale;
  progress: Progress[];
  signedIn: boolean;
}) {
  const [filter, setFilter] = useState('all');
  const filtered = challenges.filter(
    (c) =>
      filter === 'all' ||
      (filter === 'completed'
        ? progress.some((p) => p.challenge_id === c.id && p.completed_at)
        : progress.some((p) => p.challenge_id === c.id && !p.completed_at)),
  );
  return (
    <>
      <div className="chips">
        {(['all', 'inProgress', 'completed'] as const).map((key) => (
          <button
            key={key}
            className={`chip ${filter === key ? 'selected' : ''}`}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {t(locale, key)}
          </button>
        ))}
      </div>
      <div className="challenge-grid">
        {filtered.map((c) => {
          const entry = entries.find((e) => e.id === c.entry_id);
          return entry ? (
            <ChallengeCard
              key={c.id}
              challenge={c}
              entry={entry}
              locale={locale}
              progress={progress.find((p) => p.challenge_id === c.id)}
              signedIn={signedIn}
            />
          ) : null;
        })}
      </div>
      {!filtered.length && <Empty locale={locale} />}
    </>
  );
}
