'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { MapPin, ArrowUpRight, Compass, LoaderCircle } from 'lucide-react';
import type { Heritage, Locale } from '@/lib/types';
import { textFor } from '@/lib/types';
import { workspaceError } from '@/lib/workspace-errors';
import { t, type MessageKey } from '@/lib/i18n';
export function Photo({
  entry,
  priority = false,
  className = '',
}: {
  entry: Pick<Heritage, 'image' | 'name'>;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`photo ${className}`}>
      {entry.image && !failed ? (
        <Image
          src={entry.image}
          alt={entry.name}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1000px) 45vw, 35vw"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="photo-placeholder">
          <Compass size={36} />
          <span>{entry.name}</span>
        </div>
      )}
    </div>
  );
}
export function HeritageCard({
  entry,
  locale,
  index,
}: {
  entry: Heritage;
  locale: Locale;
  index?: number;
}) {
  return (
    <Link href={`/${locale}/explore/${entry.slug}`} className="heritage-card">
      <div className="card-image">
        <Photo entry={entry} priority={index === 0} />
        <span className="card-tag">{t(locale, entry.kind)}</span>
        <span className="card-arrow">
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className="card-copy">
        <div className="meta">
          <MapPin size={13} />
          {entry.region}
          {index !== undefined && (
            <span className="card-number">{String(index + 1).padStart(2, '0')}</span>
          )}
        </div>
        <h3>{entry.name}</h3>
        <p>{textFor(entry.translations, locale).summary}</p>
      </div>
    </Link>
  );
}
export function Empty({ locale, message = 'empty' }: { locale: Locale; message?: MessageKey }) {
  return (
    <div className="empty">
      <Compass size={36} />
      <h2>{t(locale, message)}</h2>
      <p>{t(locale, 'emptyDesc')}</p>
      <Link className="button secondary" href={`/${locale}/explore`}>
        {t(locale, 'explore')} <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function Status({ message, error = false }: { message: string; error?: boolean }) {
  return message ? (
    <p className={`status ${error ? 'danger' : 'success'}`} role={error ? 'alert' : 'status'}>
      {message}
    </p>
  ) : null;
}
export function Submit({
  pending,
  children,
  disabled = false,
}: {
  pending: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button className="button" type="submit" disabled={pending || disabled}>
      {pending ? <LoaderCircle size={18} className="spin" /> : null}
      {children}
    </button>
  );
}
export async function api(path: string, body: unknown, method = 'POST') {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('error');
  }
  if (!response.ok) throw new Error(data.error || 'error');
  return data;
}
export function errorText(locale: Locale, error: unknown) {
  if (error instanceof Error && error.message === 'DAILY_CHALLENGE_LIMIT')
    return workspaceError(error.message, locale);
  const key = error instanceof Error ? error.message : '';
  const allowed: MessageKey[] = [
    'error',
    'invalidInput',
    'authInvalid',
    'authRequired',
    'notConfigured',
    'forbidden',
    'rateLimit',
    'captchaError',
    'visionUnavailable',
    'visionTimeout',
    'visionProviderError',
    'visionInvalidResponse',
    'locationExpired',
    'locationDenied',
    'googleUnavailable',
    'oauthFailed',
    'oauthCancelled',
    'termsRequired',
    'reauthRequired',
  ];
  return t(locale, allowed.includes(key as MessageKey) ? (key as MessageKey) : 'error');
}
