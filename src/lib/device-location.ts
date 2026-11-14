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
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
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
 * Continuous tracking for the map. Keeps the sharpest recent fix: a coarse Wi-Fi/cell reading
 * does not replace a good GPS lock unless that lock has gone stale or the device really moved.
 */
export function useLiveLocation() {
  const [state, setState] = useState<LiveLocationState>({
    fix: null,
    status: 'idle',
    failure: null,
  });
  const watchId = useRef<number | null>(null);
  const last = useRef<LiveFix | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation)
      navigator.geolocation.clearWatch?.(watchId.current);
    watchId.current = null;
    last.current = null;
    setState({ fix: null, status: 'idle', failure: null });
  }, []);

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
        timestamp: position.timestamp,
      };
      const previous = last.current;
      if (
        previous &&
        next.accuracy > previous.accuracy * 2.5 &&
        previous.accuracy < 100 &&
        next.timestamp - previous.timestamp < 20_000
      )
        return;
      last.current = next;
      setState({ fix: next, status: 'tracking', failure: null });
    };
    const reject = (error: GeolocationPositionError) => {
      // A transient timeout while we already hold a fix is not worth alarming anyone over.
      if (last.current && error.code !== 1) return;
      if (error.code === 1 && watchId.current !== null) {
        navigator.geolocation.clearWatch?.(watchId.current);
        watchId.current = null;
      }
      last.current = null;
      setState({ fix: null, status: 'error', failure: failureOf(error) });
    };
    try {
      watchId.current = navigator.geolocation.watchPosition(accept, reject, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
      });
    } catch {
      setState({ fix: null, status: 'error', failure: 'unavailable' });
    }
  }, []);

  useEffect(
    () => () => {
      if (watchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation)
        navigator.geolocation.clearWatch?.(watchId.current);
      watchId.current = null;
    },
    [],
  );

  return { ...state, start, stop };
}
