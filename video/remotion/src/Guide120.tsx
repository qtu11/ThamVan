import React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import { C, DOMAIN, sans, serif, serifItalic } from "./theme";
import { GuideCapture } from "./GuideCapture";
import { GuideJourney, JOURNEY_CUES } from "./GuideJourney";

export type VoiceWord = { text: string; start: number; end: number; estimated?: boolean };
export type VoiceScene = {
  id: string; index: number; sceneStart: number; sceneEnd: number;
  start: number; duration: number; end: number; text: string;
  words: VoiceWord[];
};
export type GuideTimings = { fps: number; total: number; voice: string; scenes: VoiceScene[] };
export type Guide120Props = { timings: GuideTimings | null };

export const guideScenes = [
  { id: "intro", start: 0, end: 5, title: "THÁM VĂN", body: "Chạm để hiểu di sản Việt", tag: "CHẠM ĐỂ KHÁM PHÁ", route: "/vi" },
  { id: "home", start: 5, end: 12, title: "Bắt đầu\ntừ trang chủ", body: "Một góc nhìn mới về Sài Gòn,\nngay từ lần chạm đầu tiên.", tag: "KHÔNG GIAN SÀI GÒN · 3D", route: "/vi" },
  { id: "gifts", start: 12, end: 18, title: "Mang theo\nmột nét văn hóa", body: "Nón lá thêu, ly sứ và ký họa\ngợi nhớ câu chuyện thành phố.", tag: "QUÀ TẶNG VĂN HÓA", route: "/vi" },
  { id: "events", start: 18, end: 23, title: "Thành phố\nđang có gì?", body: "Những sự kiện văn hóa\nsắp diễn ra quanh bạn.", tag: "NHỊP SỐNG VĂN HÓA", route: "/vi" },
  { id: "camera", start: 23, end: 31, title: "Chụp một ảnh.\nMở một câu chuyện.", body: "Công trình, hiện vật, hoa văn\nvà nghệ thuật dân gian.", tag: "CAMERA AI", route: "/vi/camera" },
  { id: "learn", start: 31, end: 38, title: "Hiểu ngắn trước.\nKhám phá sâu sau.", body: "Đọc thông tin, tìm hiểu câu chuyện\nvà đối chiếu nguồn tư liệu.", tag: "CHỤP → HIỂU → TÌM HIỂU THÊM", route: "/vi/camera" },
  { id: "atlas", start: 38, end: 46, title: "Khám phá\nquanh bạn", body: "Bản đồ – Atlas trên web\nvà điện thoại. Bán kính 3 km.", tag: "BẢN ĐỒ – ATLAS", route: "/vi/map" },
  { id: "notification", start: 46, end: 52, title: "Có điểm đến\nthú vị ở gần", body: "Chạm thông báo để xem\ncâu chuyện và đường đi.", tag: "GỢI Ý TRÊN ĐIỆN THOẠI", route: "/vi/map" },
  { id: "challenge", start: 52, end: 58, title: "Đến nơi.\nChơi để hiểu.", body: "Check-in, hoàn thành thử thách,\ntích XP và lên cấp.", tag: "CHECK-IN & THỬ THÁCH", route: "/vi/challenges" },
  { id: "pricing", start: 58, end: 65, title: "Khám phá miễn phí.\nMở rộng khi cần.", body: "Free: 5 thử thách mỗi ngày.\nPremium: không giới hạn thử thách.", tag: "BA GÓI CHO TỪNG NHU CẦU", route: "/vi/pricing" },
  { id: "voucher", start: 65, end: 70, title: "Tích điểm.\nThêm trải nghiệm.", body: "Đổi XP lấy voucher ưu đãi\ncho hành trình tiếp theo.", tag: "XP → VOUCHER", route: "/vi/profile" },
  { id: "family", start: 70, end: 77, title: "Cả nhà\ncùng khám phá", body: "Premium Family: tối đa 4 thành viên,\nkèm lịch trình do AI đề xuất.", tag: "PREMIUM FAMILY", route: "/vi/pricing" },
  { id: "planner", start: 77, end: 83, title: "Một lịch trình\nvừa với bạn", body: "Bán kính, thời gian và ngân sách.\nAI gợi ý lộ trình chi tiết.", tag: "LỊCH TRÌNH AI", route: "/vi/dashboard" },
  { id: "titles", start: 83, end: 90, title: "Mỗi điểm đến,\nthêm một dấu mốc", body: "Ghé thêm địa điểm, lưu ảnh\nvà sưu tập danh hiệu khám phá.", tag: "BỘ SƯU TẬP DANH HIỆU", route: "/vi/profile" },
  { id: "journey", start: 90, end: 96, title: "Giữ lại\nnhững dấu chân", body: "Ảnh đã chụp, nơi đã đến\nvà quãng đường của riêng bạn.", tag: "HÀNH TRÌNH CÁ NHÂN", route: "/vi/journey" },
  { id: "timeline", start: 96, end: 104, title: "Hành trình của bạn,\nthành một thước phim", body: "TimelineMap kết hợp bản đồ và ảnh\nđể tạo video kỷ niệm.", tag: "TIMELINEMAP", route: "/vi/dashboard" },
  { id: "permissions", start: 104, end: 113, title: "Bạn chủ động\ncấp quyền", body: "Vị trí, camera và ảnh bạn chọn.\nĐồng ý chính sách trước khi sử dụng.", tag: "ĐIỀU KHOẢN & QUYỀN RIÊNG TƯ", route: "/vi/camera" },
  { id: "outro", start: 113, end: 120, title: "THÁM VĂN", body: "Khám phá Sài Gòn qua từng câu chuyện", tag: "Chạm để hiểu di sản Việt", route: "/vi" },
] as const;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const move = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: ease });
const shadow = "0 28px 65px #092e2328, 0 3px 10px #092e2310";
const image = (name: string) => staticFile(`guide120/${name}`);

