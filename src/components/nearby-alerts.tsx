'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';

/**
 * Lock-screen alerts for heritage places within 3 km while the site/PWA is open or in the
 * background. shortcut: the web cannot read location once the app is fully closed (needs a
 * native app with background geofencing); upgrade then.
 */
export const NEARBY_ALERTS_KEY = 'tv-nearby-alerts';
const SEEN_KEY = 'tv-nearby-seen';
const REPEAT_MS = 12 * 60 * 60 * 1000;
const CHECK_MS = 2 * 60 * 1000;
const MOVE_METERS = 300;

export const nearbyAlertsOn = () =>
  typeof window !== 'undefined' &&
  localStorage.getItem(NEARBY_ALERTS_KEY) === 'on' &&
  'Notification' in window &&
  Notification.permission === 'granted' &&
  'serviceWorker' in navigator &&
  Boolean(navigator.geolocation);

type Place = { slug: string; name: string; distanceMeters: number };

const meters = (a: GeolocationCoordinates, b: { latitude: number; longitude: number }) =>
  Math.hypot(
    (a.latitude - b.latitude) * 110_574,
    (a.longitude - b.longitude) * 111_320 * Math.cos((a.latitude * Math.PI) / 180),
  );

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  window.addEventListener('tv-nearby-alerts', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('tv-nearby-alerts', onChange);
  };
};
export const useNearbyAlertsOn = () => useSyncExternalStore(subscribe, nearbyAlertsOn, () => false);

export function NearbyAlerts({ locale }: { locale: Locale }) {
  const on = useNearbyAlertsOn();
  useEffect(() => {
    if (!on) return;
    const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
    let last: { latitude: number; longitude: number; at: number } | null = null;
    let busy = false;
    const check = async (coords: GeolocationCoordinates) => {
      const now = Date.now();
      if (busy || (last && now - last.at < CHECK_MS && meters(coords, last) < MOVE_METERS)) return;
      busy = true;
      last = { latitude: coords.latitude, longitude: coords.longitude, at: now };
      try {
        const response = await fetch(
          `/api/nearby?source=catalog&radius=3000&lat=${coords.latitude.toFixed(5)}&lon=${coords.longitude.toFixed(5)}`,
        );
        if (!response.ok) return;
        const { places } = (await response.json()) as { places: Place[] };
        let seen: Record<string, number> = {};
        try {
          seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
        } catch {}
        const fresh = places.filter((place) => !seen[place.slug] || now - seen[place.slug] > REPEAT_MS);
        if (!fresh.length) return;
        const distance = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);
        const top = fresh.slice(0, 3);
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(
          fresh.length === 1
            ? c(`Gần bạn: ${top[0].name}`, `Near you: ${top[0].name}`, `附近：${top[0].name}`)
            : c(
                `${fresh.length} địa điểm di sản trong 3 km`,
                `${fresh.length} heritage places within 3 km`,
                `3 公里内有 ${fresh.length} 处文化遗产`,
              ),
          {
            body: top.map((place) => `${place.name} · ${distance(place.distanceMeters)}`).join('\n'),
            icon: '/icons/pwa-192.png',
            badge: '/icons/pwa-192.png',
            tag: 'tv-nearby',
            data: {
              url:
                fresh.length === 1 ? `/${locale}/explore/${top[0].slug}` : `/${locale}/map`,
            },
          },
        );
        for (const place of fresh) seen[place.slug] = now;
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
      } catch {
        // Network or notification failure: try again on the next position update.
      } finally {
        busy = false;
      }
    };
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    // Coarse (Wi-Fi/cell) position is plenty for a 3 km radius and spares the battery.
    const watch = navigator.geolocation.watchPosition(
      (position) => void check(position.coords),
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [on, locale]);

  return null;
}
