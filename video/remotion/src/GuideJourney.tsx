import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { C, DOMAIN, sans, serif } from "./theme";
import routeProjection from "../public/guide120/journey-map-projection.json";
import routedJourney from "../public/guide120/journey-route-osrm.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const paper = "#fffbf3";
const border = "#11443624";
const shadow = "0 25px 65px #092e2325, 0 3px 10px #092e230b";
const photo = (name: string) => staticFile(`silent58/${name}`);
const routeDistanceKm = (routedJourney.routes[0].distance / 1000).toFixed(2).replace(".", ",");
const mix = (t: number, start: number, end = start + 0.45) => interpolate(t, [start, end], [0, 1], clamp);
const pop = (t: number, start: number): React.CSSProperties => {
  const p = mix(t, start);
  return { opacity: p, transform: `translateY(${(1 - p) * 22}px) scale(${0.96 + 0.04 * p})` };
};

export const JOURNEY_CUES: Record<string, Record<string, number>> = {
  challenge: { checkin: 0.35, question: 1, answer: 2.15, complete: 2.65, xp: 4, level: 5 },
  pricing: { free: 2, premium: 4, unlimited: 4.5 },
  voucher: { points: 0, exchange: 2, reveal: 2.25 },
  family: { family: 1, people: 2, benefit: 3, planner: 4, form: 4.4 },
  planner: { radius: 0.45, time: 1.1, budget: 2, create: 3, results: 3.7 },
  titles: { visit: 0.2, save: 1, collection: 2, wander: 3, nomad: 4, explorer: 5 },
  photos: { save: 0.35, collection: 1, places: 2, distance: 3 },
  timeline: { open: 0.3, route: 1, photos: 2, create: 3, preview: 3.6, ready: 6 },
  permissions: { policy: 1, location: 2, camera: 3, picker: 4, select: 5, upload: 6, notification: 7 },
};

const Icon: React.FC<{ kind?: string; size?: number; color?: string }> = ({ kind = "pin", size = 30, color = C.green }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {kind === "camera" ? <><path d="M4 10h7l2-4h6l2 4h7v17H4z" /><circle cx="16" cy="18" r="6" /></> :
      kind === "photo" ? <><rect x="3" y="5" width="26" height="23" rx="4" /><circle cx="11" cy="12" r="2" /><path d="m4 25 8-8 5 5 5-7 7 10" /></> :
      kind === "compass" ? <><circle cx="16" cy="16" r="13" /><path d="m21 11-3 8-8 3 3-8zM16 1v4M31 16h-4M16 31v-4M1 16h4" /></> :
      kind === "mountain" ? <><path d="m2 27 10-19 7 12 4-8 8 15zM8 16l4 3 3-4M21 17l3 3 2-2" /><path d="M22 8V2l7 3-7 3" /></> :
      kind === "clock" ? <><circle cx="16" cy="16" r="12" /><path d="M16 8v9l6 4" /></> :
      kind === "wallet" ? <><rect x="3" y="7" width="26" height="21" rx="4" /><path d="M3 11V6l21-3v4M22 15h7v9h-7z" /><circle cx="25" cy="19.5" r="1" /></> :
      kind === "bell" ? <><path d="M7 13a9 9 0 0 1 18 0c0 10 4 10 4 11H3c0-1 4-1 4-11zM12 28h8" /></> :
      kind === "check" ? <path d="m6 16 7 7L27 8" strokeWidth="3" /> :
      <><path d="M26 13c0 8-10 16-10 16S6 21 6 13a10 10 0 1 1 20 0z" /><circle cx="16" cy="13" r="3.5" /></>}
  </svg>
);

const Hand: React.FC<{ t: number; x: number; y: number; at: number; fromX?: number; fromY?: number }> = ({ t, x, y, at, fromX = x + 70, fromY = y + 85 }) => {
  if (t < at - 0.6 || t > at + 0.85) return null;
  const move = mix(t, at - 0.55, at - 0.05);
  const opacity = Math.min(mix(t, at - 0.6, at - 0.4), 1 - mix(t, at + 0.5, at + 0.85));
  const press = interpolate(t, [at - 0.08, at, at + 0.18], [1, 0.83, 1], clamp);
  const age = (t - at) / 0.6;
  const px = fromX + (x - fromX) * move;
  const py = fromY + (y - fromY) * move;
  return <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none", zIndex: 30 }}>
    {age >= 0 && age <= 1 && <div style={{ position: "absolute", left: x - 10 - age * 28, top: y - 10 - age * 28, width: 20 + age * 56, height: 20 + age * 56, borderRadius: "50%", border: "3px solid #b78942", opacity: 1 - age }} />}
    <svg width="58" height="76" viewBox="0 0 64 84" style={{ position: "absolute", left: px - 23, top: py - 3, overflow: "visible", transform: `scale(${press})`, transformOrigin: "23px 3px", filter: "drop-shadow(0 4px 3px #092e2345)" }}>
      <path d="M19 43V10C19 0 32 0 32 10V30C32 22 43 23 43 32V35C43 28 54 28 54 37V42C54 35 63 36 63 45V56C63 65 55 74 52 81H27C25 74 20 70 16 65L3 49C-1 44 7 38 12 43L19 50Z" fill={C.green} stroke={paper} strokeWidth="4" strokeLinejoin="round" />
      <path d="M32 30V48M43 35V50M54 42V54" fill="none" stroke={paper} strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>;
};

