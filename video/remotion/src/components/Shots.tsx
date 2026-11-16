import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C } from "../theme";
import measured from "../../public/shots/rects.json";

type Rect = readonly [number, number, number, number];
// Vùng nổi bật đo từ DOM thật lúc chụp (capture.mjs); ưu tiên hơn số nhập tay.
export const ringOf = (shot: Shot): Rect | undefined =>
  (measured as unknown as Record<string, Rect>)[shot.src.replace(/\.png$/, "")] ?? shot.ring;

// Một ảnh chụp màn hình với chuyển động camera: zoom từ `from` tới `to`.
// cx, cy: tâm khung nhìn (0–1 theo ảnh); s: độ phóng.
export type Cam = readonly [fx: number, fy: number, s: number];
export type Shot = {
  readonly src: string;
  readonly url: string;
  readonly dur: number;
  readonly from: Cam;
  readonly to: Cam;
  // Khung làm nổi bật vùng chức năng: [x, y, w, h] theo tỉ lệ ảnh.
  readonly ring?: readonly [number, number, number, number];
};

export const XFADE = 14;

export const shotsDuration = (shots: readonly Shot[]) =>
  shots.reduce((sum, s) => sum + s.dur, 0) - XFADE * (shots.length - 1);

const ease = Easing.bezier(0.65, 0, 0.35, 1);

// Camera: điểm ảnh p hiện ở vị trí t + s·p (tỉ lệ khung). Đưa tâm (cx, cy) vào giữa khung,
// rồi kẹp để ảnh luôn phủ kín khung (không lộ nền ở mép).
const clamp01 = (v: number, s: number) => Math.min(0, Math.max(1 - s, v));
const clampTranslate = (tx: number, ty: number, s: number) => ({ tx: clamp01(tx, s), ty: clamp01(ty, s) });
const frameAt = ([cx, cy, s]: Cam) => clampTranslate(0.5 - cx * s, 0.5 - cy * s, s);

// Zoom sao cho vùng nổi bật chiếm ~70% khung, tối đa 1.9 lần.
export const fitRing = ([x, y, w, h]: readonly [number, number, number, number]): Cam => {
  const s = Math.min(1.9, Math.max(1, Math.min(0.7 / w, 0.7 / h)));
  return [x + w / 2, y + h / 2, s];
};

const ShotView: React.FC<{ shot: Shot; first: boolean; last: boolean }> = ({
  shot,
  first,
  last,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [8, shot.dur - 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const ring = ringOf(shot);
  const to = ring ? fitRing(ring) : shot.to;
  const s = shot.from[2] + (to[2] - shot.from[2]) * t;
  // Nội suy vị trí đã đóng khung (không phải tâm) để camera lia thẳng, không giật ở mép.
  const a = frameAt(shot.from);
  const b = frameAt(to);
  const tx = a.tx + (b.tx - a.tx) * t;
  const ty = a.ty + (b.ty - a.ty) * t;
  const sc = clampTranslate(tx, ty, s);
  const opacity = Math.min(
    first ? 1 : interpolate(frame, [0, XFADE], [0, 1], { extrapolateRight: "clamp" }),
    last ? 1 : interpolate(frame, [shot.dur - XFADE, shot.dur], [1, 0], { extrapolateLeft: "clamp" }),
  );
  const ringOpacity = interpolate(
    frame,
    [shot.dur * 0.18, shot.dur * 0.3, shot.dur * 0.8, shot.dur * 0.92],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const ringGrow = interpolate(frame, [shot.dur * 0.18, shot.dur * 0.32], [1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transformOrigin: "0 0",
          translate: `${sc.tx * 100}% ${sc.ty * 100}%`,
          scale: String(s),
        }}
      >
        <Img
          src={staticFile(`shots/${shot.src}`)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
        {ring ? (
          <div
            style={{
              position: "absolute",
              left: `${ring[0] * 100}%`,
              top: `${ring[1] * 100}%`,
              width: `${ring[2] * 100}%`,
              height: `${ring[3] * 100}%`,
              border: `3px solid ${C.terra}`,
              borderRadius: 14,
              boxShadow: `0 0 0 9999px rgba(4,46,35,${0.2 * ringOpacity})`,
              opacity: ringOpacity,
              scale: String(ringGrow),
            }}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Phát các ảnh nối tiếp, chồng mờ XFADE khung hình giữa hai ảnh.
export const ShotSequence: React.FC<{ shots: readonly Shot[] }> = ({ shots }) => {
  let start = 0;
  return (
    <AbsoluteFill>
      {shots.map((shot, i) => {
        const from = start;
        start += shot.dur - XFADE;
        return (
          <Sequence key={shot.src + i} name={shot.src} from={from} durationInFrames={shot.dur}>
            <ShotView shot={shot} first={i === 0} last={i === shots.length - 1} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// URL hiện tại theo ảnh đang chiếu (dùng cho thanh địa chỉ).
export const useCurrentUrl = (shots: readonly Shot[]) => {
  const frame = useCurrentFrame();
  let start = 0;
  for (const shot of shots) {
    if (frame < start + shot.dur - XFADE / 2) return shot.url;
    start += shot.dur - XFADE;
  }
  return shots[shots.length - 1].url;
};
