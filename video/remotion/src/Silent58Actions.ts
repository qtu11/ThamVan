import { createContext } from "react";

export const ActionFrame = createContext(0);
export const ACTIONS = {
  camera: { start: 204, move: 216, click: 222, end: 264, from: [1580, 700], to: [1482, 830] },
  map: { start: 576, move: 597, click: 603, end: 636, from: [1512, 599], to: [1233, 515] },
  level: { start: 813, move: 831, click: 837, end: 861, from: [1650, 835], to: [1481, 725] },
  answer: { start: 861, move: 880, click: 888, end: 918, from: [1481, 725], to: [1528, 584] },
  planner: { start: 1074, move: 1089, click: 1095, end: 1164, from: [1555, 455], to: [1540, 430] },
  save: { start: 1221, move: 1233, click: 1239, end: 1296, from: [1085, 663], to: [1170, 845] },
} as const;

export const actionCues = Object.values(ACTIONS);
for (const [i, cue] of actionCues.entries()) {
  if (!(cue.start < cue.move && cue.move <= cue.click && cue.click < cue.end)
    || (i > 0 && actionCues[i - 1].end > cue.start)
    || [...cue.from, ...cue.to].some((n, axis) => !Number.isFinite(n) || n < 0 || n > (axis % 2 ? 980 : 1850))) {
    throw new Error(`Invalid video action ${i}`);
  }
}
