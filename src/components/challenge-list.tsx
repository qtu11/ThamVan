'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  Trophy,
  ArrowUpRight,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  MapPin,
  Flame,
  Target,
  Sparkles,
} from 'lucide-react';
import type { Challenge, Heritage, Locale, Progress } from '@/lib/types';
import { textFor } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';
import { api, Photo, Status, errorText, Empty } from './ui';

type Level = 'easy' | 'medium' | 'hard';

function levelOf(points: number): Level {
  if (points >= 30) return 'hard';
  if (points >= 25) return 'medium';
  return 'easy';
}

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
          {c('ĐỐ VUI NHANH', 'QUICK TRIVIA', '快速问答')}
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
  index,
  locale,
  progress,
  signedIn,
}: {
  challenge: Challenge;
  entry: Heritage;
  index: number;
  locale: Locale;
  progress?: Progress;
  signedIn: boolean;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const router = useRouter(),
    [joined, setJoined] = useState(!!progress),
    [complete, setComplete] = useState(!!progress?.completed_at),
    [answer, setAnswer] = useState<number | null>(null),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  const text = textFor(challenge.translations, locale),
    expired = !!challenge.expires_at && new Date(challenge.expires_at) < new Date();
  const level = levelOf(challenge.points);
  const levelLabel =
    level === 'hard'
      ? c('Khó', 'Hard', '困难')
      : level === 'medium'
        ? c('Vừa', 'Medium', '中等')
        : c('Dễ', 'Easy', '简单');
  const status = complete ? 'completed' : expired ? 'expired' : joined ? 'inProgress' : 'notJoined';

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
    <article className={`quest-card level-${level} ${complete ? 'is-complete' : ''}`} id={challenge.id}>
      <div className="quest-media">
        <Photo entry={entry} />
        <span className="quest-index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className={`quest-level level-${level}`}>
          <Flame size={12} />
          {levelLabel}
        </span>
        <span className="quest-points">
          +{challenge.points} XP
        </span>
        <span className="quest-place">
          <MapPin size={12} />
          {entry.region}
        </span>
      </div>

      <div className="quest-body">
        <span className={`quest-status status-${status}`}>
          {complete ? <CheckCircle2 size={13} /> : <Trophy size={13} />}
          {t(locale, status)}
        </span>
        <h2 className="quest-title">{text.title}</h2>
        <p className="quest-desc">{text.description}</p>

        <div className="quest-badge-row">
          <span className="quest-badge-icon" aria-hidden="true">
            <Award size={16} />
          </span>
          <span>
            <small>{t(locale, 'badge')}</small>
            <strong>{challenge.badge}</strong>
          </span>
        </div>

        {!complete && !expired && joined && (
          <form className="quest-form" onSubmit={submit}>
            <fieldset>
              <legend>{text.question}</legend>
              {text.options.map((option, i) => (
                <label className={`quest-option ${answer === i ? 'picked' : ''}`} key={i}>
                  <input
                    type="radio"
                    name={`answer-${challenge.id}`}
                    value={i}
                    required
                    checked={answer === i}
                    onChange={() => setAnswer(i)}
                  />
                  <span className="quest-option-key" aria-hidden="true">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            <button className="button quest-cta" disabled={pending || answer === null}>
              {t(locale, pending ? 'loading' : 'answer')}
            </button>
          </form>
        )}

        <div className="quest-actions">
          {!complete && !expired && !joined && (
            <form onSubmit={submit}>
              <button className="button quest-cta" disabled={pending}>
                <Target size={15} />
                {t(locale, pending ? 'loading' : 'join')}
              </button>
            </form>
          )}
          <Link className="quest-link" href={`/${locale}/explore/${entry.slug}`}>
            {t(locale, 'readMore')}
            <ArrowUpRight size={15} />
          </Link>
        </div>
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
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const [filter, setFilter] = useState<'all' | 'inProgress' | 'completed'>('all');
  const [level, setLevel] = useState<'all' | Level>('all');

  const playable = useMemo(
    () => challenges.filter((ch) => entries.some((e) => e.id === ch.entry_id)),
    [challenges, entries],
  );
  const completedCount = progress.filter(
    (p) => p.completed_at && playable.some((ch) => ch.id === p.challenge_id),
  ).length;
  const totalPoints = playable.reduce((sum, ch) => sum + ch.points, 0);
  const earnedPoints = progress
    .filter((p) => p.completed_at)
    .reduce((sum, p) => sum + (p.awarded_points || 0), 0);
  const pct = playable.length ? Math.round((completedCount / playable.length) * 100) : 0;

  const filtered = playable.filter((ch) => {
    if (level !== 'all' && levelOf(ch.points) !== level) return false;
    if (filter === 'all') return true;
    return filter === 'completed'
      ? progress.some((p) => p.challenge_id === ch.id && p.completed_at)
      : progress.some((p) => p.challenge_id === ch.id && !p.completed_at);
  });

  return (
    <>
      <section className="quest-hero" aria-label={c('Tổng quan thử thách', 'Challenge overview', '挑战概览')}>
        <div className="quest-hero-copy">
          <span className="quest-hero-eyebrow">
            <Sparkles size={14} />
            {c('MÙA KHÁM PHÁ SÀI GÒN', 'SAIGON DISCOVERY SEASON', '西贡探索季')}
          </span>
          <h2>
            {c(
              `${playable.length} thử thách đang chờ bạn`,
              `${playable.length} challenges await you`,
              `${playable.length} 个挑战等你完成`,
            )}
          </h2>
          <p>
            {c(
              'Đọc câu chuyện di sản, trả lời câu hỏi và gom huy hiệu qua từng góc phố Sài Gòn.',
              'Read heritage stories, answer questions and collect badges across Saigon.',
              '阅读遗产故事，回答问题，在西贡街巷收集徽章。',
            )}
          </p>
          <div
            className="quest-hero-progress"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={c('Tiến độ hoàn thành', 'Completion progress', '完成进度')}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
          <small>
            {c(
              `Đã hoàn thành ${completedCount}/${playable.length} · ${pct}%`,
              `Completed ${completedCount}/${playable.length} · ${pct}%`,
              `已完成 ${completedCount}/${playable.length} · ${pct}%`,
            )}
          </small>
        </div>
        <div className="quest-hero-stats">
          <div>
            <strong>{playable.length}</strong>
            <span>{c('Thử thách', 'Challenges', '挑战')}</span>
          </div>
          <div>
            <strong>{totalPoints}</strong>
            <span>{c('XP có thể nhận', 'XP available', '可得 XP')}</span>
          </div>
          <div>
            <strong>{earnedPoints}</strong>
            <span>{c('XP đã nhận', 'XP earned', '已得 XP')}</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>{c('Huy hiệu', 'Badges', '徽章')}</span>
          </div>
        </div>
      </section>

      <HeritageQuizBanner entries={entries} locale={locale} />

      <div className="quest-toolbar">
        <div className="quest-chip-group" role="group" aria-label={c('Trạng thái', 'Status', '状态')}>
          {(['all', 'inProgress', 'completed'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`quest-chip ${filter === key ? 'selected' : ''}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {t(locale, key)}
            </button>
          ))}
        </div>
        <div className="quest-chip-group" role="group" aria-label={c('Độ khó', 'Difficulty', '难度')}>
          {(
            [
              ['all', c('Mọi cấp độ', 'All levels', '全部难度')],
              ['easy', c('Dễ', 'Easy', '简单')],
              ['medium', c('Vừa', 'Medium', '中等')],
              ['hard', c('Khó', 'Hard', '困难')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`quest-chip level-chip ${level === key ? 'selected' : ''}`}
              aria-pressed={level === key}
              onClick={() => setLevel(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="quest-grid">
        {filtered.map((ch) => {
          const entry = entries.find((e) => e.id === ch.entry_id)!;
          return (
            <ChallengeCard
              key={ch.id}
              challenge={ch}
              entry={entry}
              index={playable.indexOf(ch)}
              locale={locale}
              progress={progress.find((p) => p.challenge_id === ch.id)}
              signedIn={signedIn}
            />
          );
        })}
      </div>
      {!filtered.length && <Empty locale={locale} />}
    </>
  );
}
