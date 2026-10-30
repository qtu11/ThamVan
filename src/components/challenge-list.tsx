'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Trophy, ArrowUpRight, CheckCircle2, HelpCircle, RefreshCw } from 'lucide-react';
import type { Challenge, Heritage, Locale, Progress } from '@/lib/types';
import { textFor } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';
import { api, Photo, Status, errorText, Empty } from './ui';

function HeritageQuizBanner({ entries, locale }: { entries: Heritage[]; locale: Locale }) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const quizPool = entries.slice(0, 8);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);

  if (quizPool.length < 4) return null;
  const target = quizPool[questionIdx % quizPool.length];
  const targetSummary = textFor(target.translations, locale).summary;
  const options = [
    target,
    quizPool[(questionIdx + 1) % quizPool.length],
    quizPool[(questionIdx + 2) % quizPool.length],
    quizPool[(questionIdx + 3) % quizPool.length],
  ].sort((a, b) => a.id.localeCompare(b.id));

  function nextQuestion() {
    setPickedId(null);
    setQuestionIdx((prev) => (prev + 1) % quizPool.length);
  }

  return (
    <section
      className="heritage-quiz-banner"
      aria-label={c('Đố vui di sản', 'Heritage trivia', '遗产问答')}
    >
      <div className="heritage-quiz-top">
        <span className="heritage-quiz-eyebrow">
          <HelpCircle size={15} />
          {c('ĐỐ VUI DI SẢN', 'HERITAGE TRIVIA', '遗产问答')}
        </span>
        <button type="button" className="heritage-quiz-next" onClick={nextQuestion}>
          <RefreshCw size={13} />
          {c('Câu khác', 'Next clue', '下一题')}
        </button>
      </div>
      <p className="heritage-quiz-prompt">
        {c(
          'Sự thật này nói về địa điểm nào?',
          'Which heritage site does this clue describe?',
          '这条线索描述的是哪个地点？',
        )}
      </p>
      <blockquote className="heritage-quiz-quote">“{targetSummary}”</blockquote>
      <div className="heritage-quiz-options">
        {options.map((opt) => {
          const isPicked = pickedId === opt.id;
          const isCorrect = pickedId !== null && opt.id === target.id;
          const isWrong = isPicked && opt.id !== target.id;
          return (
            <button
              type="button"
              key={opt.id}
              className={`heritage-quiz-option ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
              onClick={() => setPickedId(opt.id)}
              aria-pressed={isPicked}
            >
              <span>{opt.name}</span>
              {isCorrect && <CheckCircle2 size={16} />}
            </button>
          );
        })}
      </div>
      {pickedId && (
        <p className="heritage-quiz-feedback" role="status">
          {pickedId === target.id
            ? c(
                `Chính xác! Đó là ${target.name} (${target.region}).`,
                `Correct! That is ${target.name} (${target.region}).`,
                `回答正确！这是 ${target.name} (${target.region})。`,
              )
            : c(
                `Chưa đúng — đáp án là ${target.name}. Hãy thử câu tiếp theo!`,
                `Not quite — the answer is ${target.name}. Try the next clue!`,
                `不太对——正确答案是 ${target.name}。试试下一题！`,
              )}
        </p>
      )}
    </section>
  );
}
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
      <HeritageQuizBanner entries={entries} locale={locale} />
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
