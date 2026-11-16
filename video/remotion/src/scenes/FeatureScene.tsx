import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Browser, Phone } from "../components/Devices";
import { Caption } from "../components/Caption";
import { Shot } from "../components/Shots";
import { C, serif } from "../theme";

export type FeatureProps = {
  readonly index: string;
  readonly route: string;
  readonly title: string;
  readonly body: string;
  readonly steps?: readonly string[];
  readonly device: "browser" | "phone" | "browser+phone" | "phones";
  readonly shots: readonly Shot[];
  readonly shots2?: readonly Shot[];
};

const Paper: React.FC<{ index: string }> = ({ index }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 85% 30%, #fbf6ea 0%, ${C.paper} 45%, ${C.cream} 100%)` }}>
      <div
        style={{
          position: "absolute",
          left: 40,
          bottom: -120,
          fontFamily: serif,
          fontSize: 520,
          fontWeight: 600,
          color: "rgba(17,68,54,0.045)",
          translate: `${interpolate(frame, [0, 300], [0, -40])}px 0`,
        }}
      >
        {index}
      </div>
    </AbsoluteFill>
  );
};

// Thiết bị trượt vào từ phải, xoay 3D nhẹ rồi ổn định; sau đó trôi chậm.
const useEntrance = (delay = 0) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return {
    opacity: p,
    translate: `${(1 - p) * 220}px ${(1 - p) * 30}px`,
    rotate: `y ${(1 - p) * -14}deg`,
    scale: String(0.96 + 0.04 * p + interpolate(frame, [34, 400], [0, 0.025], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
  } as React.CSSProperties;
};

export const FeatureScene: React.FC<FeatureProps> = (p) => {
  const enter = useEntrance(4);
  const enter2 = useEntrance(14);
  return (
    <AbsoluteFill>
      <Paper index={p.index} />
      <AbsoluteFill style={{ perspective: 1800 }}>
        <div style={{ position: "absolute", left: 100, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
          <Caption index={p.index} route={p.route} title={p.title} body={p.body} steps={p.steps} width={p.device.startsWith("browser") ? 530 : 640} />
        </div>
        {p.device === "browser" ? (
          <Browser shots={p.shots} width={1160} style={{ position: "absolute", right: 90, top: 166, ...enter }} />
        ) : null}
        {p.device === "browser+phone" ? (
          <>
            <Browser shots={p.shots} width={1000} style={{ position: "absolute", right: 200, top: 150, ...enter }} />
            {p.shots2 ? <Phone shots={p.shots2} height={660} style={{ position: "absolute", right: 90, top: 330, ...enter2 }} /> : null}
          </>
        ) : null}
        {p.device === "phone" ? (
          <Phone shots={p.shots} height={900} style={{ position: "absolute", right: 300, top: 90, ...enter }} />
        ) : null}
        {p.device === "phones" ? (
          <>
            <Phone shots={p.shots} height={860} style={{ position: "absolute", right: 520, top: 110, ...enter }} />
            {p.shots2 ? <Phone shots={p.shots2} height={860} style={{ position: "absolute", right: 120, top: 110, ...enter2 }} /> : null}
          </>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