const Finger: React.FC<{ x: number; y: number; time: number; click: number; swipe?: boolean }> = ({ x, y, time, click, swipe }) => {
  const a = time - click;
  const visibility = Math.min(move(time, click - 0.65, click - 0.35), 1 - move(time, click + 0.7, click + 1));
  const press = interpolate(a, [-0.1, 0, 0.18, 0.3], [1, 0.86, 0.96, 1], clamp);
  return <div style={{ position: "absolute", left: x, top: y - (swipe ? move(time, click, click + 0.7) * 95 : 0), opacity: visibility, zIndex: 30 }}>
    {!swipe && a >= 0 && a < 0.6 && <div style={{ position: "absolute", left: -10 - a * 35, top: -10 - a * 35, width: 20 + a * 70, height: 20 + a * 70, border: `3px solid ${C.terra}`, borderRadius: "50%", opacity: 1 - a / 0.6 }} />}
    <svg width="55" height="73" viewBox="0 0 64 84" style={{ transform: `translate(-23px,-3px) scale(${press})`, transformOrigin: "23px 3px", filter: "drop-shadow(0 4px 4px #092e2340)" }}><path d="M19 43V10C19 0 32 0 32 10V30C32 22 43 23 43 32V35C43 28 54 28 54 37V42C54 35 63 36 63 45V56C63 65 55 74 52 81H27C25 74 20 70 16 65L3 49C-1 44 7 38 12 43L19 50Z" fill={C.green} stroke="#fffaf0" strokeWidth="4" strokeLinejoin="round" /><path d="M32 30V48M43 35V50M54 42V54" fill="none" stroke="#fffaf0" strokeWidth="2" /></svg>
  </div>;
};

const Brand: React.FC<{ large?: boolean }> = ({ large }) => <div style={{ display: "flex", gap: 14, alignItems: "center", fontFamily: serif, fontSize: large ? 44 : 27, letterSpacing: 2, fontWeight: 600, color: C.green }}><Img src={staticFile("silent58/logo.png")} style={{ width: large ? 72 : 45, height: large ? 72 : 45, objectFit: "contain" }} />THÁM VĂN</div>;

