import React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C, sans, serif } from "./theme";
import { NearbyNotice, PlannerVisual } from "./Silent58Extras";
import { PricingScene } from "./Silent58Pricing";
import { HandCursor } from "./Silent58Cursor";
import { ActionFrame, ACTIONS } from "./Silent58Actions";
import { CameraDemo } from "./Silent58Camera";

export const SILENT58_DURATION = 58 * 30;
export const SILENT58_SCENES = [0, 6, 13, 18, 22, 26, 31, 35, 40, 44, 52, 58];
const TRANSITION = 18;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const shadow = "0 24px 60px #092e2320, 0 2px 8px #092e230d";
const asset = (name: string) => staticFile(`silent58/${name}`);
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const enter = (frame: number, delay = 0): React.CSSProperties => {
  const p = interpolate(frame, [delay, delay + 22], [0, 1], { ...clamp, easing: ease });
  return { opacity: p, transform: `translateY(${56 * (1 - p)}px)` };
};

const Brand: React.FC<{ light?: boolean }> = ({ light }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, color: light ? C.paper : C.green }}>
    <Img src={asset("logo.png")} style={{ width: 48, height: 48, objectFit: "contain", borderRadius: "50%", background: C.paper }} />
    <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 28, letterSpacing: 3 }}>THÁM VĂN</span>
  </div>
);

const Paper: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 85% 25%, #fffaf0 0%, ${C.paper} 55%, ${C.cream} 100%)` }}>
    <svg width="1920" height="1080" style={{ position: "absolute", opacity: 0.05 }}>
      <path d="M1200 -100C450 220 1840 400 1160 1180M1490 -100C740 220 2130 400 1450 1180M-100 870C600 600 400 1320 1200 830" fill="none" stroke={C.green} strokeWidth="2" />
      <circle cx="1580" cy="260" r="315" fill="none" stroke={C.green} />
      <circle cx="1580" cy="260" r="370" fill="none" stroke={C.green} />
    </svg>
  </AbsoluteFill>
);

const Photo: React.FC<{ src: string; label?: string; fit?: "cover" | "contain"; style: React.CSSProperties }> = ({ src, label, fit = "cover", style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", overflow: "hidden", borderRadius: 26, boxShadow: shadow, background: C.cream, ...style }}>
      <Img src={asset(src)} style={{ width: "100%", height: "100%", objectFit: fit, transform: `scale(${fit === "contain" ? 1 : interpolate(frame, [0, 210], [1.03, 1.08], clamp)})` }} />
      {label ? <div style={{ position: "absolute", bottom: 17, left: 18, padding: "8px 16px", background: "#fffaf0ed", borderRadius: 10, color: C.green, fontFamily: sans, fontWeight: 600, fontSize: 22 }}>{label}</div> : null}
    </div>
  );
};

const Screen: React.FC<{ src: string; width: number; style?: React.CSSProperties }> = ({ src, width, style }) => (
  <div style={{ position: "absolute", width, padding: 10, borderRadius: 37, background: "#183b30", boxShadow: shadow, ...style }}>
    <Img src={asset(src)} style={{ width: "100%", height: "auto", display: "block", borderRadius: 28 }} />
  </div>
);

const Crop: React.FC<{
  src: string;
  image: readonly [number, number];
  view: readonly [number, number, number, number];
  width: number;
  height: number;
  style?: React.CSSProperties;
}> = ({ src, image, view: [x, y, w, h], width, height, style }) => {
  const scale = Math.max(width / w, height / h);
  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden", borderRadius: 24, boxShadow: shadow, background: C.paper, ...style }}>
      <Img src={asset(src)} style={{ position: "absolute", width: image[0] * scale, height: image[1] * scale, maxWidth: "none", left: -x * scale + (width - w * scale) / 2, top: -y * scale + (height - h * scale) / 2 }} />
    </div>
  );
};

