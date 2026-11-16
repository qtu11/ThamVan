import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { actionCues as cues } from "./Silent58Actions";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const HandCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const index = cues.findIndex((cue) => frame >= cue.start && frame < cue.end);
  if (index < 0) return null;
  const cue = cues[index];
  const move = interpolate(frame, [cue.start, cue.move], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const x = cue.from[0] + (cue.to[0] - cue.from[0]) * move;
  const y = cue.from[1] + (cue.to[1] - cue.from[1]) * move;
  const appear = cues[index - 1]?.end === cue.start ? 1 : interpolate(frame, [cue.start, cue.start + 7], [0, 1], clamp);
  const disappear = cues[index + 1]?.start === cue.end ? 1 : interpolate(frame, [cue.end - 7, cue.end], [1, 0], clamp);
  const age = frame - cue.click;
  const press = interpolate(age, [-3, 0, 5, 10], [1, 0.83, 0.96, 1], clamp);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: appear * disappear }}>
      {[0, 6].map((delay) => {
        const elapsed = age - delay;
        if (elapsed < 0 || elapsed > 20) return null;
        const radius = interpolate(elapsed, [0, 20], [8, 34]);
        return <div key={delay} style={{ position: "absolute", left: x - radius, top: y - radius, width: radius * 2, height: radius * 2, boxSizing: "border-box", border: "3px solid #c9a35c", borderRadius: "50%", opacity: 0.9 * (1 - elapsed / 20) }} />;
      })}
      <svg width="58" height="76" viewBox="0 0 64 84" style={{ position: "absolute", left: x - 23, top: y - 3, overflow: "visible", transform: `scale(${press})`, transformOrigin: "23px 3px", filter: "drop-shadow(0 4px 4px #092e2366)" }}>
        <path d="M19 43V10C19 0 32 0 32 10V30C32 22 43 23 43 32V35C43 28 54 28 54 37V42C54 35 63 36 63 45V56C63 65 55 74 52 81H27C25 74 20 70 16 65L3 49C-1 44 7 38 12 43L19 50Z" fill="#114436" stroke="#fffaf0" strokeWidth="4" strokeLinejoin="round" />
        <path d="M32 30V48M43 35V50M54 42V54" fill="none" stroke="#fffaf0" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </AbsoluteFill>
  );
};
