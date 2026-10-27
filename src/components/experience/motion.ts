'use client';

import { useSyncExternalStore } from 'react';

type Connection = EventTarget & { saveData?: boolean };
function connection() {
  return (navigator as Navigator & { connection?: Connection }).connection;
}
function subscribe(listener: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', listener);
  connection()?.addEventListener('change', listener);
  return () => {
    media.removeEventListener('change', listener);
    connection()?.removeEventListener('change', listener);
  };
}
function getSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!connection()?.saveData;
}

export function useStaticExperience() {
  // A useful, static server render is the initial state, including without JS.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
