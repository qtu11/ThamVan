'use client';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * One-time, per-device consent for THÁM VĂN LENS and the live map.
 * Stored only in this browser's localStorage: asked once per device, never sent to the server.
 */
export const DEVICE_CONSENT_VERSION = 1;
export const consentItems = ['location', 'terms', 'camera', 'photos'] as const;
export type ConsentItem = (typeof consentItems)[number];
export type DeviceConsent = Record<ConsentItem, boolean> & { version: number; acceptedAt: string };

const KEY = 'tv-device-consent';
const EVENT = 'tv-device-consent';

export function parseDeviceConsent(raw: string | null): DeviceConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DeviceConsent> | null;
    if (
      !value ||
      typeof value !== 'object' ||
      value.version !== DEVICE_CONSENT_VERSION ||
      typeof value.acceptedAt !== 'string' ||
      // Terms are the one item nothing works without; the rest are remembered as chosen.
      value.terms !== true
    )
      return null;
    return {
      version: DEVICE_CONSENT_VERSION,
      acceptedAt: value.acceptedAt,
      location: value.location === true,
      terms: true,
      camera: value.camera === true,
      photos: value.photos === true,
    };
  } catch {
    return null;
  }
}

export function readDeviceConsent(): DeviceConsent | null {
  try {
    return parseDeviceConsent(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}
const snapshot = () => {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
};

export function useDeviceConsent() {
  // `undefined` while hydrating so the gate never flashes for a device that already agreed.
  const raw = useSyncExternalStore<string | undefined>(subscribe, snapshot, () => undefined);
  const consent = raw === undefined ? undefined : parseDeviceConsent(raw);
  const accept = useCallback((choice: Record<ConsentItem, boolean>) => {
    const value: DeviceConsent = {
      ...choice,
      version: DEVICE_CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* Private mode without storage: consent holds for this page view only. */
    }
    window.dispatchEvent(new Event(EVENT));
    return value;
  }, []);
  return { consent, accept };
}
