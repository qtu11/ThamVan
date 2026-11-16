import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, sans, serif, serifItalic } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);

// Chữ hiện từng từ, trượt lên từ dưới mặt nạ.
const Words: React.FC<{ text: string; delay: number; style: React.CSSProperties; step?: number }> = ({ text, delay, style, step = 4 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.28em", ...style }}>
      {text.split(" ").map((w, i) => (
        <span key={i} style={{ overflow: "hidden", display: "inline-block", paddingBottom: "0.08em" }}>
          <span
            style={{
              display: "inline-block",
              translate: `0 ${interpolate(frame, [delay + i * step, delay + i * step + 22], [110, 0], { ...clamp, easing: out })}%`,
            }}
          >
            {w}
          </span>
        </span>
      ))}
    </div>
  );
};

const GreenBg: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(110% 90% at 50% 40%, ${C.green} 0%, ${C.greenDark} 70%)` }}>
      <AbsoluteFill
        style={{
          opacity: 0.07,
          scale: String(interpolate(frame, [0, 200], [1.12, 1.0], clamp)),
        }}
      >
        <Img src={staticFile("shots/home.png")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) blur(8px)" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const rule = interpolate(frame, [20, 60], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: C.paper }}>
      <GreenBg />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={{ fontFamily: sans, fontSize: 26, letterSpacing: 8, fontWeight: 600, color: "#d9c79c", opacity: interpolate(frame, [0, 20], [0, 1], clamp) }}>
          SỔ TAY THỰC ĐỊA DI SẢN SÀI GÒN
        </div>
        <Words text="THÁM VĂN" delay={6} step={7} style={{ fontFamily: serif, fontSize: 190, fontWeight: 600, letterSpacing: 6, lineHeight: 1 }} />
        <div style={{ height: 2, width: 520 * rule, background: "#d9c79c" }} />
        <Words text="Đi để thấy. Chạm để hiểu." delay={40} style={{ fontFamily: serifItalic, fontStyle: "italic", fontSize: 64 }} />
      </div>
    </AbsoluteFill>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: C.paper }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: C.ink, scale: String(interpolate(frame, [0, 400], [0.96, 1.08], clamp)) }}>
        <Words text="Đừng chỉ đến." delay={0} style={{ fontFamily: serif, fontSize: 120, fontWeight: 600 }} />
        <div style={{ display: "flex", gap: "0.28em", fontFamily: serif, fontSize: 120, fontWeight: 600 }}>
          <Words text="Hãy" delay={12} style={{}} />
          <Words text="chạm" delay={16} style={{ fontFamily: serifItalic, fontStyle: "italic", color: C.terra }} />
        </div>
        <Words text="vào Sài Gòn." delay={22} style={{ fontFamily: serif, fontSize: 120, fontWeight: 600 }} />
        <div style={{ marginTop: 34, fontFamily: sans, fontSize: 34, color: "#3d4a44", opacity: interpolate(frame, [40, 60], [0, 1], clamp) }}>
          1.426 địa điểm di sản · tư liệu có nguồn · 3 ngôn ngữ
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Ba ngôn ngữ: ba ảnh trang chủ xếp chồng, lần lượt lật lên phía trước.
export const Languages: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    { src: "home.png", label: "Tiếng Việt" },
    { src: "home-en.png", label: "English" },
    { src: "home-zh.png", label: "中文" },
  ];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.paper}, ${C.cream})`, alignItems: "center" }}>
      <div style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span style={{ fontFamily: sans, fontSize: 24, fontWeight: 600, color: C.green, background: "rgba(17,68,54,0.09)", padding: "6px 16px", borderRadius: 999 }}>
          /vi · /en · /zh
        </span>
        <Words text="Một Sài Gòn, ba ngôn ngữ." delay={0} style={{ fontFamily: serif, fontSize: 76, fontWeight: 600, color: C.ink }} />
      </div>
      <div style={{ position: "relative", width: 1920, height: 700, scale: String(interpolate(frame, [80, 400], [1, 1.07], clamp)), translate: `0 ${interpolate(frame, [80, 400], [0, -20], clamp)}px` }}>
        {items.map((it, i) => {
          const p = interpolate(frame, [18 + i * 26, 50 + i * 26], [0, 1], { ...clamp, easing: out });
          const x = (i - 1) * 520;
          return (
            <div key={it.src} style={{ position: "absolute", left: 960 - 380 + x, top: 90, width: 760, opacity: p, translate: `0 ${(1 - p) * 120}px`, rotate: `${(i - 1) * 3 * p}deg` }}>
              <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 70px rgba(4,46,35,0.25)" }}>
                <Img src={staticFile(`shots/${it.src}`)} style={{ width: 760, display: "block" }} />
              </div>
              <div style={{ textAlign: "center", marginTop: 22, fontFamily: sans, fontSize: 34, fontWeight: 600, color: C.green }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const btn = interpolate(frame, [40, 64], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: C.paper }}>
      <GreenBg />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        <Words text="THÁM VĂN" delay={0} step={7} style={{ fontFamily: serif, fontSize: 150, fontWeight: 600, letterSpacing: 6 }} />
        <Words text="Khám phá Sài Gòn qua từng câu chuyện." delay={16} step={3} style={{ fontFamily: serifItalic, fontStyle: "italic", fontSize: 56 }} />
        <div
          style={{
            marginTop: 20,
            opacity: btn,
            scale: String(0.9 + 0.1 * btn),
            background: C.paper,
            color: C.green,
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 36,
            padding: "22px 48px",
            borderRadius: 999,
          }}
        >
          Bắt đầu khám phá →
        </div>
      </div>
    </AbsoluteFill>
  );
};
