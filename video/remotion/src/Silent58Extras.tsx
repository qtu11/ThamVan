import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, sans, serif } from "./theme";
import { ACTIONS, ActionFrame } from "./Silent58Actions";

export const NearbyNotice: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [8, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ripple = interpolate(frame, [0, 150], [0.9, 1.14], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: sans }}>
      <svg width="1000" height="810" viewBox="0 0 1000 810" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="nearby-grid" width="82" height="82" patternUnits="userSpaceOnUse">
            <path d="M82 0H0V82" fill="none" stroke={C.green} strokeWidth="1" opacity="0.08" />
          </pattern>
        </defs>
        <rect x="12" y="68" width="976" height="672" rx="45" fill={C.cream} />
        <rect x="12" y="68" width="976" height="672" rx="45" fill="url(#nearby-grid)" />
        <path d="M-10 505C180 180 360 710 600 410S890 220 1020 100" fill="none" stroke="#d6e3d5" strokeWidth="90" />
        <path d="M-10 505C180 180 360 710 600 410S890 220 1020 100" fill="none" stroke={C.paper} strokeWidth="24" />
        <circle cx="278" cy="383" r={190 * ripple} fill={C.green} fillOpacity="0.04" stroke={C.green} strokeOpacity="0.16" strokeDasharray="8 13" strokeWidth="2" />
        <circle cx="278" cy="383" r="132" fill="none" stroke={C.green} strokeOpacity="0.09" strokeWidth="2" />
        <circle cx="278" cy="383" r="14" fill={C.green} stroke={C.paper} strokeWidth="6" />
        {[[125, 264], [329, 211], [184, 530]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="25" fill={C.paper} stroke={C.green} strokeWidth="2" />
            <path d="M-11 0L0-8L11 0M-9 3H9M-7 3V12M0 3V12M7 3V12M-10 13H10" fill="none" stroke={C.green} strokeWidth="2" />
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", left: 72, top: 610, color: C.green, fontSize: 35, fontWeight: 600, opacity: frame >= 18 ? 1 : 0 }}>3 km</div>
      <div style={{ position: "absolute", left: 385, top: 12, width: 500, height: 780, borderRadius: 64, border: "9px solid #183d33", background: C.greenDark, overflow: "hidden", boxShadow: "0 28px 70px #092e232b" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 10% 10%, #4c7e64 0%, transparent 60%), linear-gradient(145deg, transparent 40%, #1c5741 40.4%, #0d382b 75%)" }} />
        <div style={{ position: "absolute", width: 160, height: 28, top: 14, left: 160, background: "#08271e", borderRadius: 20 }} />
        <div style={{ position: "absolute", top: 88, width: "100%", textAlign: "center", color: C.paper }}>
          <div style={{ fontSize: 29, marginBottom: 2, opacity: 0.85 }}>15/11</div>
          <div style={{ fontSize: 112, fontWeight: 500, letterSpacing: -5, lineHeight: 1.2 }}>9:41</div>
        </div>
        <div style={{ position: "absolute", left: 20, right: 20, top: 310, padding: "24px 25px 27px", borderRadius: 28, background: "#f6efe1f2", color: C.ink, opacity: enter, transform: `translateY(${(1 - enter) * -38}px)`, boxShadow: "0 10px 28px #00000012" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 17 }}>
            <div style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", background: C.green, color: C.paper, borderRadius: 11, fontFamily: serif, fontSize: 24 }}>T</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1.3 }}>THÁM VĂN</div>
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.42, fontWeight: 600 }}>Có địa điểm thú vị gần bạn!</div>
          <div style={{ fontSize: 25, lineHeight: 1.5, marginTop: 9 }}>Trong bán kính 3 km.</div>
        </div>
        <svg width="35" height="40" viewBox="0 0 35 40" style={{ position: "absolute", bottom: 80, left: 225, opacity: 0.65 }}>
          <rect x="6" y="17" width="23" height="20" rx="5" fill="none" stroke={C.paper} strokeWidth="3" />
          <path d="M11 17V11C11 1 25 1 25 11V17" fill="none" stroke={C.paper} strokeWidth="3" />
        </svg>
        <div style={{ position: "absolute", width: 150, height: 5, borderRadius: 4, background: C.paper, bottom: 18, left: 166, opacity: 0.5 }} />
      </div>
      <div style={{ position: "absolute", left: 52, top: 705, padding: "13px 20px", borderRadius: 13, background: "#f0cfb2", color: "#79340f", fontSize: 26, fontWeight: 600, boxShadow: "0 8px 24px #092e2310" }}>Định hướng phát triển</div>
    </div>
  );
};