const Feature: React.FC<{ number: string; eyebrow: string; title: string; body?: string; children: React.ReactNode }> = ({ number, eyebrow, title, body, children }) => {
  const frame = useCurrentFrame();
  const visual = interpolate(frame, [4, 24], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{ position: "absolute", left: 90, top: 58 }}><Brand /></div>
      <div style={{ position: "absolute", right: 92, top: 75, fontFamily: sans, fontSize: 18, letterSpacing: 3, color: "#637366" }}>KHÁM PHÁ VIỆT NAM</div>
      <div style={{ position: "absolute", left: 92, top: 263, width: 637, color: C.ink }}>
        <div style={{ fontFamily: sans, color: C.terra, fontSize: 21, fontWeight: 600, letterSpacing: 2, marginBottom: 30, ...enter(frame) }}>{number} / {eyebrow}</div>
        <div style={{ fontFamily: serif, fontSize: 68, lineHeight: 1.2, fontWeight: 600, whiteSpace: "pre-line", letterSpacing: -1.5, ...enter(frame, 3) }}>{title}</div>
        {body ? <div style={{ fontFamily: sans, fontSize: 32, lineHeight: 1.55, marginTop: 31, maxWidth: 590, color: "#536257", ...enter(frame, 10) }}>{body}</div> : null}
        <div style={{ width: 72, height: 4, marginTop: 36, borderRadius: 4, background: C.terra, ...enter(frame, 14) }} />
      </div>
      <div style={{ position: "absolute", left: 810, top: 153, width: 1000, height: 810, opacity: visual, transform: `translateY(${80 * (1 - visual)}px) scale(${0.94 + 0.06 * visual})` }}>{children}</div>
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{ position: "absolute", left: 92, top: 59 }}><Brand /></div>
      <div style={{ position: "absolute", left: 92, top: 254, width: 730, color: C.green }}>
        <div style={{ fontFamily: sans, fontSize: 21, letterSpacing: 3, color: C.terra, fontWeight: 600, ...enter(frame) }}>DU LỊCH · VĂN HÓA · CÔNG NGHỆ</div>
        <div style={{ fontFamily: serif, fontSize: 122, fontWeight: 600, letterSpacing: -4, lineHeight: 1.25, marginTop: 25, ...enter(frame, 3) }}>THÁM VĂN</div>
        <div style={{ fontFamily: serif, fontSize: 56, lineHeight: 1.22, fontWeight: 500, marginTop: 14, ...enter(frame, 10) }}>Nền tảng du lịch<br />thông minh.</div>
        <div style={{ fontFamily: sans, fontSize: 33, lineHeight: 1.5, marginTop: 32, maxWidth: 660, color: "#536257", ...enter(frame, 17) }}>Khám phá lịch sử, văn hóa<br />và điểm đến tại Việt Nam.</div>
      </div>
      <div style={enter(frame, 6)}>
        <Photo src="post-office.jpg" label="Bưu điện Trung tâm Sài Gòn" style={{ left: 883, top: 165, width: 900, height: 491, transform: "rotate(-2deg)", opacity: frame < 180 - TRANSITION ? 1 : 0 }} />
        <Photo src="temple-roof.jpg" label="Chùa Bà Thiên Hậu · TP.HCM" style={{ left: 832, top: 615, width: 530, height: 310, transform: "rotate(3deg)", border: "8px solid #fffaf0" }} />
        <Screen src="home.png" width={273} style={{ left: 1460, top: 441, transform: "rotate(4deg)" }} />
      </div>
    </AbsoluteFill>
  );
};

const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  return (
  <Feature number="01" eyebrow="CHỤP & TÌM HIỂU" title={"Chụp kiến trúc,\nlinh vật,\nhiện vật."} body="AI giúp bạn tìm hiểu thông tin và câu chuyện liên quan.">
    <Photo src="post-office.jpg" label="Kiến trúc" style={{ left: 0, top: 70, width: 387, height: 290, transform: "rotate(-3deg)", opacity: frame >= TRANSITION ? 1 : 0 }} />
    <Photo src="dragon.png" label="Chi tiết rồng" fit="contain" style={{ left: 12, top: 414, width: 357, height: 280, transform: "rotate(3deg)", opacity: frame < 210 - TRANSITION ? 1 : 0 }} />
    <CameraDemo />
  </Feature>
  );
};

