'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { deviceLocationSchema, freshLocation, type DeviceLocation } from './recognition';

/**
 * Real device position only: the browser Geolocation API with high accuracy.
 * There is no IP lookup and no default coordinate anywhere in this module.
 */
export type LocationFailure = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout';

export function locationSupport(): LocationFailure | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.geolocation) return 'unsupported';
  return null;
}

const failureOf = (error: { code?: number } | null | undefined): LocationFailure =>
  error?.code === 1 ? 'denied' : error?.code === 3 ? 'timeout' : 'unavailable';

/** One fresh fix, e.g. to accompany a photo. Rejects with a LocationFailure string. */
export function requestDeviceLocation(timeoutMs = 12_000): Promise<DeviceLocation> {
  // Indoors a high-accuracy GPS fix often times out; the Wi-Fi/cell estimate is still a real device position.
  return locateOnce(timeoutMs, true).catch((failure: LocationFailure) =>
    failure === 'denied' || failure === 'insecure' || failure === 'unsupported'
      ? Promise.reject(failure)
      : locateOnce(timeoutMs, false),
  );
}

function locateOnce(timeoutMs: number, enableHighAccuracy: boolean): Promise<DeviceLocation> {
  return new Promise((resolve, reject) => {
    const unsupported = locationSupport();
    if (unsupported) return reject(unsupported);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const parsed = deviceLocationSchema.safeParse({
          source: 'device',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        if (!parsed.success || !freshLocation(parsed.data)) return reject('unavailable');
        resolve(parsed.data);
      },
      (error) => reject(failureOf(error)),
      { enableHighAccuracy, timeout: timeoutMs, maximumAge: enableHighAccuracy ? 0 : 60_000 },
    );
  });
}

export type LiveFix = {
  latitude: number;
  longitude: number;
  /** Metres. Drives the halo on the map; never printed as a number. */
  accuracy: number;
  /** Degrees clockwise from north while moving, else null. */
  heading: number | null;
  timestamp: number;
};
export type LiveLocationState = {
  fix: LiveFix | null;
  status: 'idle' | 'locating' | 'tracking' | 'error';
  failure: LocationFailure | null;
};

/**
 * Continuous tracking for the map, using the same location service as the phone's own map app:
 * on a phone Chrome/Safari hand out the GPS fix, on a laptop the OS / Google network location.
 *
 * The first answer is often a coarse Wi-Fi/cell estimate. We keep listening and also ask again a few
 * times, and always keep the sharpest recent fix, so the dot snaps to the GPS position as soon as the
 * device has it. A coarse reading never replaces a sharp one unless the device has clearly moved.
 */
const REFINE_TARGET_METERS = 40;
const REFINE_INTERVAL_MS = 6_000;
const REFINE_ATTEMPTS = 10;

export function useLiveLocation() {
  const [state, setState] = useState<LiveLocationState>({
    fix: null,
    status: 'idle',
    failure: null,
  });
  const watchId = useRef<number | null>(null);
  const refineTimer = useRef<number | null>(null);
  const last = useRef<LiveFix | null>(null);

  const clearTimers = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation)
      navigator.geolocation.clearWatch?.(watchId.current);
    watchId.current = null;
    if (refineTimer.current !== null) window.clearInterval(refineTimer.current);
    refineTimer.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    last.current = null;
    setState({ fix: null, status: 'idle', failure: null });
  }, [clearTimers]);

  const start = useCallback(() => {
    const unsupported = locationSupport();
    if (unsupported) {
      setState({ fix: null, status: 'error', failure: unsupported });
      return;
    }
    if (watchId.current !== null) {
      // Already tracking: hand the current fix back so the map can recentre on it.
      setState((current) => (current.fix ? { ...current, fix: { ...current.fix } } : current));
      return;
    }
    setState((current) => ({ ...current, status: 'locating', failure: null }));

    const accept = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      )
        return;
      const next: LiveFix = {
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 50,
        heading:
          typeof heading === 'number' && Number.isFinite(heading) && (speed ?? 0) > 0.5
            ? heading
            : null,
        timestamp: position.timestamp || Date.now(),
      };
      const previous = last.current;
      if (previous && next.accuracy > previous.accuracy) {
        const moved =
          Math.hypot(
            (next.latitude - previous.latitude) * 110_574,
            (next.longitude - previous.longitude) *
              111_320 *
              Math.cos((previous.latitude * Math.PI) / 180),
          ) >
          next.accuracy + previous.accuracy;
        const stale = next.timestamp - previous.timestamp > 45_000;
        // A blurrier reading is only believed when it proves we moved or the sharp one is old.
        if (!moved && !stale) return;
      }
      last.current = next;
      setState({ fix: next, status: 'tracking', failure: null });
      if (next.accuracy <= REFINE_TARGET_METERS && refineTimer.current !== null) {
        window.clearInterval(refineTimer.current);
        refineTimer.current = null;
      }
    };
    const reject = (error: GeolocationPositionError) => {
      // A transient timeout while we already hold a fix is not worth alarming anyone over.
      if (last.current && error.code !== 1) return;
      if (error.code === 1) clearTimers();
      if (error.code !== 1 && refineTimer.current !== null) return; // keep trying quietly
      last.current = null;
      setState({ fix: null, status: 'error', failure: failureOf(error) });
    };
    const options: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 };
    try {
      watchId.current = navigator.geolocation.watchPosition(accept, reject, options);
      navigator.geolocation.getCurrentPosition(accept, () => undefined, options);
      // Fast Wi-Fi/cell fix so the dot appears indoors; accept() swaps in GPS once it is sharper.
      navigator.geolocation.getCurrentPosition(accept, () => undefined, {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 20_000,
      });
      let attempts = 0;
      refineTimer.current = window.setInterval(() => {
        attempts += 1;
        if (attempts > REFINE_ATTEMPTS || (last.current && last.current.accuracy <= REFINE_TARGET_METERS)) {
          if (refineTimer.current !== null) window.clearInterval(refineTimer.current);
          refineTimer.current = null;
          return;
        }
        navigator.geolocation.getCurrentPosition(accept, () => undefined, options);
      }, REFINE_INTERVAL_MS);
    } catch {
      clearTimers();
      setState({ fix: null, status: 'error', failure: 'unavailable' });
    }
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { ...state, start, stop };
}
