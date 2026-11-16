import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, sans, serif } from "../theme";

const rise = (frame: number, delay: number) => ({
  opacity: interpolate(frame, [delay, delay + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }),
  translate: `0 ${interpolate(frame, [delay, delay + 22], [36, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  })}px`,
});

// Khối chữ bên trái mỗi cảnh: số thứ tự, đường dẫn, tiêu đề, mô tả, các bước.
export const Caption: React.FC<{
  index: string;
  route: string;
  title: string;
  body: string;
  steps?: readonly string[];
  width: number;
}> = ({ index, route, title, body, steps, width }) => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [4, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, ...rise(frame, 0) }}>
        <span style={{ fontFamily: serif, fontSize: 30, color: C.terra, fontWeight: 600 }}>{index}</span>
        <div style={{ height: 2, width: 90 * line, background: C.terra }} />
        <span
          style={{
            fontFamily: sans,
            fontSize: 24,
            fontWeight: 600,
            color: C.green,
            background: "rgba(17,68,54,0.09)",
            padding: "6px 16px",
            borderRadius: 999,
          }}
        >
          {route}
        </span>
      </div>
      <div style={{ fontFamily: serif, fontSize: 76, lineHeight: 1.05, fontWeight: 600, color: C.ink, ...rise(frame, 6) }}>
        {title}
      </div>
      <div style={{ fontFamily: sans, fontSize: 32, lineHeight: 1.45, color: "#3d4a44", ...rise(frame, 12) }}>{body}</div>
      {steps ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: "flex", gap: 14, alignItems: "baseline", ...rise(frame, 20 + i * 6) }}>
              <span style={{ fontFamily: sans, fontSize: 22, fontWeight: 600, color: C.paper, background: C.green, borderRadius: 999, minWidth: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: sans, fontSize: 28, color: C.ink }}>{s}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