const Culture: React.FC = () => {
  const frame = useCurrentFrame();
  return (
  <Feature number="02" eyebrow="VĂN HÓA ĐỊA PHƯƠNG" title={"Tìm hiểu lễ hội,\ntrang phục"} body="và nghề truyền thống qua hình ảnh.">
    <Crop src="culture.png" image={[525, 908]} view={[26, 79, 474, 759]} width={460} height={736} style={{ left: 4, top: 28, transform: "rotate(-2deg)" }} />
    <div style={{ position: "absolute", left: 501, top: 72, width: 444, height: 600, padding: 26, boxSizing: "border-box", borderRadius: 27, background: "#fffaf0", boxShadow: shadow, transform: "rotate(3deg)" }}>
      <div style={{ width: "100%", height: 410, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 19, background: "white", overflow: "hidden" }}><Img src={asset("dragon.png")} style={{ width: "100%", height: "100%", objectFit: "contain", opacity: frame >= TRANSITION ? 1 : 0 }} /></div>
      <div style={{ fontFamily: serif, color: C.green, fontSize: 35, lineHeight: 1.3, marginTop: 22 }}>Hình tượng rồng</div>
      <div style={{ fontFamily: sans, color: C.brass, fontSize: 23, marginTop: 12 }}>Trong mỹ thuật truyền thống</div>
    </div>
  </Feature>
  );
};

const Map: React.FC = () => {
  const frame = useCurrentFrame();
  const opened = React.useContext(ActionFrame) >= ACTIONS.map.click + 5;
  return (
    <Feature number="03" eyebrow="BẢN ĐỒ QUANH BẠN" title={"Mở bản đồ,\ntìm điểm đến"} body="trong bán kính 3 km quanh bạn.">
      <Crop src="map-clean.png" image={[1760, 907]} view={[552, 145, 1078, 710]} width={963} height={671} style={{ left: 5, top: 60, border: "8px solid #fffaf0" }} />
      <div style={{ position: "absolute", left: 38, top: 520, width: 337, height: 166, boxSizing: "border-box", padding: "22px 28px", background: C.green, color: C.paper, borderRadius: 24, boxShadow: shadow, ...enter(frame, 15), opacity: frame < 120 - TRANSITION ? 1 : 0 }}>
        <div style={{ fontFamily: sans, fontSize: 23, opacity: 0.84 }}>Bán kính tìm kiếm</div>
        <div style={{ fontFamily: serif, fontSize: 76, fontWeight: 600, lineHeight: 1.2 }}>3 km <span style={{ fontSize: 36 }}>⌖</span></div>
      </div>
      <div style={{ position: "absolute", left: 395, top: 334, width: 56, height: 56, border: `4px solid ${C.paper}`, background: opened ? C.terra : C.green, color: C.paper, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontSize: 33, boxShadow: shadow }}>⌖</div>
      <div style={{ position: "absolute", left: 329, top: 286, padding: "8px 15px", borderRadius: 10, background: C.paper, color: C.green, fontFamily: sans, fontSize: 22, boxShadow: shadow }}>Bưu điện Trung tâm</div>
      {opened && <div style={{ position: "absolute", left: 479, top: 247, width: 427, overflow: "hidden", borderRadius: 24, background: "#fffaf0", boxShadow: shadow }}>
        <Img src={asset("post-office.jpg")} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
        <div style={{ padding: "22px 26px", color: C.green }}><div style={{ fontFamily: serif, fontSize: 33, lineHeight: 1.3 }}>Bưu điện Trung tâm<br />Sài Gòn</div><div style={{ fontFamily: sans, fontSize: 23, marginTop: 15, color: C.brass }}>Kiến trúc · TP.HCM</div></div>
      </div>}
    </Feature>
  );
};

const Notice: React.FC = () => (
  <Feature number="04" eyebrow="GỢI Ý QUA THÔNG BÁO" title={"Có địa điểm\nthú vị gần bạn!"} body="Trong bán kính 3 km."><NearbyNotice /></Feature>
);