const Phone: React.FC<{ title: string; children: React.ReactNode; x?: number; width?: number }> = ({ title, children, x = 250, width = 480 }) => (
  <div style={{ position: "absolute", left: x, top: 7, width, height: 798, boxSizing: "border-box", border: "10px solid #143d31", borderRadius: 59, background: C.paper, boxShadow: shadow, overflow: "hidden" }}>
    <div style={{ height: 76, position: "relative", borderBottom: `1px solid ${border}`, background: paper }}>
      <div style={{ position: "absolute", left: 28, top: 18, fontSize: 16, fontWeight: 600 }}>9:41</div>
      <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 126, height: 26, borderRadius: 20, background: "#143d31" }} />
      <div style={{ position: "absolute", left: 28, right: 26, top: 46, display: "flex", justifyContent: "space-between", fontSize: 17, letterSpacing: 1.3 }}><span style={{ fontFamily: serif, fontWeight: 600 }}>THÁM VĂN</span><span style={{ opacity: 0.7 }}>•••</span></div>
    </div>
    <div style={{ padding: "20px 27px 0", fontFamily: serif, fontSize: 32, lineHeight: 1.22, fontWeight: 600 }}>{title}</div>
    {children}
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 44, background: paper, display: "flex", alignItems: "center", justifyContent: "center", borderTop: `1px solid ${border}` }}><div style={{ height: 4, width: 140, borderRadius: 8, background: C.green, opacity: 0.5 }} /></div>
  </div>
);

