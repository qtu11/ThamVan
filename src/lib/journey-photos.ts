'use client';
import { useCallback, useSyncExternalStore } from 'react';

export type JourneyPhoto = {
  id: string;
  name: string;
  region: string;
  slug: string | null;
  dataUrl: string;
  capturedAt: string;
};

const KEY = 'tv-journey-photos';
const EVENT = 'tv-journey-photos';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

function read(): JourneyPhoto[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is JourneyPhoto =>
        !!item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.dataUrl === 'string' &&
        typeof item.capturedAt === 'string',
    );
  } catch {
    return [];
  }
}

function snapshot(): string {
  return localStorage.getItem(KEY) || '[]';
}

/** Downscale a captured photo so personal journeys stay light in browser storage. */
export async function toStoredPhotoDataUrl(file: File, maxWidth = 720): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return await fileToDataUrl(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('readFailed'));
    reader.readAsDataURL(file);
  });
}

export function useJourneyPhotos() {
  const stored = useSyncExternalStore(subscribe, snapshot, () => '[]');
  let photos: JourneyPhoto[] = [];
  try {
    photos = JSON.parse(stored) as JourneyPhoto[];
  } catch {
    photos = [];
  }

  const save = useCallback((photo: Omit<JourneyPhoto, 'id' | 'capturedAt'>) => {
    try {
      const current = read();
      const next: JourneyPhoto = {
        ...photo,
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        capturedAt: new Date().toISOString(),
      };
      localStorage.setItem(KEY, JSON.stringify([next, ...current].slice(0, 60)));
      window.dispatchEvent(new Event(EVENT));
      return next;
    } catch {
      return null;
    }
  }, []);

  const remove = useCallback((id: string) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(read().filter((item) => item.id !== id)));
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* Storage unavailable: keep the in-memory list unchanged. */
    }
  }, []);

  return { photos, save, remove };
}