const Challenges: React.FC = () => {
  const frame = React.useContext(ActionFrame);
  const selected = frame >= ACTIONS.level.click + 5;
  const answered = frame >= ACTIONS.answer.click + 5;
  return (
    <Feature number="05" eyebrow="CHƠI & KHÁM PHÁ" title={"Đoán địa danh.\nGiải đố văn hóa."} body="Chọn thử thách từ dễ đến khó.">
      <Crop src="challenges.png" image={[478, 942]} view={[14, 128, 454, 690]} width={465} height={704} style={{ left: 0, top: 45, transform: "rotate(-2deg)" }} />
      <div style={{ position: "absolute", left: 509, top: 100, fontFamily: serif, fontSize: 41, color: C.green }}>{selected ? "Thử thách · Mức vừa" : "Bạn chọn mức nào?"}</div>
      {selected ? <div style={{ position: "absolute", left: 501, top: 195, width: 451, height: 304, borderRadius: 25, background: "#fffaf0", boxShadow: shadow, fontFamily: sans, color: C.green }}>
        <div style={{ position: "absolute", left: 26, top: 19, width: 398, fontFamily: serif, fontSize: 30, lineHeight: 1.35 }}>Đại sảnh Bưu điện nổi bật<br />với kết cấu nào?</div>
        <div style={{ position: "absolute", left: 26, top: 130, width: 398, height: 54, borderRadius: 13, display: "flex", alignItems: "center", paddingLeft: 18, boxSizing: "border-box", background: C.cream, fontSize: 23 }}>A. Mái kính kim tự tháp</div>
        <div style={{ position: "absolute", left: 26, top: 196, width: 398, height: 80, borderRadius: 13, display: "flex", alignItems: "center", paddingLeft: 18, boxSizing: "border-box", background: answered ? C.green : C.cream, color: answered ? C.paper : C.green, fontSize: 26, fontWeight: 600 }}>{answered ? "✓ Chính xác! Vòm khung sắt" : "B. Hệ vòm khung sắt"}</div>
      </div> : <div style={{ position: "absolute", left: 501, top: 242, width: 451, height: 248, padding: "28px 30px", boxSizing: "border-box", borderRadius: 25, background: C.green, color: C.paper, boxShadow: shadow }}>
        <div style={{ fontFamily: sans, fontSize: 20, color: "#e3c583", fontWeight: 600, letterSpacing: 2 }}>ĐỐ VUI NHANH</div>
        <div style={{ fontFamily: serif, fontSize: 37, lineHeight: 1.4, marginTop: 22 }}>Chọn độ khó<br />để mở câu hỏi.</div>
      </div>}
      <div style={{ position: "absolute", left: 510, top: 537, display: "flex", gap: 14 }}>
        {["Dễ", "Vừa", "Khó"].map((name, i) => <div key={name} style={{ width: 104, height: 70, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 17, background: selected && i === 1 ? C.green : "#e9e0cc", color: selected && i === 1 ? C.paper : C.green, fontFamily: sans, fontSize: 29, fontWeight: 600 }}>{name}</div>)}
      </div>
      <div style={{ position: "absolute", left: 510, top: 647, width: 440, fontFamily: sans, fontSize: answered ? 33 : 25, lineHeight: 1.4, color: answered ? C.terra : "#637366", fontWeight: answered ? 600 : 400 }}>{answered ? "+25 XP · Hoàn thành thử thách" : "Mỗi câu hỏi, thêm một điều biết về nơi mình đến."}</div>
    </Feature>
  );
};