const Browser: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ position: "absolute", left: 12, right: 12, top: 47, height: 706, background: paper, border: `1px solid ${border}`, borderRadius: 28, overflow: "hidden", boxShadow: shadow }}>
    <div style={{ height: 51, padding: "0 22px", display: "flex", alignItems: "center", gap: 8, background: "#e9e1cf", borderBottom: `1px solid ${border}` }}>
      {["#b87660", "#c5a35c", "#77a085"].map((color) => <span key={color} style={{ width: 11, height: 11, background: color, borderRadius: "50%" }} />)}
      <div style={{ background: "#fffaf1", borderRadius: 20, marginLeft: 18, width: 640, height: 30, display: "flex", justifyContent: "center", alignItems: "center", fontSize: 17, color: "#5b6c60" }}>{DOMAIN}</div>
    </div>
    <div style={{ height: 70, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${border}` }}><span style={{ fontFamily: serif, fontWeight: 600, fontSize: 24 }}>THÁM VĂN</span><span style={{ fontSize: 20, color: C.terra }}>{title}</span></div>
    {children}
  </div>
);

const Button: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; light?: boolean }> = ({ children, style, light }) => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "17px 20px", borderRadius: 15, background: light ? C.cream : C.green, color: light ? C.green : paper, fontSize: 24, fontWeight: 500, boxSizing: "border-box", ...style }}>{children}</div>
);

// MapLibre projected these OSRM coordinates with the captured camera; both layers share the crop.
const RouteMap: React.FC<{ t: number; draw?: number; photos?: boolean; radius?: boolean; style?: React.CSSProperties }> = ({ t, draw = 0, photos, radius, style }) => (
  <div style={{ position: "relative", overflow: "hidden", borderRadius: 21, background: "#e9e6d5", ...style }}>
    <Img src={staticFile("guide120/journey-map-base.png")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
    <svg viewBox={`0 0 ${routeProjection.width} ${routeProjection.height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
      {[paper, C.green].map((color, i) => <polyline key={color} points={routeProjection.points.map(([x, y]: number[]) => `${x},${y}`).join(" ")} pathLength="1" fill="none" stroke={color} strokeWidth={i === 0 ? 15 : 8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, Math.max(0, draw))} />)}
      {[routeProjection.points[0], routeProjection.points[routeProjection.points.length - 1]].map(([x, y], i) => <g key={i} transform={`translate(${x},${y})`} opacity={draw > (i === 0 ? 0 : 0.98) ? 1 : 0}><circle r="18" fill={C.green} stroke={paper} strokeWidth="5" /><text y="6" textAnchor="middle" fill={paper} fontSize="18" fontFamily={sans}>{i + 1}</text></g>)}
      {photos && ["post-office.jpg", "independence-palace.jpg"].map((image, i) => { const point = routeProjection.points[i === 0 ? 0 : routeProjection.points.length - 1]; return <g key={image} transform={`translate(${point[0] - 105},${point[1] - 162})`} opacity={mix(t, 0.12 + i * 0.5)}><rect width="210" height="141" rx="12" fill={paper} /><image href={photo(image)} x="6" y="6" width="198" height="129" preserveAspectRatio="xMidYMid slice" /><path d="m92 141 13 20 13-20" fill={paper} /></g>; })}
    </svg>
    <div style={{ position: "absolute", top: 13, left: 13, padding: "7px 10px", borderRadius: 10, background: "#fffaf1ed", fontSize: 16, color: C.green }}>{radius ? "Vùng khám phá · 3 km" : `Đi bộ · ${routeDistanceKm} km`}</div>
    <div style={{ position: "absolute", bottom: 7, right: 9, padding: "3px 5px", borderRadius: 4, background: "#fffaf1dc", fontSize: 10, color: C.green }}>© OpenFreeMap · © OpenStreetMap</div>
  </div>
);

const plans = [
  { name: "Free", price: "0đ", caption: "Bắt đầu khám phá", features: ["Bản đồ & Camera AI", "5 thử thách/ngày"] },
  { name: "Premium", price: "39.000đ", caption: "Khám phá mỗi ngày", features: ["Toàn bộ Story Walks", "Không giới hạn thử thách"] },
  { name: "Premium Family", price: "89.000đ", caption: "Cả nhà cùng trải nghiệm", features: ["Tối đa 4 thành viên", "Lịch trình AI"] },
];

const Plans: React.FC<{ t: number; family?: boolean; cues: Record<string, number> }> = ({ t, family, cues }) => {
  const selected = t >= (family ? cues.family : cues.premium);
  const index = family ? 2 : 1;
  return <Browser title="Gói hội viên">
    <div style={{ padding: "25px 28px 0", fontFamily: serif, fontSize: 38, fontWeight: 600 }}>Chọn cách khám phá</div>
    <div style={{ position: "absolute", left: 27, right: 27, top: 215, display: "flex", gap: 17 }}>
      {plans.map((p, i) => {
        const active = selected && i === index;
        const lightFree = !family && t >= cues.free && t < cues.premium && i === 0;
        return <div key={p.name} style={{ width: 288, minHeight: 367, padding: "23px 20px", boxSizing: "border-box", borderRadius: 22, background: active ? C.green : C.paper, color: active ? paper : C.green, border: `2px solid ${active || lightFree ? C.green : border}`, boxShadow: active ? "0 15px 30px #092e2324" : "none", transform: `translateY(${active ? -11 : 0}px)` }}>
          <div style={{ fontFamily: serif, fontSize: i === 2 ? 27 : 32, fontWeight: 600, whiteSpace: "nowrap" }}>{p.name}</div>
          <div style={{ fontSize: 18, marginTop: 13, opacity: 0.75 }}>{p.caption}</div>
          <div style={{ fontSize: 43, marginTop: 28, letterSpacing: -1.5, fontWeight: 600 }}>{p.price}</div>
          <div style={{ fontSize: 19, opacity: 0.8, marginTop: 3 }}>{i === 0 ? "Luôn miễn phí" : "/ tháng"}</div>
          <div style={{ margin: "22px 0 17px", borderTop: `1px solid ${active ? "#fffaf13b" : border}` }} />
          {p.features.map((f, n) => <div key={f} style={{ fontSize: 21, lineHeight: 1.35, marginTop: 13, display: "flex", gap: 8, alignItems: "flex-start", color: lightFree && n === 1 ? C.terra : undefined }}><span>✓</span><span>{f}</span></div>)}
        </div>;
      })}
    </div>
    {!family && <div style={{ position: "absolute", left: 28, right: 28, bottom: 29, height: 57, borderRadius: 14, background: C.cream, display: "flex", justifyContent: "center", alignItems: "center", gap: 15, fontSize: 24 }}><span style={{ fontSize: 37, fontFamily: serif }}>{t >= cues.unlimited ? "∞" : "5"}</span><span>{t >= cues.unlimited ? "Không giới hạn thử thách với Premium" : "Lượt thử thách mỗi ngày với Free"}</span></div>}
    {family && <div style={{ position: "absolute", left: 28, right: 28, bottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 11, ...pop(t, cues.people) }}>{["Bố", "Mẹ", "An", "Minh"].map((name, i) => <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><div style={{ width: 45, height: 45, borderRadius: "50%", background: ["#d9b985", "#c98f75", "#a9b9a0", "#afc7c1"][i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, border: `3px solid ${paper}` }}>{name[0]}</div><span style={{ fontSize: 17 }}>{name}</span></div>)}</div>
      <Button style={{ width: 318, ...pop(t, cues.benefit) }}>Mở lịch trình AI →</Button>
    </div>}
  </Browser>;
};

const Planner: React.FC<{ t: number; cues: Record<string, number>; preview?: boolean }> = ({ t, cues, preview }) => {
  const made = !preview && t >= cues.results;
  const fields = [{ name: "Bán kính khám phá", value: "3 km", kind: "pin", cue: cues.radius }, { name: "Thời gian trải nghiệm", value: "Nửa ngày", kind: "clock", cue: cues.time }, { name: "Ngân sách tối đa", value: "500.000đ", kind: "wallet", cue: cues.budget }];
  return <Browser title="Lịch trình AI">
    <div style={{ padding: "24px 28px 0", fontFamily: serif, fontSize: 35, fontWeight: 600 }}>Một hành trình, theo cách của bạn</div>
    <div style={{ position: "absolute", top: 193, left: 28, width: 351 }}>
      {fields.map((f) => <div key={f.name} style={{ height: 96, padding: "14px 17px", marginBottom: 15, boxSizing: "border-box", background: !preview && t >= f.cue ? "#ecf0e5" : C.paper, border: `2px solid ${!preview && t >= f.cue && t < f.cue + 0.6 ? C.green : border}`, borderRadius: 17, display: "flex", alignItems: "center", gap: 14 }}><Icon kind={f.kind} size={29} /><div><div style={{ fontSize: 18, opacity: 0.7 }}>{f.name}</div><div style={{ fontSize: 28, marginTop: 5, fontWeight: 500 }}>{!preview && t >= f.cue ? f.value : "Chọn điều kiện"}</div></div></div>)}
      <Button style={{ marginTop: 18 }}>{made ? "✓ Lịch trình đã sẵn sàng" : !preview && t >= cues.create ? "AI đang sắp xếp…" : "Tạo lịch trình"}</Button>
      <div style={{ fontSize: 17, marginTop: 14, opacity: 0.66 }}>Lựa chọn minh họa của người dùng</div>
    </div>
    <RouteMap t={preview ? 0 : t - cues.radius} radius={!made} draw={made ? mix(t, cues.results, cues.results + 0.9) : 0} style={{ position: "absolute", left: 404, top: 193, width: 522, height: 386 - mix(t, cues.results, cues.results + 0.35) * 106 }} />
    {made && <div style={{ position: "absolute", left: 404, right: 29, top: 489, padding: 16, borderRadius: 19, background: "#f2eadc", ...pop(t, cues.results + 0.25) }}><div style={{ color: C.terra, fontSize: 18, marginBottom: 11 }}>LỊCH TRÌNH ĐỀ XUẤT</div><div style={{ fontSize: 22, fontWeight: 500 }}>09:00 · Bưu điện Trung tâm</div><div style={{ marginTop: 8, fontSize: 22 }}>10:00 · Dinh Độc Lập</div><div style={{ marginTop: 11, fontSize: 18, opacity: 0.7 }}>Thời lượng & chi phí: xem từng điểm đến</div></div>}
  </Browser>;
};

const Badge: React.FC<{ label: string; kind: string; active: boolean; index: number }> = ({ label, kind, active, index }) => (
  <div style={{ width: 266, textAlign: "center", padding: "30px 14px 25px", borderRadius: 25, boxSizing: "border-box", border: `2px solid ${active ? "#a67d3b" : border}`, background: active ? "#eee1c4" : C.paper, transform: `translateY(${active ? -13 : 0}px) scale(${active ? 1.035 : 1})`, boxShadow: active ? "0 15px 25px #092e231a" : "none" }}>
    <svg width="178" height="185" viewBox="0 0 178 185"><path d="M39 129 28 178l42-16 19 23 19-23 42 16-11-49" fill={["#8f4f36", "#64816e", "#b58a49"][index]} /><path d="m89 4 61 25 24 62-24 60-61 25-61-25L4 91l24-62z" fill="#ead7ac" stroke="#977334" strokeWidth="3" /><circle cx="89" cy="90" r="61" fill={paper} stroke="#a58343" strokeWidth="2" /><circle cx="89" cy="90" r="53" fill="none" stroke="#d6bf92" strokeWidth="1" strokeDasharray="3 6" /><foreignObject x="54" y="55" width="70" height="70"><Icon kind={kind} size={70} /></foreignObject></svg>
    <div style={{ marginTop: 19, fontFamily: serif, fontSize: 27, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 18, opacity: 0.7, marginTop: 10 }}>Danh hiệu khám phá</div>
  </div>
);

export const GuideJourney: React.FC<{ scene: string; progress: number; cues?: Record<string, number> }> = ({ scene, progress: t, cues: supplied }) => {
  const cues = { ...JOURNEY_CUES[scene], ...supplied };
  let content: React.ReactNode = null;
  if (scene === "challenge") {
    const question = t >= cues.question;
    const correct = t >= cues.complete;
    content = <>
      <Phone title={question ? "Thử thách tại điểm đến" : "Bạn đã đến nơi"}>
        {!question ? <><Img src={photo("independence-palace.jpg")} style={{ position: "absolute", left: 27, top: 153, width: 406, height: 279, borderRadius: 20, objectFit: "cover" }} /><div style={{ position: "absolute", left: 27, right: 27, top: 454, fontFamily: serif, fontSize: 32, lineHeight: 1.3 }}>Dinh Độc Lập</div><Button style={{ position: "absolute", left: 27, right: 27, top: 538 }}>{t >= cues.checkin ? "✓ Check-in thành công" : "Check-in GPS"}</Button></> : <div style={{ position: "absolute", left: 27, right: 27, top: 158 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.terra, fontSize: 19 }}><Icon size={24} color={C.terra} /> Dinh Độc Lập</div>
          <div style={{ fontSize: 25, lineHeight: 1.45, margin: "19px 0 21px", fontWeight: 500 }}>Kiến trúc sư nào thiết kế công trình Dinh Độc Lập hiện tại?</div>
          {["Nguyễn Công Trứ", "Ngô Viết Thụ", "Huỳnh Tấn Phát", "Lê Văn Tám"].map((answer, i) => <div key={answer} style={{ height: 59, border: `2px solid ${i === 1 && t >= cues.answer ? C.green : border}`, borderRadius: 14, marginTop: 11, padding: "0 15px", display: "flex", alignItems: "center", gap: 12, fontSize: 22, background: i === 1 && t >= cues.answer ? "#dce8d7" : paper }}><span style={{ width: 27, fontSize: 18, opacity: 0.6 }}>{String.fromCharCode(65 + i)}</span>{answer}{i === 1 && correct && <span style={{ marginLeft: "auto" }}>✓</span>}</div>)}
          {correct && <div style={{ marginTop: 18, textAlign: "center", color: C.green, fontWeight: 500, fontSize: 23, ...pop(t, cues.complete) }}>✓ Hoàn thành thử thách</div>}
        </div>}
      </Phone>
      {t >= cues.xp && <div style={{ position: "absolute", left: 38, top: 485, width: 278, background: C.green, color: paper, borderRadius: 24, padding: 26, boxShadow: shadow, ...pop(t, cues.xp) }}><div style={{ fontSize: 47, fontWeight: 600 }}>+XP</div><div style={{ marginTop: 8, fontSize: 22 }}>Thêm trải nghiệm mới</div><div style={{ height: 8, background: "#ffffff30", borderRadius: 8, marginTop: 21 }}><div style={{ width: `${48 + mix(t, cues.xp, cues.level + 0.4) * 43}%`, background: "#dfbe7b", height: "100%", borderRadius: 8 }} /></div><div style={{ marginTop: 12, fontSize: 20 }}>{t >= cues.level ? "Tiến gần cấp độ mới" : "Tích điểm kinh nghiệm"}</div></div>}
      <Hand t={t} x={488} y={590} at={cues.checkin} /><Hand t={t} x={472} y={412} at={cues.answer} />
    </>;
  } else if (scene === "pricing") {
    content = <><Plans t={t} cues={cues} /><Hand t={t} x={488} y={590} at={cues.premium} /></>;
  } else if (scene === "voucher") {
    const revealed = t >= cues.reveal;
    content = <Browser title="Điểm & ưu đãi">
      <div style={{ position: "absolute", left: 41, top: 174, width: 360, height: 388, borderRadius: 27, background: C.green, color: paper, padding: 31, boxSizing: "border-box" }}><div style={{ fontSize: 21, letterSpacing: 2 }}>ĐIỂM CỦA BẠN</div><div style={{ fontFamily: serif, fontSize: 90, marginTop: 28, lineHeight: 1.2 }}>XP</div><div style={{ fontSize: 23, marginTop: 8, lineHeight: 1.55 }}>Tích lũy từ những<br />hành trình khám phá.</div><Button light style={{ position: "absolute", left: 25, right: 25, bottom: 28 }}>{revealed ? "✓ Đã mở ưu đãi" : "Đổi ưu đãi"}</Button></div>
      <div style={{ position: "absolute", left: 433, top: 329, fontSize: 41, color: C.terra, opacity: mix(t, 0.7) }}>→</div>
      <div style={{ position: "absolute", left: 505, top: 213, width: 384, height: 307, borderRadius: 23, border: "2px dashed #a67d3b", background: "#f1e3c6", overflow: "hidden", boxShadow: revealed ? shadow : "none", transform: `perspective(1000px) rotateY(${revealed ? (1 - mix(t, cues.reveal)) * 28 : 0}deg)` }}><div style={{ position: "absolute", left: 29, top: 26, fontSize: 19, color: C.brass, letterSpacing: 2 }}>THÁM VĂN / VOUCHER</div><div style={{ position: "absolute", left: 29, top: 81, fontFamily: serif, fontSize: 38, lineHeight: 1.3 }}>Ưu đãi<br />trải nghiệm</div><div style={{ position: "absolute", bottom: 23, left: 29, right: 29, borderTop: "1px dashed #b59c71", paddingTop: 20, fontSize: 23, opacity: revealed ? 1 : 0.35 }}>{revealed ? "Xem ưu đãi →" : "Khám phá bằng XP"}</div></div>
      {[0, 1, 2].map((n) => { const p = mix(t, 0.7 + n * 0.16, 1.8 + n * 0.16); return <div key={n} style={{ position: "absolute", left: 380 + p * 175, top: 307 - Math.sin(p * Math.PI) * 65 + n * 22, opacity: p > 0 && p < 1 ? 1 : 0, padding: "6px 9px", borderRadius: 9, fontSize: 19, color: C.brass, background: "#e6c88a" }}>XP</div>; })}
    </Browser>;
    content = <>{content}<Hand t={t} x={234} y={560} at={cues.exchange} /></>;
  } else if (scene === "family") {
    content = <><div style={{ opacity: 1 - mix(t, cues.form, cues.form + 0.35) }}><Plans t={t} family cues={cues} /></div><div style={{ opacity: mix(t, cues.form, cues.form + 0.35), transform: `translateY(${(1 - mix(t, cues.form, cues.form + 0.35)) * 30}px)` }}><Planner t={0} cues={JOURNEY_CUES.planner} preview /></div><Hand t={t} x={794} y={591} at={cues.family} /><Hand t={t} x={779} y={696} at={cues.planner} /></>;
  } else if (scene === "planner") {
    content = <><Planner t={t} cues={cues} /><Hand t={t} x={254} y={289} at={cues.radius} /><Hand t={t} x={254} y={400} at={cues.time} /><Hand t={t} x={254} y={512} at={cues.budget} /><Hand t={t} x={212} y={607} at={cues.create} /></>;
  } else if (scene === "titles") {
    const collection = t >= cues.collection;
    content = <Browser title="Hộ chiếu di sản">
      <div style={{ position: "absolute", top: 151, left: 32, right: 32, display: "flex", alignItems: "center", gap: 16 }}><div style={{ width: 54, height: 54, borderRadius: "50%", background: "#ead7ac", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon kind="compass" size={33} /></div><div><div style={{ fontFamily: serif, fontSize: 32 }}>Bộ sưu tập danh hiệu</div><div style={{ fontSize: 19, opacity: 0.65, marginTop: 5 }}>Từng hành trình, thêm một dấu mốc</div></div></div>
      {!collection && <div style={{ position: "absolute", left: 35, right: 35, top: 252, display: "flex", gap: 24 }}><Img src={photo("post-office.jpg")} style={{ width: 407, height: 276, objectFit: "cover", borderRadius: 23 }} /><div style={{ flex: 1, paddingTop: 31 }}><div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1.35 }}>Bưu điện Trung tâm<br />Sài Gòn</div><div style={{ marginTop: 27, fontSize: 23, color: C.terra }}>✓ Đã ghé thăm</div><Button style={{ marginTop: 24 }}>{t >= cues.save ? "✓ Đã lưu vào hành trình" : "Lưu ảnh kỷ niệm"}</Button></div></div>}
      {collection && <div style={{ position: "absolute", left: 33, right: 33, top: 275, display: "flex", gap: 23, ...pop(t, cues.collection) }}>{[{ label: "Nhà Lãng Du", kind: "pin", start: cues.wander, end: cues.nomad }, { label: "Nhà Du Mục", kind: "mountain", start: cues.nomad, end: cues.explorer }, { label: "Nhà Thám Hiểm", kind: "compass", start: cues.explorer, end: Infinity }].map((badge, index) => <Badge key={badge.label} label={badge.label} kind={badge.kind} index={index} active={t >= badge.start && t < badge.end} />)}</div>}
      <div style={{ position: "absolute", bottom: 25, left: 33, fontSize: 20, color: C.brass }}>{collection ? "Dấu ấn của nhiều hành trình khám phá…" : "Ảnh & địa điểm được lưu trong hành trình của bạn"}</div>
    </Browser>;
  } else if (scene === "photos") {
    const saved = t >= cues.collection;
    content = <><Phone title="Hành trình của tôi">
      <div style={{ position: "absolute", left: 27, top: 153, right: 27 }}>
        {[{ img: "post-office.jpg", name: "Bưu điện Trung tâm Sài Gòn" }, { img: "independence-palace.jpg", name: "Dinh Độc Lập" }].map((p, i) => <div key={p.img} style={{ position: "relative", height: saved ? 197 : i === 0 ? 344 : 0, marginBottom: 15, borderRadius: 20, overflow: "hidden", opacity: i === 0 ? 1 : mix(t, cues.collection, cues.collection + 0.5) }}><Img src={photo(p.img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "33px 17px 15px", background: "linear-gradient(transparent,#092e23d9)", color: paper, fontSize: 21, lineHeight: 1.3 }}>{p.name}</div>{saved && <div style={{ position: "absolute", top: 12, right: 12, width: 31, height: 31, borderRadius: "50%", background: paper, display: "flex", justifyContent: "center", alignItems: "center" }}>✓</div>}</div>)}
        <Button style={{ marginTop: 22 }}>{saved ? "Mở TimelineMap →" : "Lưu vào hành trình"}</Button>
      </div>
    </Phone>
      {t >= cues.places && <div style={{ position: "absolute", left: 0, top: 423, width: 232, padding: "22px 20px", boxSizing: "border-box", borderRadius: 24, background: paper, border: `1px solid ${border}`, boxShadow: shadow, ...pop(t, cues.places) }}><Icon /><div style={{ fontFamily: serif, fontSize: 27, marginTop: 10 }}>Nơi đã đến</div><div style={{ fontSize: 19, marginTop: 8 }}>2 điểm đến · 2 ảnh</div>{t >= cues.distance && <div style={{ borderTop: `1px solid ${border}`, paddingTop: 17, marginTop: 17, ...pop(t, cues.distance) }}><div style={{ fontSize: 39, fontWeight: 600 }}>{routeDistanceKm} <span style={{ fontSize: 23 }}>km</span></div><div style={{ fontSize: 17, marginTop: 5, lineHeight: 1.45 }}>Theo đường đi bộ<br />Lộ trình mẫu</div></div>}</div>}
      <Hand t={t} x={489} y={577} at={cues.save} />
    </>;
  } else if (scene === "timeline") {
    const preview = t >= cues.preview;
    content = <Browser title="TimelineMap">
      <div style={{ position: "absolute", left: 31, top: 146, fontFamily: serif, fontWeight: 600, fontSize: 33 }}>Dấu chân Sài Gòn</div><div style={{ position: "absolute", right: 31, top: 153, color: C.brass, fontSize: 19 }}>2 điểm đến · 2 ảnh</div>
      <div style={{ position: "absolute", left: 30, right: 30, top: 207, height: 356, borderRadius: 22, overflow: "hidden", border: preview ? "6px solid #143d31" : `1px solid ${border}`, boxSizing: "border-box" }}>
        <RouteMap t={t - cues.photos} draw={mix(t, cues.route, cues.route + 1.5)} photos={t >= cues.photos} style={{ position: "absolute", inset: 0 }} />
        {preview && <div style={{ position: "absolute", top: 16, left: 16, right: 16, height: 285, display: "flex", borderRadius: 14, overflow: "hidden", background: paper, boxShadow: shadow, ...pop(t, cues.preview) }}><div style={{ width: "58%", position: "relative" }}><Img src={photo(t < cues.preview + 1.15 ? "post-office.jpg" : "independence-palace.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1 + mix(t, cues.preview, cues.ready) * 0.04})` }} /><div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,#092e23dd)", color: paper, padding: "35px 20px 19px", fontSize: 24, fontFamily: serif }}>{t < cues.preview + 1.15 ? "Bưu điện Trung tâm Sài Gòn" : "Dinh Độc Lập"}</div></div><div style={{ flex: 1, position: "relative" }}><RouteMap t={t} draw={mix(t, cues.preview, cues.preview + 1.8)} style={{ position: "absolute", inset: 0 }} /><div style={{ position: "absolute", left: 15, right: 15, bottom: 17, background: "#fffaf1eb", borderRadius: 12, padding: 12, fontSize: 18, lineHeight: 1.5 }}>Dấu chân Sài Gòn<br /><strong>Chuyến đi của riêng bạn</strong></div></div></div>}
        {preview && <div style={{ position: "absolute", left: 17, right: 17, bottom: 12, height: 5, borderRadius: 5, background: "#ffffff60" }}><div style={{ height: "100%", width: `${mix(t, cues.preview, cues.ready) * 100}%`, background: C.terra, borderRadius: 5 }} /></div>}
      </div>
      <div style={{ position: "absolute", top: 583, left: 31, right: 31, display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", gap: 8 }}>{["TimelineMap", "Ảnh", "Kỷ niệm"].map((label, i) => { const active = preview ? i === 2 : t >= cues.open && i === 0; return <div key={label} style={{ padding: "10px 12px", borderRadius: 10, fontSize: 18, color: active ? paper : C.green, background: active ? C.green : C.cream }}>{label}</div>; })}</div><Button style={{ width: 354 }}>{t >= cues.ready ? "↓ Lưu video" : t >= cues.create ? "Đang dựng kỷ niệm…" : "Tạo video kỷ niệm"}</Button></div>
    </Browser>;
    content = <>{content}<Hand t={t} x={115} y={660} at={cues.open} /><Hand t={t} x={756} y={663} at={cues.create} /></>;
  } else if (scene === "permissions") {
    const picker = t >= cues.picker && t < cues.upload;
    content = <><Phone title={picker ? "Chọn ảnh từ thiết bị" : "Quyền riêng tư của bạn"}>
      {!picker ? <div style={{ position: "absolute", left: 27, right: 27, top: 160 }}>
        <div style={{ padding: "18px 15px", border: `1px solid ${border}`, borderRadius: 16, background: paper, fontSize: 21, lineHeight: 1.45, display: "flex", alignItems: "center", gap: 13 }}><div style={{ width: 29, height: 29, flexShrink: 0, border: `2px solid ${C.green}`, borderRadius: 6, background: t >= cues.policy ? C.green : "transparent", color: paper, display: "flex", justifyContent: "center", alignItems: "center", fontSize: 21 }}>{t >= cues.policy ? "✓" : ""}</div>Điều khoản &<br />quyền riêng tư</div>
        {[{ name: "Vị trí", kind: "pin", at: cues.location }, { name: "Camera", kind: "camera", at: cues.camera }].map((p) => <div key={p.name} style={{ height: 83, display: "flex", alignItems: "center", gap: 15, borderBottom: `1px solid ${border}` }}><Icon kind={p.kind} /><span style={{ fontSize: 24 }}>{p.name}</span><div style={{ width: 54, height: 30, borderRadius: 20, background: t >= p.at ? C.green : "#c9cdbf", marginLeft: "auto", padding: 4, boxSizing: "border-box" }}><div style={{ width: 22, height: 22, borderRadius: "50%", background: paper, transform: `translateX(${t >= p.at ? 24 : 0}px)` }} /></div></div>)}
        <div style={{ height: 83, display: "flex", gap: 15, alignItems: "center", borderBottom: `1px solid ${border}` }}><Icon kind="photo" /><span style={{ fontSize: 22 }}>Chọn ảnh từ thiết bị</span><span style={{ marginLeft: "auto", fontSize: 28 }}>›</span></div>
        {t >= cues.upload && <div style={{ display: "flex", gap: 13, alignItems: "center", marginTop: 17, padding: 12, background: "#e1eadc", borderRadius: 15, ...pop(t, cues.upload) }}><Img src={photo("post-office.jpg")} style={{ width: 93, height: 68, objectFit: "cover", borderRadius: 9 }} /><div style={{ fontSize: 19, lineHeight: 1.5 }}>✓ Chỉ 1 ảnh đã chọn<br /><span style={{ opacity: 0.7 }}>Được nhận vào ứng dụng</span></div></div>}
        {t >= cues.notification && <div style={{ marginTop: 18, display: "flex", gap: 13, alignItems: "center", ...pop(t, cues.notification) }}><Icon kind="bell" /><div style={{ fontSize: 21 }}>Thông báo</div><div style={{ marginLeft: "auto", padding: "8px 11px", background: C.cream, borderRadius: 10, fontSize: 16 }}>Tùy chọn</div></div>}
      </div> : <div style={{ position: "absolute", left: 20, right: 20, top: 162 }}><div style={{ fontSize: 20, marginBottom: 19, opacity: 0.65 }}>Ảnh gần đây · Chỉ ảnh bạn chọn</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{["post-office.jpg", "independence-palace.jpg", "temple-roof.jpg", "non-la.jpg"].map((img, i) => <div key={img} style={{ height: 171, position: "relative", borderRadius: 14, overflow: "hidden", border: `4px solid ${i === 0 && t >= cues.select ? C.green : "transparent"}`, boxSizing: "border-box" }}><Img src={photo(img)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: t >= cues.select && i > 0 ? 0.6 : 1 }} /><div style={{ position: "absolute", top: 9, right: 9, borderRadius: "50%", width: 28, height: 28, border: `2px solid ${paper}`, background: i === 0 && t >= cues.select ? C.green : "#092e2350", color: paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{i === 0 && t >= cues.select ? "✓" : ""}</div></div>)}</div><Button style={{ marginTop: 24 }}>{t >= cues.select ? "Thêm 1 ảnh đã chọn" : "Chọn ảnh muốn tải lên"}</Button></div>}
    </Phone><Hand t={t} x={307} y={227} at={cues.policy} /><Hand t={t} x={655} y={318} at={cues.location} /><Hand t={t} x={655} y={401} at={cues.camera} /><Hand t={t} x={643} y={484} at={cues.picker} /><Hand t={t} x={386} y={325} at={cues.select} /><Hand t={t} x={490} y={632} at={cues.upload} /></>;
  }
  return <div style={{ position: "absolute", inset: 0, width: 980, height: 820, fontFamily: sans, color: C.green }}>{content}</div>;
};