const Background: React.FC = () => <AbsoluteFill style={{ background: `radial-gradient(ellipse at 80% 25%, #fffaf0, ${C.paper} 60%, ${C.cream})` }}><svg width="1920" height="1080" style={{ opacity: 0.045 }}><path d="M1200-100C450 220 1840 400 1160 1180M1490-100C740 220 2130 400 1450 1180M-100 870C600 600 400 1320 1200 830" fill="none" stroke={C.green} strokeWidth="2" /><circle cx="1550" cy="330" r="330" fill="none" stroke={C.green} /><circle cx="1550" cy="330" r="370" fill="none" stroke={C.green} /></svg></AbsoluteFill>;

const products = [
  { name: "Nón lá thêu tay", group: "LÀNG NGHỀ", file: "non-la-viet-nam.jpg" },
  { name: "Ly sứ THÁM VĂN", group: "GỐM THỦ CÔNG", file: "ly-su-qua-luu-niem.jpg" },
  { name: "Ký họa Sài Gòn", group: "QUÀ LƯU NIỆM", file: "magnet-vietnam.jpg" },
];

const HomeFlow: React.FC<{ stage: string; progress: number; cues: Record<string, number> }> = ({ stage, progress, cues }) => {
  const scroll = stage === "home" ? move(progress, cues.scroll ?? 5, (cues.scroll ?? 5) + 1.3) * 438 : stage === "gifts" ? 438 + move(progress, cues.scroll ?? 5.3, (cues.scroll ?? 5.3) + 0.65) * 420 : 858;
  const focus = stage !== "gifts" || progress < (cues.hat ?? 2) ? -1 : progress < (cues.cup ?? 3) ? 0 : progress < (cues.sketch ?? 4) ? 1 : 2;
  return <div style={{ position: "absolute", left: 0, top: 32, width: 960, height: 730, background: "#fffaf0", borderRadius: 22, overflow: "hidden", boxShadow: shadow, fontFamily: sans, color: C.green }}>
    <div style={{ height: 46, background: "#e7dfcd", display: "flex", alignItems: "center", padding: "0 17px", gap: 8 }}>
      {["#d18a72", "#d4b979", "#7c9c79"].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: 9, background: c }} />)}
      <div style={{ background: "#fffaf0", marginLeft: 14, borderRadius: 15, flex: 1, fontSize: 16, padding: "5px 15px", color: "#5a695e" }}>{DOMAIN}/vi</div>
    </div>
    <div style={{ height: 58, display: "flex", alignItems: "center", padding: "0 26px", borderBottom: "1px solid #11443615", background: C.paper }}><Brand /><div style={{ marginLeft: "auto", display: "flex", gap: 20, fontSize: 14 }}><span>Khám phá</span><span>Thử thách</span><span>Cá nhân</span></div></div>
    <div style={{ position: "relative", height: 626, overflow: "hidden" }}>
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        <div style={{ height: 438, display: "flex", padding: "30px 28px", boxSizing: "border-box", gap: 26 }}>
          <div style={{ width: 305, paddingTop: 15 }}><div style={{ fontSize: 12, letterSpacing: 1.6, color: C.terra }}>ẤN PHẨM THỰC ĐỊA SÀI GÒN</div><div style={{ fontFamily: serif, fontWeight: 600, fontSize: 45, lineHeight: 1.18, marginTop: 20 }}>Đừng chỉ đến.<br />Hãy chạm<br />vào Sài Gòn.</div><div style={{ fontSize: 16, lineHeight: 1.55, marginTop: 18 }}>Khám phá câu chuyện văn hóa<br />qua từng góc phố.</div><div style={{ display: "inline-block", fontSize: 15, background: C.green, color: C.paper, borderRadius: 22, padding: "12px 18px", marginTop: 20 }}>Khám phá miễn phí ↗</div></div>
          <div style={{ width: 560, position: "relative", overflow: "hidden", borderRadius: 18, background: "#f0e9da", border: "1px solid #11443618" }}><div style={{ position: "absolute", left: 20, top: 17, fontSize: 13, letterSpacing: 1.2, zIndex: 2 }}>BẢN VẼ KHÔNG GIAN SÀI GÒN</div><Img src={image("city-day.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `perspective(1000px) rotateY(${Math.sin(progress * 0.45) * 3}deg) scale(${1.01 + move(progress, 1.1, 3.6) * 0.07})` }} /><div style={{ position: "absolute", left: 24, right: 24, bottom: 18, display: "flex", gap: 9 }}>{["Bạch Đằng", "Cầu Ba Son", "Landmark 81"].map((label, i) => <span key={label} style={{ padding: "7px 12px", fontSize: 12, borderRadius: 17, background: i === 0 ? C.green : C.paper, color: i === 0 ? C.paper : C.green }}>{label}</span>)}</div></div>
        </div>
        <div style={{ height: 420, padding: "23px 25px 28px", boxSizing: "border-box", background: "#ede6d7" }}><div style={{ fontSize: 15, letterSpacing: 1.6, color: C.terra }}>MANG VĂN HÓA THEO BẠN</div><div style={{ fontFamily: serif, fontSize: 32, fontWeight: 600, margin: "8px 0 17px" }}>Quà tặng mang dấu ấn văn hóa</div><div style={{ display: "flex", gap: 17 }}>{products.map((p, i) => <div key={p.name} style={{ width: 287, borderRadius: 16, overflow: "hidden", border: `3px solid ${focus === i ? C.terra : "transparent"}`, background: "#fffaf0", transform: `translateY(${focus === i ? -7 : 0}px) scale(${focus === i ? 1.025 : 1})`, boxShadow: focus === i ? "0 12px 25px #963a1b20" : "none" }}><Img src={image(p.file)} style={{ width: "100%", height: 196, objectFit: "cover" }} /><div style={{ padding: "11px 15px 14px" }}><div style={{ fontSize: 11, letterSpacing: 1.1, color: C.terra }}>{p.group}</div><div style={{ fontFamily: serif, fontSize: 24, marginTop: 7 }}>{p.name}</div><div style={{ fontSize: 13, marginTop: 8, color: "#617166" }}>Khám phá câu chuyện ↗</div></div></div>)}</div></div>
        <div style={{ height: 480, padding: "25px", boxSizing: "border-box" }}><div style={{ fontSize: 15, letterSpacing: 1.5, color: C.terra }}>NHỊP SỐNG VĂN HÓA QUANH THÀNH PHỐ</div><div style={{ fontFamily: serif, fontSize: 34, fontWeight: 600, margin: "9px 0 22px" }}>Sự kiện sắp diễn ra</div><div style={{ display: "flex", gap: 18 }}>{[{ title: "Triển lãm văn hóa", image: "artifact-real.jpg", type: "KHÔNG GIAN VĂN HÓA" }, { title: "Biểu diễn nghệ thuật", image: "performance-real.jpg", type: "NGHỆ THUẬT CỘNG ĐỒNG" }, { title: "Lễ hội cộng đồng", image: "nguyen-hue.jpg", type: "NHỊP SỐNG THÀNH PHỐ" }].map((event, i) => <div key={event.title} style={{ width: 285, borderRadius: 16, overflow: "hidden", border: `2px solid ${stage === "events" && i === 1 && progress > 1.6 ? C.terra : "#11443618"}`, background: C.paper, transform: `translateY(${stage === "events" && i === 1 ? -move(progress, 1.6, 2.3) * 7 : 0}px)` }}><Img src={image(event.image)} style={{ width: "100%", height: 180, objectFit: "cover" }} /><div style={{ padding: "15px 14px" }}><div style={{ fontSize: 10, color: C.terra, letterSpacing: 1 }}>{event.type}</div><div style={{ fontFamily: serif, fontSize: 23, marginTop: 8 }}>{event.title}</div><div style={{ fontSize: 15, marginTop: 15, color: "#52675b" }}>▦ Xem lịch & địa điểm →</div></div></div>)}</div></div>
      </div>
    </div>
    {stage === "home" && <Finger x={870} y={562} time={progress} click={cues.scroll ?? 5} swipe />}
    {stage === "gifts" && <Finger x={870} y={570} time={progress} click={cues.scroll ?? 5.3} swipe />}
  </div>;
};

const TitleCard: React.FC<{ end?: boolean; progress: number; clickAt: number }> = ({ end, progress, clickAt }) => <AbsoluteFill style={{ alignItems: "center", color: C.green, opacity: move(progress, 0, 0.3) }}>
  <Background />
  <div style={{ position: "absolute", top: end ? 145 : 195, display: "flex", flexDirection: "column", alignItems: "center", opacity: move(progress, 0, 0.55), transform: `translateY(${(1 - move(progress, 0, 0.7)) * 25}px)` }}>
    <Img src={staticFile("silent58/logo.png")} style={{ width: end ? 155 : 185, height: end ? 155 : 185, objectFit: "contain" }} />
    <div style={{ fontFamily: serif, fontSize: end ? 112 : 142, fontWeight: 600, letterSpacing: 6, marginTop: 14 }}>THÁM VĂN</div>
    {end && <div style={{ fontFamily: serifItalic, fontSize: 49, marginTop: 22, opacity: move(progress, 0.8, 1.5) }}>Khám phá Sài Gòn qua từng câu chuyện</div>}
    <div style={{ width: end ? 240 : 400, height: 2, background: C.terra, marginTop: end ? 25 : 30, opacity: 0.55 }} />
    <div style={{ fontFamily: sans, fontSize: end ? 31 : 43, marginTop: 26, letterSpacing: 0.5, opacity: move(progress, end ? 2.4 : 0.9, end ? 3 : 1.6) }}>Chạm để hiểu di sản Việt</div>
    {end && <div style={{ position: "relative", marginTop: 38, opacity: move(progress, 3.5, 4), background: C.green, color: C.paper, padding: "21px 45px", borderRadius: 40, fontFamily: sans, fontSize: 30, transform: `scale(${progress > clickAt && progress < clickAt + 0.2 ? 0.97 : 1})` }}>Khám phá ngay ↗<Finger x={235} y={44} time={progress} click={clickAt} /></div>}
  </div>
</AbsoluteFill>;

const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();

// Aligned word and UI cue times are relative to the scene, including the voice offset.
const wordCue = (scene: VoiceScene | undefined, phrase: string, fallback: number) => {
  if (!scene?.words.length) return fallback;
  const words = scene.words.flatMap(w => normalized(w.text).split(" ").map(text => ({ text, start: w.start })));
  const target = normalized(phrase).split(" ");
  for (let i = 0; i <= words.length - target.length; i++) {
    if (target.every((w, j) => words[i + j].text === w)) return words[i].start;
  }
  return fallback;
};

const visualCues = (id: string, scene?: VoiceScene): Record<string, number> => {
  const cue = (phrase: string, fallback: number) => wordCue(scene, phrase, fallback);
  if (id === "home") return { scroll: cue("Kéo xuống", 5) };
  if (id === "gifts") return { hat: cue("nón lá", 2), cup: cue("ly sứ", 3), sketch: cue("ký họa", 4), scroll: scene ? scene.end - scene.sceneStart + 0.03 : 5.3 };
  if (id === "camera") return { open: cue("Camera", 0.6), shutter: cue("tượng rồng", 2), notre: cue("Nhà thờ", 4), artifact: cue("hiện vật", 6), performance: cue("tiết mục", 6.6) };
  if (id === "learn") return { learn: cue("Chạm", 3), sources: cue("nguồn tư liệu", 5.2) };
  if (id === "atlas") return { locate: cue("bật vị trí", 3), radius: cue("bán kính", 4), pins: cue("ba ki lô mét", 6) };
  if (id === "notification") return { open: cue("Chạm", 3), route: cue("đường đi", 4.5) };
  if (id === "challenge") {
    const question = cue("thử thách", 1.6);
    const xp = cue("điểm kinh nghiệm", 4);
    const answer = Math.min(question + 0.65, xp - 0.4);
    return { ...JOURNEY_CUES.challenge, checkin: cue("check-in", 0.6), question, answer, complete: answer + 0.25, xp, level: cue("lên cấp", 5) };
  }
  if (id === "pricing") return { ...JOURNEY_CUES.pricing, free: cue("Free", 2), premium: cue("Premium", 4), unlimited: cue("không giới hạn", 4.5) };
  if (id === "voucher") {
    const exchange = cue("đổi voucher", 2);
    return { ...JOURNEY_CUES.voucher, points: cue("Điểm", 0.3), exchange, reveal: exchange + 0.25 };
  }
  if (id === "family") {
    const planner = cue("lịch trình", 4);
    return { ...JOURNEY_CUES.family, family: cue("Premium Family", 1), people: cue("cả nhà", 2), benefit: cue("mở khóa", 3), planner, form: planner + 0.4 };
  }
  if (id === "planner") {
    const create = Math.max(cue("ngân sách", 2) + 0.55, cue("AI", 3) - 0.15);
    return { ...JOURNEY_CUES.planner, radius: cue("bán kính", 0.45), time: cue("thời gian", 1.1), budget: cue("ngân sách", 2), create, results: Math.max(create + 0.45, cue("sắp xếp", 3.7)) };
  }
  if (id === "titles") return { ...JOURNEY_CUES.titles, visit: cue("Ghé", 0.2), save: cue("lưu ảnh", 1), collection: cue("danh hiệu", 2), wander: cue("Nhà Lãng Du", 3), nomad: cue("Nhà Du Mục", 4), explorer: cue("Nhà Thám Hiểm", 5) };
  if (id === "journey") {
    const save = cue("Lưu ảnh", 0.35);
    return { ...JOURNEY_CUES.photos, save, collection: save + 0.5, places: cue("nơi đã đến", 2), distance: cue("quãng đường", 3) };
  }
  if (id === "timeline") {
    const create = cue("dựng lại", 3);
    return { ...JOURNEY_CUES.timeline, open: cue("TimelineMap", 0.3), route: cue("bản đồ", 1), photos: cue("và ảnh", 2), create, preview: create + 0.55, ready: Math.max(create + 1.7, cue("kỷ niệm", 6)) };
  }
  if (id === "permissions") {
    const picker = cue("chọn ảnh", 4);
    const upload = cue("chỉ nhận ảnh", 6);
    return { ...JOURNEY_CUES.permissions, policy: cue("chính sách", 1), location: cue("vị trí", 2), camera: cue("camera", 3), picker, select: picker + 0.5, upload, notification: Math.min(8.2, upload + 0.7) };
  }
  return {};
};

const captionChunks = (scene: VoiceScene): Caption[] => {
  if (!scene.words.length) return [];
  const chunks: Caption[] = [];
  let text = "";
  let start = 0;
  scene.words.forEach((word, index) => {
    if (!text) start = word.start;
    text += (text ? " " : "") + word.text;
    const last = index === scene.words.length - 1;
    const boundary = text.length >= 64 || (/[.!?;:]$/.test(word.text) && text.length >= 25) || last;
    if (boundary) {
      chunks.push({ text, startMs: (scene.sceneStart + start) * 1000, endMs: Math.min(scene.sceneEnd, scene.sceneStart + word.end + (last ? 0.22 : 0.04)) * 1000, timestampMs: null, confidence: null });
      text = "";
    }
  });
  const tail = chunks[chunks.length - 1];
  if (chunks.length > 1 && tail.text.length < 18) {
    const previous = chunks[chunks.length - 2];
    previous.text += ` ${tail.text}`;
    previous.endMs = tail.endMs;
    chunks.pop();
  }
  return chunks;
};

const soundCues = (scene: VoiceScene) => {
  const c = visualCues(scene.id, scene);
  const effects: { at: number; file: string; volume: number }[] = [];
  const add = (at: number, file = "click", volume = 0.24) => effects.push({ at: scene.sceneStart + at, file, volume });
  const clicks: Record<string, string[]> = {
    camera: ["open"], learn: ["learn", "sources"], atlas: ["locate"], notification: ["open", "route"],
    challenge: ["checkin", "answer"], pricing: ["premium"], voucher: ["exchange"], family: ["family", "planner"],
    planner: ["radius", "time", "budget", "create"], journey: ["save"], timeline: ["open", "create"],
    permissions: ["policy", "location", "camera", "picker", "select", "upload"],
  };
  for (const key of clicks[scene.id] ?? []) add(c[key]);
  if (scene.id === "camera") add(c.shutter, "shutter", 0.28);
  if (scene.id === "notification") add(0.35, "notification", 0.2);
  if (scene.id === "challenge") add(c.xp, "chime", 0.13);
  if (scene.id === "voucher") add(c.reveal, "chime", 0.12);
  if (scene.id === "home") add(c.scroll, "whoosh", 0.15);
  if (scene.id === "outro") add(Math.min(scene.sceneEnd - scene.sceneStart - 0.65, scene.end - scene.sceneStart + 0.15));
  return effects.filter(e => Number.isFinite(e.at) && e.at < scene.sceneEnd);
};

const Feature: React.FC<{ index: number; timing?: VoiceScene; scene: typeof guideScenes[number] }> = ({ index, timing, scene }) => {
  const frame = useCurrentFrame();
  const progress = frame / 30;
  const entrance = move(progress, 0, 0.65);
  const cues = visualCues(scene.id, timing);
  const capture = ["camera", "learn", "atlas", "notification"].includes(scene.id);
  const kind = scene.id === "learn" ? "result" : scene.id === "notification" ? "notice" : scene.id === "journey" ? "photos" : scene.id;
  return <AbsoluteFill style={{ opacity: move(progress, 0, 0.3) }}>
    <Background />
    <div style={{ position: "absolute", left: 96, top: 55 }}><Brand /></div>
    <div style={{ position: "absolute", right: 98, top: 74, fontFamily: sans, fontSize: 16, letterSpacing: 3.2, color: "#637366" }}>CHẠM ĐỂ HIỂU DI SẢN VIỆT</div>
    <div style={{ position: "absolute", left: 97, top: 285, width: 680, color: C.green, transform: `translateY(${(1 - entrance) * 30}px)` }}>
      <div style={{ fontFamily: sans, fontSize: 19, color: C.terra, letterSpacing: 1.4, fontWeight: 600 }}>{String(index).padStart(2, "0")} ── {scene.tag}</div>
      <div style={{ fontFamily: serif, fontSize: 63, fontWeight: 600, lineHeight: 1.2, letterSpacing: -1.8, marginTop: 26, whiteSpace: "pre-line" }}>{scene.title}</div>
      <div style={{ fontFamily: sans, fontSize: 29, color: "#52675b", lineHeight: 1.62, marginTop: 28, whiteSpace: "pre-line" }}>{scene.body}</div>
      <div style={{ width: 72, height: 3, borderRadius: 3, background: C.terra, marginTop: 31 }} />
      <div style={{ fontFamily: sans, fontSize: 17, color: "#748277", marginTop: 22 }}>{scene.route}</div>
    </div>
    <div style={{ position: "absolute", left: 845, top: 130, width: 980, height: 820, opacity: entrance, transform: `perspective(1600px) translateX(${(1 - entrance) * 95}px) rotateY(${(1 - entrance) * -5}deg)` }}>
      {["home", "gifts", "events"].includes(scene.id) ? <HomeFlow stage={scene.id} progress={progress} cues={cues} /> : capture ? <GuideCapture scene={kind} progress={progress} cues={cues} /> : <GuideJourney scene={kind} progress={progress} cues={cues} />}
    </div>
    <div style={{ position: "absolute", left: 90, bottom: 50, fontFamily: serif, fontSize: 330, lineHeight: 1, color: "#11443606", zIndex: -1 }}>{String(index).padStart(2, "0")}</div>
  </AbsoluteFill>;
};

export const ThamVanGuide120: React.FC<Guide120Props> = ({ timings }) => {
  const frame = useCurrentFrame();
  const total = timings?.total ?? 120;
  const now = frame / 30;
  const captions = timings?.scenes.flatMap(captionChunks) ?? [];
  const caption = captions.find(c => now * 1000 >= c.startMs && now * 1000 < c.endMs);
  return <AbsoluteFill>
    <Background />
    {guideScenes.map((scene, index) => {
      const timing = timings?.scenes.find(v => v.id === scene.id);
      const start = timing?.sceneStart ?? scene.start;
      const end = timing?.sceneEnd ?? scene.end;
      const clickAt = Math.min(end - start - 0.65, (timing?.end ?? end - 1.5) - start + 0.15);
      return <Sequence key={scene.id} from={Math.round(start * 30)} durationInFrames={Math.round((end - start) * 30) + (index < guideScenes.length - 1 ? 12 : 0)} name={scene.title.replace(/\n/g, " ")}>
        {scene.id === "intro" || scene.id === "outro" ? <TitleCard end={scene.id === "outro"} progress={(frame - Math.round(start * 30)) / 30} clickAt={clickAt} /> : <Feature index={index} scene={scene} timing={timing} />}
      </Sequence>;
    })}
    {caption && <div style={{ position: "absolute", bottom: 30, left: 210, right: 210, display: "flex", justifyContent: "center", pointerEvents: "none" }}><div style={{ padding: "12px 28px", borderRadius: 15, background: "#fffaf0ed", color: C.green, fontFamily: sans, fontSize: 29, lineHeight: 1.45, textAlign: "center", maxWidth: 1400, boxShadow: "0 4px 22px #092e2310" }}>{caption.text}</div></div>}
    {timings && <>
      <Audio src={staticFile("audio-120/music-120.wav")} volume={(f) => {
        const t = f / 30;
        const near = Math.min(...timings.scenes.map(s => t < s.start ? s.start - t : t > s.end ? t - s.end : 0));
        return (0.14 + 0.28 * Math.min(1, near / 0.3)) * Math.min(1, t / 0.7) * Math.min(1, (total - t) / 1.5);
      }} />
      {timings.scenes.map(scene => <Sequence key={`voice-${scene.id}`} from={Math.round(scene.start * 30)} durationInFrames={Math.ceil(scene.duration * 30) + 1}><Audio src={staticFile(`vo-120/${scene.id}.wav`)} /></Sequence>)}
      {timings.scenes.flatMap(soundCues).map((s, i) => <Sequence key={`effect-${i}`} from={Math.round(s.at * 30)} durationInFrames={24}><Audio src={staticFile(`audio-120/${s.file}.wav`)} volume={s.volume} /></Sequence>)}
      {timings.scenes.slice(1).map(scene => <Sequence key={`transition-${scene.id}`} from={Math.max(0, Math.round(scene.sceneStart * 30) - 3)} durationInFrames={15}><Audio src={staticFile("audio-120/whoosh.wav")} volume={0.12} /></Sequence>)}
    </>}
    <div style={{ position: "absolute", left: 0, bottom: 0, width: `${Math.min(1, now / total) * 100}%`, height: 3, background: C.terra, opacity: 0.65 }} />
  </AbsoluteFill>;
};