const Rewards: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [18, 62], [0, 1], { ...clamp, easing: ease });
  return (
    <Feature number="06" eyebrow="XP & BỘ SƯU TẬP" title={"Hoàn thành\nthử thách,\ntích lũy XP."} body="Sưu tập nhiều huy hiệu khác nhau.">
      <Crop src="badges.png" image={[524, 908]} view={[13, 181, 355, 542]} width={474} height={724} style={{ left: 478, top: 14, border: "8px solid #fffaf0" }} />
      <div style={{ position: "absolute", left: 0, top: 89, width: 426, padding: "43px 30px", boxSizing: "border-box", borderRadius: 29, background: C.green, color: C.paper, boxShadow: shadow }}>
        <div style={{ width: 63, height: 63, border: "2px solid #d6c59d", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#e3c583", fontSize: 38 }}>✓</div>
        <div style={{ fontFamily: serif, fontSize: 43, lineHeight: 1.25, marginTop: 25 }}>Hoàn thành<br />thử thách</div>
        <div style={{ fontFamily: sans, fontSize: 70, fontWeight: 600, color: "#e3c583", marginTop: 22 }}>+25 XP</div>
        <div style={{ height: 10, marginTop: 21, borderRadius: 10, background: "#ffffff29", overflow: "hidden" }}><div style={{ height: "100%", width: `${progress * 100}%`, background: "#ddba71", borderRadius: 10 }} /></div>
      </div>
      <div style={{ position: "absolute", top: 649, left: 8, width: 430, color: C.brass, fontFamily: sans, fontSize: 26, lineHeight: 1.5 }}>Huy hiệu vừa nhận:<br /><strong>Dấu ấn Vòm Sắt</strong></div>
    </Feature>
  );
};

const Planner: React.FC = () => (
  <Feature number="07" eyebrow="LỊCH TRÌNH CÁ NHÂN" title={"AI gợi ý\nlịch trình"} body="theo sở thích và thời gian của bạn."><PlannerVisual /></Feature>
);

const Memories: React.FC = () => {
  const saved = React.useContext(ActionFrame) >= ACTIONS.save.click + 5;
  return (
  <Feature number="08" eyebrow="DẤU ẤN CÁ NHÂN" title={"Lưu ảnh,\nđánh dấu\nnơi đã đến."} body="Giữ lại hành trình của riêng bạn.">
    <div style={{ position: "absolute", left: 5, top: 9, width: 424, height: 752, padding: "30px 23px", boxSizing: "border-box", border: "9px solid #183b30", borderRadius: 37, background: "#fffaf0", boxShadow: shadow, color: C.green }}>
      <div style={{ fontFamily: sans, fontSize: 22, letterSpacing: 2 }}>THÁM VĂN</div>
      <Img src={asset("independence-palace.jpg")} style={{ width: "100%", height: 232, objectFit: "cover", borderRadius: 20, marginTop: 23 }} />
      <div style={{ fontFamily: serif, fontSize: 37, lineHeight: 1.3, marginTop: 23 }}>Dinh Độc Lập</div>
      <div style={{ fontFamily: sans, fontSize: 24, marginTop: 12, color: C.brass }}>Dấu ấn cá nhân</div>
      <div style={{ marginTop: 24, padding: "15px 17px", borderRadius: 16, background: C.cream, fontFamily: sans, fontSize: 23, lineHeight: 1.45 }}>{saved ? "✓ Dinh Độc Lập đã có trong bộ sưu tập của bạn." : "Lưu địa điểm để dễ tìm lại trong hành trình của bạn."}</div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 642, height: 70, borderRadius: 18, background: saved ? C.terra : C.green, color: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontSize: 29, fontWeight: 600 }}>{saved ? "✓ Đã lưu" : "Lưu địa điểm"}</div>
    </div>
    <Photo src="hoi-an.jpg" label="Ảnh kỷ niệm" style={{ left: 483, top: 71, width: 446, height: 301, border: "9px solid #fffaf0", transform: "rotate(4deg)" }} />
    <Photo src="independence-palace.jpg" label="Dinh Độc Lập" style={{ left: 492, top: 426, width: 432, height: 283, border: "9px solid #fffaf0", transform: "rotate(-3deg)" }} />
  </Feature>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper, color: C.green, alignItems: "center" }}>
      <Paper />
      <svg width="1920" height="1080" style={{ position: "absolute", opacity: 0.08 }}><circle cx="960" cy="510" r="440" fill="none" stroke={C.green} /><circle cx="960" cy="510" r="490" fill="none" stroke={C.green} /></svg>
      <div style={{ zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", marginTop: 144, textAlign: "center" }}>
        <Img src={asset("logo.png")} style={{ width: 270, height: 320, objectFit: "contain", ...enter(frame) }} />
        <div style={{ fontFamily: serif, fontSize: 110, fontWeight: 600, letterSpacing: 6, lineHeight: 1.3, marginTop: 28, ...enter(frame, 5) }}>THÁM VĂN</div>
        <div style={{ width: 105, height: 3, background: C.terra, marginTop: 24, marginBottom: 27 }} />
        <div style={{ fontFamily: serif, fontSize: 60, lineHeight: 1.4, color: C.terra, ...enter(frame, 12) }}>Chạm để hiểu di sản Việt</div>
        <div style={{ marginTop: 30, padding: "21px 46px", borderRadius: 19, background: C.green, color: C.paper, fontFamily: sans, fontSize: 34, fontWeight: 600, boxShadow: shadow, ...enter(frame, 20) }}>Trải nghiệm ngay <span style={{ marginLeft: 17 }}>→</span></div>
      </div>
    </AbsoluteFill>
  );
};

