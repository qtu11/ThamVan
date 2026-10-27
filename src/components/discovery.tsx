'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  LocateFixed,
  MapPin,
  Search,
  SlidersHorizontal,
  Navigation,
} from 'lucide-react';
import type { Heritage, Locale, Kind, Profile } from '@/lib/types';
import { kinds, textFor } from '@/lib/types';
import { distanceKm, normalizeSearch, type Coordinates } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { api, Empty, HeritageCard, Photo, Status, errorText } from './ui';
export function SearchBox({ locale, initial = '' }: { locale: Locale; initial?: string }) {
  return (
    <form className="search-box" action={`/${locale}/explore`}>
      <Search size={20} />
      <label className="sr-only" htmlFor="heritage-search">
        {t(locale, 'search')}
      </label>
      <input
        id="heritage-search"
        type="search"
        name="q"
        defaultValue={initial}
        maxLength={100}
        placeholder={t(locale, 'searchPlaceholder')}
      />
      <button className="icon-button" aria-label={t(locale, 'search')}>
        <ArrowRight size={20} />
      </button>
    </form>
  );
}
export function DiscoveryList({
  entries,
  locale,
  initialQuery = '',
  initialKind = '',
  initialRegion = '',
}: {
  entries: Heritage[];
  locale: Locale;
  initialQuery?: string;
  initialKind?: string;
  initialRegion?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery),
    [kind, setKind] = useState(initialKind),
    [region, setRegion] = useState(initialRegion),
    [page, setPage] = useState(1);
  const source = JSON.stringify([initialQuery, initialKind, initialRegion]);
  const [previousSource, setPreviousSource] = useState(source);
  // Synchronize browser navigation without remounting the input or losing focus while typing.
  if (previousSource !== source) {
    setPreviousSource(source);
    setQuery(initialQuery);
    setKind(initialKind);
    setRegion(initialRegion);
    setPage(1);
  }
  const filtered = entries.filter(
    (e) =>
      (!kind || e.kind === kind) &&
      (!region || e.region === region) &&
      normalizeSearch(`${e.name} ${e.region} ${textFor(e.translations, locale).summary}`).includes(
        normalizeSearch(query),
      ),
  );
  function filter(q: string, k: string, r: string) {
    setQuery(q);
    setKind(k);
    setRegion(r);
    setPage(1);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (k) params.set('kind', k);
    if (r) params.set('region', r);
    router.replace(`/${locale}/explore${params.size ? `?${params}` : ''}`, { scroll: false });
  }
  return (
    <>
      <div className="discovery-controls">
        <div className="search-box">
          <Search size={20} />
          <label className="sr-only" htmlFor="filter-search">
            {t(locale, 'search')}
          </label>
          <input
            id="filter-search"
            type="search"
            maxLength={100}
            value={query}
            onChange={(e) => filter(e.target.value, kind, region)}
            placeholder={t(locale, 'searchPlaceholder')}
          />
        </div>
        <label className="select-field">
          <SlidersHorizontal size={17} />
          <span className="sr-only">{t(locale, 'selectRegion')}</span>
          <select value={region} onChange={(e) => filter(query, kind, e.target.value)}>
            <option value="">{t(locale, 'allRegions')}</option>
            {[...new Set(entries.map((e) => e.region))]
              .sort((a, b) => a.localeCompare(b, 'vi'))
              .map((r) => (
                <option key={r}>{r}</option>
              ))}
          </select>
        </label>
      </div>
      <div className="chips" role="group" aria-label={t(locale, 'topics')}>
        {['', ...kinds].map((k) => (
          <button
            key={k}
            className={`chip ${kind === k ? 'selected' : ''}`}
            aria-pressed={kind === k}
            onClick={() => filter(query, k, region)}
          >
            {t(locale, k ? (k as Kind) : 'all')}
          </button>
        ))}
      </div>
      <p className="result-meta" aria-live="polite">
        {filtered.length} {t(locale, 'resultCount')}
      </p>
      {filtered.length ? (
        <div className="card-grid">
          {filtered.slice((page - 1) * 9, page * 9).map((e, index) => (
            <HeritageCard entry={e} locale={locale} key={e.id} index={index} />
          ))}
        </div>
      ) : (
        <Empty locale={locale} />
      )}
      {filtered.length > 9 && (
        <div className="pagination">
          <button
            className="button secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t(locale, 'previous')}
          </button>
          <span>
            {page} / {Math.ceil(filtered.length / 9)}
          </span>
          <button
            className="button secondary"
            disabled={page * 9 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            {t(locale, 'next')}
          </button>
        </div>
      )}
    </>
  );
}
export function useDiscoveryPreferences(profile?: Profile) {
  const ready = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  const key = profile ? `tv-preferences:${profile.id}` : 'tv-preferences';
  const fallback = JSON.stringify({
    radius: profile?.radius_km ?? 5,
    notifications: profile?.notifications ?? false,
  });
  const snapshot = useSyncExternalStore(
    subscribePreferences,
    () => {
      try {
        return localStorage.getItem(key) || fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  let radius = profile?.radius_km ?? 5,
    notifications = profile?.notifications ?? false;
  try {
    const parsed = JSON.parse(snapshot);
    if (Number.isInteger(parsed.radius) && parsed.radius >= 3 && parsed.radius <= 10)
      radius = parsed.radius;
    notifications = parsed.notifications === true;
  } catch {
    /* Corrupt preferences use safe defaults. */
  }
  function store(nextRadius: number, nextNotifications = notifications) {
    localStorage.setItem(
      key,
      JSON.stringify({ radius: nextRadius, notifications: nextNotifications }),
    );
    window.dispatchEvent(new Event('tv-preferences'));
  }
  return { radius, notifications, store, ready };
}
function subscribeReady() {
  return () => {};
}
function subscribePreferences(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('tv-preferences', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('tv-preferences', callback);
  };
}
export function Nearby({
  entries,
  locale,
  profile,
  compact = false,
}: {
  entries: Heritage[];
  locale: Locale;
  profile?: Profile;
  compact?: boolean;
}) {
  const { radius, notifications, store, ready } = useDiscoveryPreferences(profile);
  const [position, setPosition] = useState<Coordinates | null>(null),
    [region, setRegion] = useState(''),
    [message, setMessage] = useState(''),
    [pending, setPending] = useState(false);
  const list = entries
    .filter((e) =>
      region
        ? e.region === region
        : position && e.latitude !== null && e.longitude !== null
          ? distanceKm(position, { latitude: e.latitude, longitude: e.longitude }) <= radius
          : !position,
    )
    .map((e) => ({
      ...e,
      distance:
        position && e.latitude !== null && e.longitude !== null
          ? distanceKm(position, { latitude: e.latitude, longitude: e.longitude })
          : null,
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  function locate() {
    setMessage('');
    setPending(true);
    if (!navigator.geolocation) {
      setMessage(t(locale, 'locationDenied'));
      setPending(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setRegion('');
        setPending(false);
      },
      () => {
        setMessage(t(locale, 'locationDenied'));
        setPending(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }
  async function syncRadius(value: number) {
    if (profile) {
      try {
        await api('/api/profile', { radius_km: value }, 'PATCH');
      } catch (e) {
        setMessage(errorText(locale, e));
      }
    }
  }
  useEffect(() => {
    if (
      !notifications ||
      !position ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    )
      return;
    for (const entry of list) {
      if (entry.distance === null || entry.distance > radius) continue;
      const key = `tv-notified:${entry.id}`;
      const day = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(key) === day) continue;
      new Notification(entry.name, {
        body: textFor(entry.translations, locale).summary,
        icon: '/images/logo.png',
        tag: entry.id,
      });
      localStorage.setItem(key, day);
      break;
    }
  }, [notifications, position, list, radius, locale]);
  return (
    <div className={compact ? 'nearby-panel compact' : 'nearby-panel'}>
      <div className="location-controls">
        <button className="button secondary" onClick={locate} disabled={pending}>
          <LocateFixed size={17} />
          {t(locale, pending ? 'loading' : 'locate')}
        </button>
        <label className="select-field">
          <MapPin size={16} />
          <span className="sr-only">{t(locale, 'selectRegion')}</span>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setPosition(null);
            }}
          >
            <option value="">{t(locale, 'selectRegion')}</option>
            {[...new Set(entries.map((e) => e.region))]
              .sort((a, b) => a.localeCompare(b, 'vi'))
              .map((r) => (
                <option key={r}>{r}</option>
              ))}
          </select>
        </label>
      </div>
      <p className="help-text">{t(locale, 'locationPurpose')}</p>
      <label className="radius-field">
        <span>
          {t(locale, 'radius')} <b>{radius} km</b>
        </span>
        <input
          type="range"
          min={3}
          max={10}
          step={1}
          disabled={!ready}
          value={radius}
          onChange={(e) => store(Number(e.target.value))}
          onPointerUp={(e) => syncRadius(Number(e.currentTarget.value))}
          onKeyUp={(e) => syncRadius(Number(e.currentTarget.value))}
        />
      </label>
      <Status message={message} error />
      {list.length ? (
        <div className="nearby-list">
          {list.slice(0, compact ? 2 : 10).map((e) => (
            <Link className="nearby-item" href={`/${locale}/explore/${e.slug}`} key={e.id}>
              <Photo entry={e} />
              <span>
                <strong>{e.name}</strong>
                <small>
                  <MapPin size={12} />
                  {e.distance === null ? e.region : `${e.distance.toFixed(1)} km`}
                </small>
              </span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <Empty locale={locale} />
      )}
      <Link className="text-link" href={`/${locale}/map`}>
        <Navigation size={15} />
        {t(locale, 'mapAll')}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
