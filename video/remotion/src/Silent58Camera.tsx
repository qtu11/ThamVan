import React, { useContext } from "react";
import { Img, interpolate, staticFile } from "remotion";
import { ACTIONS, ActionFrame } from "./Silent58Actions";
import { C, sans, serif } from "./theme";

export const CameraDemo: React.FC = () => {
  const frame = useContext(ActionFrame);
  const captured = frame >= ACTIONS.camera.click + 5;
  const reveal = interpolate(frame, [ACTIONS.camera.click + 5, ACTIONS.camera.click + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 450, top: 16, width: 444, height: 750, boxSizing: "border-box", border: `10px solid ${C.greenDark}`, borderRadius: 37, overflow: "hidden", background: "#fffaf0", boxShadow: "0 24px 60px #092e2320, 0 2px 8px #092e230d", color: C.green, fontFamily: sans }}>
      <div style={{ height: 66, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25, fontWeight: 600 }}>{captured ? "Kết quả nhận diện" : "Chụp & khám phá"}</div>
      <div style={{ position: "absolute", left: 16, right: 16, top: 76, height: captured ? 335 : 515, borderRadius: 19, overflow: "hidden", background: C.cream }}>
        <Img src={staticFile("silent58/dragon.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        {captured ? <div style={{ position: "absolute", left: 12, top: 12, padding: "7px 12px", borderRadius: 9, background: "#fffaf0ed", fontSize: 21 }}>✓ Ảnh đã chụp</div> : <div style={{ position: "absolute", inset: 18, border: "2px solid #fffaf0cc", borderRadius: 12 }} />}
      </div>
      {captured ? (
        <div style={{ position: "absolute", left: 24, right: 24, top: 431, opacity: reveal, transform: `translateY(${12 * (1 - reveal)}px)` }}>
          <div style={{ color: C.terra, fontSize: 21, fontWeight: 600, marginBottom: 10 }}>MINH HỌA NHẬN DIỆN</div>
          <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 600, lineHeight: 1.2 }}>Hình tượng rồng</div>
          <div style={{ fontSize: 23, marginTop: 14, lineHeight: 1.5 }}>Chi tiết điêu khắc<br />Trong mỹ thuật truyền thống</div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 168, top: 607, width: 88, height: 88, boxSizing: "border-box", borderRadius: "50%", border: `5px solid ${captured ? C.green : C.paper}`, background: captured ? C.green : C.terra, boxShadow: `0 0 0 3px ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.paper }}>
        {captured ? <span style={{ fontSize: 43 }}>✓</span> : <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M7 12h7l3-5h7l3 5h6v22H7z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /><circle cx="20" cy="23" r="7" stroke="currentColor" strokeWidth="3" /></svg>}
      </div>
      <div style={{ position: "absolute", top: 706, left: 0, right: 0, textAlign: "center", fontSize: 21 }}>{captured ? "Đã lưu ảnh chụp" : "Chạm để chụp"}</div>
      {frame >= ACTIONS.camera.click && frame < ACTIONS.camera.click + 5 ? <div style={{ position: "absolute", inset: 0, background: "white", opacity: (ACTIONS.camera.click + 5 - frame) / 5 }} /> : null}
    </div>
  );
};