const sceneComponents = [Intro, Camera, Culture, Map, Notice, Challenges, Rewards, Planner, Memories, PricingScene, Outro];
const SceneTransition: React.FC<{ first: boolean; last: boolean; duration: number; children: React.ReactNode }> = ({ first, last, duration, children }) => {
  const frame = useCurrentFrame();
  const arrive = first ? 1 : interpolate(frame, [0, TRANSITION], [0, 1], { ...clamp, easing: ease });
  const leave = last ? 0 : interpolate(frame, [duration - TRANSITION, duration + TRANSITION], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return <AbsoluteFill style={{ opacity: arrive * (1 - leave), transform: `translateY(${-42 * leave}px) scale(${1 - 0.025 * leave})`, filter: `blur(${2 * leave}px)` }}>{children}</AbsoluteFill>;
};

const SharedTransitions: React.FC = () => {
  const frame = useCurrentFrame();
  const photos = [
    { at: 6, src: "post-office.jpg", from: [883, 165, 900, 491, -2], to: [810, 223, 387, 290, -3] },
    { at: 13, src: "dragon.png", from: [822, 567, 357, 280, 3], to: [1337, 251, 392, 410, 3] },
  ];
  const bridge = photos.find(({ at }) => Math.abs(frame - at * 30) <= TRANSITION);
  const nearby = Math.abs(frame - 22 * 30) <= TRANSITION;
  if (bridge) {
    const p = interpolate(frame, [bridge.at * 30 - TRANSITION, bridge.at * 30 + TRANSITION], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    const rect = bridge.from.map((value, i) => value + (bridge.to[i] - value) * p);
    return <div style={{ position: "absolute", left: rect[0], top: rect[1], width: rect[2], height: rect[3], transform: `rotate(${rect[4]}deg)`, borderRadius: 25, overflow: "hidden", background: "#fffaf0", boxShadow: shadow }}><Img src={asset(bridge.src)} style={{ width: "100%", height: "100%", objectFit: bridge.src === "dragon.png" ? "contain" : "cover" }} /></div>;
  }
  if (nearby) {
    const p = interpolate(frame, [22 * 30 - TRANSITION, 22 * 30 + TRANSITION], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    return <div style={{ position: "absolute", left: 848 + 34 * p, top: 673 + 90 * p, width: 337 - 225 * p, height: 166 - 112 * p, boxSizing: "border-box", padding: `${22 * (1 - p)}px ${28 * (1 - p)}px`, background: `rgba(17,68,54,${1 - p})`, borderRadius: 24 * (1 - p), color: p < 0.65 ? C.paper : C.green }}><div style={{ fontFamily: sans, fontSize: 23, height: 28 * (1 - p), opacity: 1 - p, overflow: "hidden", whiteSpace: "nowrap" }}>Bán kính tìm kiếm</div><div style={{ fontFamily: serif, fontSize: 76 - 41 * p, fontWeight: 600, whiteSpace: "nowrap", lineHeight: 1.2 }}>3 km</div></div>;
  }
  return null;
};

export const ThamVanSilent58: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <ActionFrame.Provider value={frame}><AbsoluteFill style={{ background: C.paper }}>
      <Audio src={asset("soundtrack-v2.m4a")} volume={1} />
      {sceneComponents.map((Scene, i) => (
        <Sequence key={i} from={SILENT58_SCENES[i] * 30} durationInFrames={(SILENT58_SCENES[i + 1] - SILENT58_SCENES[i]) * 30 + (i === sceneComponents.length - 1 ? 0 : TRANSITION)}>
          <SceneTransition first={i === 0} last={i === sceneComponents.length - 1} duration={(SILENT58_SCENES[i + 1] - SILENT58_SCENES[i]) * 30}><Scene /></SceneTransition>
        </Sequence>
      ))}
      <SharedTransitions />
      <HandCursor />
      <div style={{ position: "absolute", bottom: 39, left: 92, width: 1736, height: 3, background: "#1144361a" }}>
        <div style={{ height: "100%", width: `${frame / (SILENT58_DURATION - 1) * 100}%`, background: C.terra }} />
      </div>
    </AbsoluteFill></ActionFrame.Provider>
  );
};
