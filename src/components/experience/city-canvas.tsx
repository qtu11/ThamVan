'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import Image from 'next/image';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import type { CityTime } from './city-lighting';
import { cityPlaces, cityPoster } from './city-places';

export function CityCanvas({
  motion,
  progress,
  locale,
  time,
  view,
}: {
  motion: boolean;
  progress: RefObject<number>;
  locale: Locale;
  time: CityTime;
  view: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('static');
  useEffect(() => {
    if (!motion || !host.current) return;
    const element = host.current;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        setStatus('loading');
        import('./city-renderer')
          .then(({ createCityRenderer }) => {
            if (cancelled) return;
            dispose = createCityRenderer(
              element,
              progress,
              () => setStatus('ready'),
              () => setStatus('unavailable'),
            );
          })
          .catch(() => {
            if (!cancelled) setStatus('unavailable');
          });
      },
      { rootMargin: '160px' },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      dispose?.();
    };
  }, [motion, progress]);

  const ready = motion && status === 'ready';
  return (
    <div
      className="city-canvas-wrap"
      data-scene-status={motion ? status : 'static'}
      data-city-view={view}
    >
      <Image
        className="city-poster"
        src={cityPoster(view, time)}
        alt={t(
          locale,
          view === 1 ? 'cityBridgeAlt' : view === 2 ? 'cityLandmarkAlt' : 'cityPosterAlt',
        )}
        fill
        sizes="(max-width: 900px) 100vw, 65vw"
        priority
        unoptimized
      />
      <div className="city-canvas" ref={host} aria-hidden="true" style={{ opacity: ready ? 1 : 0 }}>
        {cityPlaces.map((place) => (
          <span key={place.id} className="city-callout" data-city-label={place.id}>
            {place.id === 'bason' ? t(locale, 'cityBaSon') : place.name}
          </span>
        ))}
      </div>
    </div>
  );
}
