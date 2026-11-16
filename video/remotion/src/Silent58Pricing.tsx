import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, sans, serif } from "./theme";

const plans = [
  { name: "Free", price: "0", period: "Luôn miễn phí", caption: "Bắt đầu từ sự tò mò", features: ["Chụp ảnh & khám phá bản đồ", "5 thử thách mỗi ngày"] },
  { name: "Premium", price: "39.000", period: "/ tháng", caption: "Dành cho người thích khám phá", features: ["Thử thách không giới hạn", "Đọc & tải các bộ hướng dẫn"] },
  { name: "Premium Family", price: "89.000", period: "/ tháng", caption: "Cả nhà, cùng một hành trình", features: ["4 thành viên, dữ liệu riêng", "AI lên lịch trình 1–7 ngày"] },
];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const PricingScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, color: C.green, fontFamily: sans }}>
      <svg width="1920" height="1080" style={{ position: "absolute", opacity: 0.06 }}>
        <circle cx="1690" cy="215" r="345" fill="none" stroke={C.green} strokeWidth="2" />
        <circle cx="1690" cy="215" r="405" fill="none" stroke={C.green} strokeWidth="2" />
        <path d="M-120 1050C450 600 1050 1280 1930 840" fill="none" stroke={C.green} strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", top: 63, left: 114, fontFamily: serif, fontSize: 30, fontWeight: 600, letterSpacing: 3 }}>THÁM VĂN</div>
      <div style={{ position: "absolute", top: 72, right: 114, fontSize: 20, letterSpacing: 3, color: C.terra }}>GÓI HỘI VIÊN</div>
      <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", opacity: interpolate(frame, [0, 12], [0, 1], clamp) }}>
        <div style={{ fontFamily: serif, fontSize: 84, fontWeight: 600, letterSpacing: -2 }}>Chọn cách khám phá</div>
        <div style={{ fontSize: 30, marginTop: 15, color: "#536257" }}>Bắt đầu miễn phí. Mở rộng khi cần.</div>
      </div>
      <div style={{ position: "absolute", top: 354, left: 114, display: "flex", gap: 36 }}>
        {plans.map((plan, i) => {
          const p = interpolate(frame, [i * 6, i * 6 + 18], [0, 1], clamp);
          const featured = i === 1;
          return (
            <div key={plan.name} style={{ position: "relative", width: 540, height: 516, padding: "39px 36px", boxSizing: "border-box", background: featured ? C.green : "#fffaf2", color: featured ? C.paper : C.green, border: `2px solid ${featured ? C.green : "#d3c5ad"}`, borderRadius: 29, boxShadow: "0 20px 45px #092e2314", opacity: p, transform: `translateY(${40 * (1 - p)}px) scale(${0.97 + 0.03 * p})` }}>
              {featured && <div style={{ position: "absolute", top: -19, left: 36, padding: "10px 20px", background: C.terra, borderRadius: 9, fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>KHÁM PHÁ KHÔNG GIỚI HẠN</div>}
              <div style={{ fontFamily: serif, fontSize: 42, fontWeight: 600, lineHeight: 1.3 }}>{plan.name}</div>
              <div style={{ fontSize: 23, marginTop: 13, opacity: 0.8 }}>{plan.caption}</div>
              <div style={{ fontSize: 77, fontWeight: 600, letterSpacing: -2, lineHeight: 1.15, marginTop: 35 }}>{plan.price}<span style={{ fontSize: 48, marginLeft: 9 }}>đ</span></div>
              <div style={{ fontSize: 26, marginTop: 4, opacity: 0.8 }}>{plan.period}</div>
              <div style={{ height: 1, background: featured ? "#ffffff3d" : "#11443626", marginTop: 30, marginBottom: 25 }} />
              {plan.features.map((feature) => <div key={feature} style={{ display: "flex", alignItems: "center", gap: 13, fontSize: 25, lineHeight: 1.6, marginTop: 10 }}><span style={{ color: featured ? "#e4c68a" : C.terra }}>✓</span>{feature}</div>)}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 925, width: "100%", textAlign: "center", fontSize: 26, color: C.brass }}>Gói theo tháng · Không tự gia hạn hoặc tự trừ tiền</div>
    </AbsoluteFill>
  );
};
