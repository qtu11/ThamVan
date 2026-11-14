import type { Progress } from './types';

export const XP_PER_LEVEL = 100;

/** Level curve keeps early levels fast and later levels meaningful. */
export function levelForXp(xp: number) {
  const safe = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safe / XP_PER_LEVEL)) + 1;
  const currentFloor = (level - 1) ** 2 * XP_PER_LEVEL;
  const nextFloor = level ** 2 * XP_PER_LEVEL;
  const progress = Math.min(100, Math.round(((safe - currentFloor) / (nextFloor - currentFloor)) * 100));
  return { level, progress, currentFloor, nextFloor, toNext: Math.max(0, nextFloor - safe) };
}

export function totalEarnedXp(progress: Progress[]) {
  return progress.reduce((sum, item) => sum + (item.awarded_points || 0), 0);
}

export function completedCount(progress: Progress[]) {
  return progress.filter((item) => item.completed_at).length;
}