export const PlannerVisual: React.FC = () => {
  const frame = React.useContext(ActionFrame);
  const created = frame >= ACTIONS.planner.click + 5;
  const results = [
    { day: "Ngày 1", title: "Bưu điện Trung tâm Sài Gòn", photo: "post-office.jpg" },
    { day: "Ngày 2", title: "Dinh Độc Lập", photo: "independence-palace.jpg" },
  ];
  return (
    <div style={{ position: "absolute", left: 42, top: 38, width: 910, height: 730, padding: "38px 36px", boxSizing: "border-box", background: C.paper, border: "1px solid #11443620", borderRadius: 37, boxShadow: "0 28px 70px #092e231c", fontFamily: sans, color: C.ink }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 27 }}>
        <div style={{ fontSize: 21, letterSpacing: 2, fontWeight: 600 }}>THÁM VĂN</div>
        <div style={{ fontSize: 22, background: C.cream, color: C.brass, borderRadius: 11, padding: "10px 16px" }}>Lịch trình minh họa</div>
      </div>
      <div style={{ display: "flex", gap: 15, marginBottom: 31 }}>
        <div style={{ flex: "0 0 220px", padding: "18px 22px", background: "#ffffffa8", border: "1px solid #11443618", borderRadius: 18 }}>
          <div style={{ fontSize: 21, opacity: 0.68, marginBottom: 6 }}>Thời gian</div>
          <div style={{ fontSize: 29, fontWeight: 500 }}>2 ngày</div>
        </div>
        <div style={{ flex: 1, padding: "18px 22px", background: "#ffffffa8", border: "1px solid #11443618", borderRadius: 18 }}>
          <div style={{ fontSize: 21, opacity: 0.68, marginBottom: 6 }}>Sở thích</div>
          <div style={{ fontSize: 29, fontWeight: 500 }}>Lịch sử · Kiến trúc</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 520, top: 222, width: 354, height: 64, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: C.green, color: C.paper, fontSize: 25, fontWeight: 600 }}>{created ? "✓ Đã tạo lịch trình" : "Tạo lịch trình"}</div>
      <div style={{ position: "absolute", left: 36, right: 36, top: 319, opacity: created ? 1 : 0 }}>
        <div style={{ position: "absolute", top: 40, bottom: 65, left: 20, width: 2, background: "#11443625" }} />
        {results.map((stop, i) => {
          const enter = interpolate(frame, [ACTIONS.planner.click + 5 + i * 9, ACTIONS.planner.click + 18 + i * 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={stop.day} style={{ display: "flex", alignItems: "center", gap: 21, marginBottom: 23, opacity: enter, transform: `translateY(${(1 - enter) * 20}px)` }}>
              <div style={{ zIndex: 1, width: 41, height: 41, flexShrink: 0, borderRadius: "50%", background: C.green, color: C.paper, display: "flex", justifyContent: "center", alignItems: "center", fontSize: 21, boxShadow: `0 0 0 7px ${C.paper}` }}>{i + 1}</div>
              <div style={{ display: "flex", flex: 1, height: 174, overflow: "hidden", borderRadius: 21, background: "#ffffffbd", border: "1px solid #11443612" }}>
                <Img src={staticFile(`silent58/${stop.photo}`)} style={{ width: 229, height: "100%", objectFit: "cover" }} />
                <div style={{ padding: "23px 25px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 21, color: C.brass, marginBottom: 10, fontWeight: 500 }}>{stop.day}</div>
                  <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 500, lineHeight: 1.35 }}>{stop.title}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
