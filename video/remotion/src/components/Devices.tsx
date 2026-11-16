import React from "react";
import { AbsoluteFill } from "remotion";
import { C, DOMAIN, sans } from "../theme";
import { Shot, ShotSequence, useCurrentUrl } from "./Shots";

const UrlBar: React.FC<{ shots: readonly Shot[] }> = ({ shots }) => {
  const url = useCurrentUrl(shots);
  return (
    <div
      style={{
        flex: 1,
        height: 34,
        borderRadius: 17,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        paddingLeft: 18,
        fontFamily: sans,
        fontSize: 19,
        color: "#5b5b5b",
        gap: 10,
      }}
    >
      <span style={{ color: C.green }}>●</span>
      <span>
        {DOMAIN}<b style={{ color: C.ink, fontWeight: 600 }}>{url}</b>
      </span>
    </div>
  );
};

// Khung trình duyệt; nội dung tỉ lệ 16:9 khớp ảnh 1600×900.
export const Browser: React.FC<{
  shots: readonly Shot[];
  width: number;
  style?: React.CSSProperties;
}> = ({ shots, width, style }) => {
  const contentH = (width * 9) / 16;
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: "hidden",
        background: "#e7dfcd",
        boxShadow: "0 40px 90px rgba(4,46,35,0.28), 0 8px 24px rgba(4,46,35,0.14)",
        ...style,
      }}
    >
      <div style={{ height: 56, display: "flex", alignItems: "center", gap: 18, padding: "0 20px" }}>
        <div style={{ display: "flex", gap: 9 }}>
          {["#e06c5a", "#e3b34e", "#5fae6b"].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
          ))}
        </div>
        <UrlBar shots={shots} />
      </div>
      <div style={{ position: "relative", width, height: contentH }}>
        <ShotSequence shots={shots} />
      </div>
    </div>
  );
};

// Khung điện thoại; màn hình tỉ lệ 390×844.
export const Phone: React.FC<{
  shots: readonly Shot[];
  height: number;
  style?: React.CSSProperties;
}> = ({ shots, height, style }) => {
  const bezel = 14;
  const screenH = height - bezel * 2;
  const screenW = (screenH * 390) / 844;
  return (
    <div
      style={{
        width: screenW + bezel * 2,
        height,
        borderRadius: 64,
        background: "#0d1512",
        padding: bezel,
        boxShadow: "0 40px 90px rgba(4,46,35,0.32), inset 0 0 0 2px #2c3a35",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: screenW, height: screenH, borderRadius: 50, overflow: "hidden", background: C.paper }}>
        <ShotSequence shots={shots} />
        <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
          <div style={{ marginTop: 12, width: 118, height: 34, borderRadius: 17, background: "#0d1512" }} />
        </AbsoluteFill>
      </div>
    </div>
  );
};
