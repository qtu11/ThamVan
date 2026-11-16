import React from "react";
import { Easing, Img, interpolate, staticFile } from "remotion";
import { C, DOMAIN, sans, serif } from "./theme";
import noticeProjection from "../public/guide120/notice-map-projection.json";
import atlasCalibration from "../public/guide120/atlas-overview-calibration.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const reveal = (t: number, at = 0, duration = 0.4) => interpolate(t, [at, at + duration], [0, 1], { ...clamp, easing: ease });
const shadow = "0 25px 65px #092e2322, 0 2px 8px #092e2310";
const img = (name: string) => staticFile(`silent58/${name}`);
const church = () => staticFile("guide120/notre-dame.jpg");

const Finger: React.FC<{ t: number; at: number; x: number; y: number }> = ({ t, at, x, y }) => {
  if (t < at - 0.8 || t > at + 0.75) return null;
  const enter = reveal(t, at - 0.8, 0.5);
  const leave = 1 - reveal(t, at + 0.4, 0.3);
  const press = interpolate(t, [at - 0.1, at, at + 0.16, at + 0.28], [1, 0.84, 0.97, 1], clamp);
  const age = t - at;
  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20, opacity: enter * leave }}>
    {[0, 0.12].map((delay) => age >= delay && age < delay + 0.48 ? <div key={delay} style={{ position: "absolute", left: x, top: y, width: 18 + 100 * (age - delay), height: 18 + 100 * (age - delay), border: "3px solid #bc8e48", borderRadius: "50%", transform: "translate(-50%, -50%)", opacity: 1 - (age - delay) / 0.48 }} /> : null)}
    <svg width="56" height="74" viewBox="0 0 64 84" style={{ position: "absolute", left: x - 20 + 55 * (1 - enter), top: y - 3 + 45 * (1 - enter), overflow: "visible", transform: `scale(${press})`, transformOrigin: "20px 3px", filter: "drop-shadow(0 5px 5px #092e2350)" }}>
      <path d="M19 43V10C19 0 32 0 32 10V30C32 22 43 23 43 32V35C43 28 54 28 54 37V42C54 35 63 36 63 45V56C63 65 55 74 52 81H27C25 74 20 70 16 65L3 49C-1 44 7 38 12 43L19 50Z" fill={C.green} stroke="#fffaf0" strokeWidth="4" strokeLinejoin="round" />
      <path d="M32 30V48M43 35V50M54 42V54" fill="none" stroke="#fffaf0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>;
};

const Phone: React.FC<{ children: React.ReactNode; x: number; y?: number; width?: number; height?: number; dark?: boolean; style?: React.CSSProperties }> = ({ children, x, y = 12, width = 416, height = 786, dark, style }) => <div style={{ position: "absolute", left: x, top: y, width, height, border: `9px solid ${C.greenDark}`, boxSizing: "border-box", borderRadius: 43, overflow: "hidden", background: dark ? C.greenDark : "#fffaf0", boxShadow: shadow, ...style }}>
  {children}
  <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", height: 22, width: 108, borderRadius: 20, background: C.greenDark }} />
  <div style={{ position: "absolute", bottom: 11, left: "50%", transform: "translateX(-50%)", height: 4, width: 111, borderRadius: 4, background: dark ? "#fffaf080" : "#11443670" }} />
</div>;

const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => <div style={{ padding: "10px 16px", borderRadius: 12, background: "#fffaf0ed", color: C.green, fontSize: 21, fontWeight: 600, ...style }}>{children}</div>;

const CulturalArt: React.FC<{ performance?: boolean }> = ({ performance }) => <Img
  src={staticFile(`guide120/${performance ? "performance-real.jpg" : "artifact-real.jpg"}`)}
  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: performance ? "50% 44%" : "50% 50%" }}
/>;

const Camera: React.FC<{ t: number; cues: Record<string, number> }> = ({ t, cues }) => {
  const open = cues.open ?? 0.45;
  const shot = cues.shutter ?? 2;
  const notre = cues.notre ?? 4;
  const artifact = cues.artifact ?? 6;
  const performance = cues.performance ?? 6.6;
  const captured = t >= shot + 0.1;
  const churchActive = t >= notre;
  const opened = t >= open;
  const cards = reveal(t, shot + 0.4);
  const picture = churchActive ? church() : img("dragon.png");
  return <>
    <div style={{ position: "absolute", left: 9, top: 115, width: 238, height: 293, borderRadius: 24, background: "#fffaf0", boxShadow: shadow, padding: 12, transform: "rotate(-4deg)", opacity: cards }}>
      <Img src={img("dragon.png")} style={{ width: "100%", height: 211, objectFit: "contain", borderRadius: 15, background: "#efe5cf" }} />
      <Label style={{ background: "transparent", textAlign: "center", padding: "15px 0" }}>Tượng rồng</Label>
    </div>
    <div style={{ position: "absolute", left: 726, top: 80, width: 238, height: 285, padding: 12, boxSizing: "border-box", borderRadius: 24, background: "#fffaf0", boxShadow: shadow, transform: `translateY(${24 * (1 - reveal(t, notre))}px) rotate(4deg)`, opacity: reveal(t, notre) }}>
      <Img src={church()} style={{ width: "100%", height: 205, objectFit: "cover", borderRadius: 15 }} />
      <Label style={{ background: "transparent", fontSize: 19, padding: "15px 0", textAlign: "center" }}>Nhà thờ Đức Bà</Label>
    </div>
    <div style={{ position: "absolute", left: 25, top: 459, width: 222, borderRadius: 23, overflow: "hidden", background: "#fffaf0", boxShadow: shadow, transform: `translateY(${25 * (1 - reveal(t, artifact))}px) rotate(3deg)`, opacity: reveal(t, artifact) }}>
      <div style={{ height: 165 }}><CulturalArt /></div><Label style={{ textAlign: "center", fontSize: 20, background: "transparent" }}>Hiện vật</Label>
    </div>
    <div style={{ position: "absolute", left: 726, top: 432, width: 238, borderRadius: 23, overflow: "hidden", background: "#fffaf0", boxShadow: shadow, transform: `translateY(${25 * (1 - reveal(t, performance))}px) rotate(-3deg)`, opacity: reveal(t, performance) }}>
      <div style={{ height: 183 }}><CulturalArt performance /></div><Label style={{ textAlign: "center", fontSize: 20, background: "transparent" }}>Nghệ thuật dân gian</Label>
    </div>
    <Phone x={281}>
      <div style={{ position: "absolute", top: 20, left: 23, fontSize: 15, fontWeight: 600 }}>9:41</div>
      <div style={{ position: "absolute", top: 58, left: 0, right: 0, textAlign: "center", fontSize: 24, fontWeight: 600 }}>{opened ? "Camera AI" : "Khám phá cùng Thám Văn"}</div>
      <div style={{ position: "absolute", top: 108, left: 16, right: 16, height: captured ? 410 : 449, borderRadius: 22, overflow: "hidden", background: "#e8dfcd" }}>
        <Img src={picture} style={{ width: "100%", height: "100%", objectFit: churchActive ? "cover" : "contain", transform: `scale(${1 + 0.025 * reveal(t, shot + 0.1)})` }} />
        {!captured ? <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}><path d="M25 80V26H78M285 26H338V80M25 367V420H78M285 420H338V367" stroke={C.green} strokeWidth="4" fill="none" strokeLinecap="round" /></svg> : null}
        {captured ? <Label style={{ position: "absolute", left: 13, top: 13, fontSize: 17, padding: "8px 12px" }}>✓ Ảnh đã chụp</Label> : null}
        {t >= shot && t < shot + 0.1 ? <div style={{ position: "absolute", inset: 0, background: "white", opacity: 1 - (t - shot) / 0.1 }} /> : null}
      </div>
      {captured ? <div style={{ position: "absolute", left: 23, right: 23, top: 537, opacity: reveal(t, shot + 0.15) }}>
        <div style={{ fontSize: 15, color: C.terra, letterSpacing: 1.1, fontWeight: 600 }}>CHỤP ĐỂ TÌM HIỂU</div>
        <div style={{ fontFamily: serif, fontSize: churchActive ? 29 : 32, fontWeight: 600, marginTop: 10 }}>{churchActive ? "Nhà thờ Đức Bà" : "Hình tượng rồng"}</div>
        <div style={{ fontSize: 18, lineHeight: 1.5, color: "#596a60", marginTop: 10 }}>{churchActive ? "Kiến trúc · Di sản Sài Gòn" : "Chi tiết điêu khắc trong\nmỹ thuật truyền thống"}</div>
        <div style={{ marginTop: 18, color: C.green, fontSize: 19, fontWeight: 600 }}>Tìm hiểu thêm ↗</div>
      </div> : <>
        <div style={{ position: "absolute", top: 584, left: 155, width: 86, height: 86, borderRadius: "50%", border: "4px solid #fffaf0", outline: `2px solid ${C.green}`, background: C.terra, display: "grid", placeItems: "center" }}><svg width="39" height="39" viewBox="0 0 40 40" fill="none"><path d="M6 13H13L17 7H24L28 13H34V33H6Z" stroke={C.paper} strokeWidth="2.8" strokeLinejoin="round" /><circle cx="20" cy="23" r="7" stroke={C.paper} strokeWidth="2.8" /></svg></div>
        <div style={{ position: "absolute", top: 689, left: 0, right: 0, textAlign: "center", fontSize: 18 }}>Đưa chủ thể vào khung hình</div>
      </>}
      {!opened ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, height: 70, background: "#fffaf0", borderTop: "1px solid #11443615", display: "flex", justifyContent: "space-evenly", alignItems: "center", fontSize: 16 }}><span>Trang chủ</span><span style={{ padding: "13px 20px", borderRadius: 24, color: C.paper, background: C.green }}>Camera AI</span><span>Atlas</span></div> : null}
    </Phone>
    <Finger t={t} at={open} x={489} y={732} />
    <Finger t={t} at={shot} x={489} y={648} />
  </>;
};

const Result: React.FC<{ t: number; cues: Record<string, number> }> = ({ t, cues }) => {
  const learn = cues.learn ?? 3;
  const sources = cues.sources ?? 5.2;
  const opened = reveal(t, learn + 0.1, 0.5);
  return <>
    <Phone x={81} width={426}>
      <div style={{ position: "absolute", top: 63, left: 23, right: 23, fontSize: 24, fontWeight: 600 }}>‹ &nbsp; Kết quả nhận diện</div>
      <Img src={church()} style={{ position: "absolute", top: 115, left: 16, width: 376, height: 291, borderRadius: 22, objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 426, left: 25, right: 25 }}>
        <div style={{ color: C.terra, fontSize: 16, letterSpacing: 1.4, fontWeight: 600 }}>KIẾN TRÚC · SÀI GÒN</div>
        <div style={{ fontFamily: serif, fontSize: 33, lineHeight: 1.22, fontWeight: 600, marginTop: 13 }}>Nhà thờ Đức Bà</div>
        <div style={{ fontSize: 20, lineHeight: 1.6, marginTop: 17, color: "#57685d" }}>Khám phá một dấu ấn kiến trúc trong không gian trung tâm thành phố.</div>
      </div>
      <div style={{ position: "absolute", left: 25, right: 25, top: 635, padding: "18px 12px", textAlign: "center", borderRadius: 16, background: C.green, color: C.paper, fontSize: 22, fontWeight: 600, transform: `scale(${t >= learn && t < learn + 0.15 ? 0.98 : 1})` }}>Tìm hiểu thêm ↗</div>
      <div style={{ position: "absolute", top: 715, width: "100%", textAlign: "center", color: "#718076", fontSize: 16 }}>Tìm hiểu từ thông tin và tư liệu</div>
    </Phone>
    <div style={{ position: "absolute", left: 523, top: 155, width: 430, padding: "30px 29px", boxSizing: "border-box", borderRadius: 29, background: "#fffaf0", border: "1px solid #11443618", boxShadow: shadow, opacity: opened, transform: `translateX(${45 * (1 - opened)}px)` }}>
      <div style={{ color: C.terra, fontSize: 16, letterSpacing: 1.7, fontWeight: 600 }}>ĐỌC SÂU HƠN</div>
      <div style={{ fontFamily: serif, fontSize: 35, lineHeight: 1.2, marginTop: 20 }}>Mỗi công trình,<br />một câu chuyện.</div>
      <div style={{ height: 2, width: 61, background: C.terra, marginTop: 23 }} />
      <div style={{ fontSize: 21, lineHeight: 1.65, marginTop: 24 }}>Từ đặc điểm kiến trúc đến những câu chuyện gắn với di sản giữa lòng Sài Gòn.</div>
      <div style={{ marginTop: 29, padding: "19px 19px", borderRadius: 17, border: `2px solid ${t >= sources ? "#b69a62" : "#1144361c"}`, background: t >= sources ? "#eee4ce" : "#f6efe1" }}>
        <div style={{ color: C.green, fontWeight: 600, fontSize: 22 }}>Nguồn tư liệu ↗</div>
        <div style={{ color: "#637164", fontSize: 17, lineHeight: 1.5, marginTop: 9 }}>Xem xuất xứ thông tin<br />và nội dung liên quan</div>
      </div>
    </div>
    <Finger t={t} at={learn} x={294} y={682} />
    <Finger t={t} at={sources} x={731} y={595} />
  </>;
};

// Real app MapCanvas captures; overlays use MapLibre.project on actual OSRM geometry and a metre-true 3 km ring.
const CityMap: React.FC<{ t: number; radius?: number; pins?: number; route?: number; id: string }> = ({ radius = 0, pins = 0, route = 0, id }) => {
  const atlas = id.startsWith("atlas");
  const projection = noticeProjection;
  const overview = Math.min(1, radius * 3);
  const points = projection.points;
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const ring = atlasCalibration.ring.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ") + "Z";
  const center = atlas ? atlasCalibration.center : points[0];
  const destinations = atlas ? atlasCalibration.pins : [points[points.length - 1]];
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#ebe7dc" }}>
    <Img src={staticFile(`guide120/${atlas ? "atlas-map" : "notice-map"}-base.png`)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
    {atlas && <Img src={staticFile("guide120/atlas-overview-base.png")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: overview }} />}
    <svg viewBox="0 0 1400 900" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
      {atlas && radius > 0 && <g transform={`translate(${center[0]} ${center[1]}) scale(${radius}) translate(${-center[0]} ${-center[1]})`}>
        <path d={ring} fill={C.green} fillOpacity="0.08" stroke={C.green} strokeWidth="5" strokeDasharray="12 11" />
      </g>}
      {!atlas && route > 0 && <>
        <path d={path} pathLength="1" stroke="#fffaf0" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, route)} />
        <path d={path} pathLength="1" stroke="#2874d5" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, route)} />
      </>}
      {(!atlas || radius > 0) && <g opacity={atlas ? overview : 1}><circle cx={center[0]} cy={center[1]} r="21" fill="#2874d5" fillOpacity="0.15" /><circle cx={center[0]} cy={center[1]} r="10" fill="#2874d5" stroke="#fffaf0" strokeWidth="4" /></g>}
      {destinations.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) scale(${Math.max(0, Math.min(1, pins * 1.8 - i * 0.26))})`} opacity={atlas ? overview : 1}>
        <ellipse cx="0" cy="5" rx="19" ry="7" fill="#092e2330" /><path d="M0 0C-36-32-23-62 0-62S36-32 0 0Z" fill={i === 0 ? C.terra : C.green} stroke="#fffaf0" strokeWidth="3" /><circle cy="-37" r="10" fill={C.paper} />
      </g>)}
    </svg>
    <div style={{ position: "absolute", right: 6, bottom: 5, padding: "3px 6px", fontSize: 11, color: "#34433c", background: "#fffaf0df", borderRadius: 4 }}>© OpenFreeMap · © OpenStreetMap</div>
  </div>;
};

const Atlas: React.FC<{ t: number; cues: Record<string, number> }> = ({ t, cues }) => {
  const locate = cues.locate ?? 3;
  const radiusAt = cues.radius ?? 4;
  const pinsAt = cues.pins ?? 6;
  const radius = reveal(t, radiusAt, 1.4);
  const pins = reveal(t, pinsAt, 0.7);
  return <>
    <div style={{ position: "absolute", left: 0, top: 115, width: 912, height: 587, borderRadius: 26, overflow: "hidden", border: "1px solid #11443622", boxShadow: shadow, background: "#fffaf0" }}>
      <div style={{ height: 50, display: "flex", alignItems: "center", padding: "0 20px", gap: 9, background: "#e9e2d3" }}>
        {["#b77761", "#bfa369", "#7d9a74"].map((color) => <div key={color} style={{ width: 11, height: 11, borderRadius: "50%", background: color }} />)}
        <div style={{ height: 29, flex: 1, marginLeft: 12, borderRadius: 10, background: "#fffaf0", display: "flex", alignItems: "center", paddingLeft: 18, fontSize: 16, color: "#637164" }}>⌕ &nbsp; {DOMAIN}/vi/map</div>
      </div>
      <div style={{ position: "absolute", top: 50, left: 0, right: 0, bottom: 0 }}><CityMap t={t} radius={radius} pins={pins} id="atlas-web" /></div>
      <div style={{ position: "absolute", left: 22, top: 71, padding: "14px 20px", background: "#fffaf0ed", borderRadius: 15, boxShadow: "0 5px 20px #092e2312" }}><div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600 }}>Atlas Sài Gòn</div><div style={{ fontSize: 14, color: "#6c796a", marginTop: 5 }}>Khám phá không gian di sản</div></div>
      <div style={{ position: "absolute", left: 23, bottom: 22, background: "#fffaf0f5", borderRadius: 18, padding: "15px 20px", width: 340, boxShadow: "0 4px 20px #092e2310", opacity: reveal(t, locate - 0.2) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 19, fontWeight: 600 }}><span>Quanh vị trí của bạn</span><span style={{ color: C.terra }}>{Math.round(radius * 3)} km</span></div>
        <div style={{ marginTop: 16, height: 5, background: "#d9decc", borderRadius: 5 }}><div style={{ width: `${Math.max(7, radius * 100)}%`, height: 5, background: C.green, borderRadius: 5, position: "relative" }}><div style={{ position: "absolute", right: -6, top: -5, borderRadius: "50%", width: 15, height: 15, background: C.green, boxShadow: "0 0 0 3px #fffaf0" }} /></div></div>
      </div>
      <div style={{ position: "absolute", right: 18, top: 74, width: 48, height: 45, borderRadius: 13, display: "grid", placeItems: "center", fontSize: 19, fontWeight: 600, background: C.green, color: C.paper }}>3D</div>
    </div>
    <Phone x={659} y={25} width={296} height={704}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}><CityMap t={t} radius={radius} pins={pins} id="atlas-phone" /></div>
      <div style={{ position: "absolute", top: 54, left: 13, right: 13, padding: "13px 15px", borderRadius: 15, background: "#fffaf0f2", fontFamily: serif, fontSize: 24, fontWeight: 600 }}>Atlas</div>
      <div style={{ position: "absolute", right: 13, top: 420, borderRadius: 15, width: 51, height: 51, background: t >= locate ? C.green : "#fffaf0", color: t >= locate ? C.paper : C.green, display: "grid", placeItems: "center", boxShadow: "0 5px 18px #092e2320" }}><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="8" stroke="currentColor" strokeWidth="2" /><circle cx="14" cy="14" r="3" fill="currentColor" /><path d="M14 1V5M14 23V27M1 14H5M23 14H27" stroke="currentColor" strokeWidth="2" /></svg></div>
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 24, padding: "19px 17px", borderRadius: 19, background: "#fffaf0f2", boxShadow: "0 7px 20px #092e2317", opacity: reveal(t, pinsAt) }}>
        <div style={{ color: C.terra, fontSize: 15, fontWeight: 600 }}>QUANH BẠN · 3 KM</div><div style={{ fontFamily: serif, fontSize: 24, marginTop: 11, lineHeight: 1.25 }}>Di sản đang chờ<br />bạn khám phá</div>
      </div>
    </Phone>
    <Finger t={t} at={locate} x={903} y={479} />
    <Label style={{ position: "absolute", left: 17, top: 736, background: "transparent", color: "#627163", fontSize: 17 }}>Một không gian khám phá trên web và điện thoại</Label>
  </>;
};

const Notice: React.FC<{ t: number; cues: Record<string, number> }> = ({ t, cues }) => {
  const open = cues.open ?? 3;
  const route = cues.route ?? 4;
  const detail = t >= open + 0.12;
  const drawn = reveal(t, route, 0.9);
  const enter = reveal(t, 0.25, 0.5);
  return <>
    <div style={{ position: "absolute", left: 15, top: 127, width: 929, height: 575, borderRadius: 32, overflow: "hidden", boxShadow: "0 15px 45px #092e2315", opacity: 0.65 }}><CityMap t={5} radius={1} pins={1} route={drawn} id="notice-back" /></div>
    <Phone x={257} width={431} height={788} dark={!detail}>
      {detail ? <>
        <div style={{ position: "absolute", inset: 0, bottom: 220 }}><CityMap t={5} pins={1} route={drawn} id="notice-phone" /></div>
        <div style={{ position: "absolute", top: 58, left: 15, padding: "10px 15px", borderRadius: 13, background: "#fffaf0ec", fontSize: 20, fontWeight: 600 }}>‹ &nbsp; Khám phá</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "25px 25px 50px", borderRadius: "28px 28px 0 0", background: "#fffaf0", boxShadow: "0 -5px 25px #092e2310" }}>
          <div style={{ fontSize: 15, color: C.terra, letterSpacing: 1.1, fontWeight: 600 }}>DI SẢN GẦN BẠN</div><div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1.23, marginTop: 11 }}>Nhà thờ Đức Bà</div><div style={{ marginTop: 10, color: "#647164", fontSize: 18 }}>Khám phá câu chuyện Sài Gòn.</div>
          <div style={{ marginTop: 23, padding: "17px 15px", borderRadius: 15, textAlign: "center", background: C.green, color: C.paper, fontSize: 22, fontWeight: 600 }}>{t >= route ? "Đường đi đến di sản ↗" : "Hiện đường ↗"}</div>
        </div>
      </> : <>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 0% 0%, #4f7d64, transparent 72%), linear-gradient(145deg, #1d5942 0%, #1d5942 43%, #103e2e 43.3%, #092e23 100%)" }} />
        <div style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center", color: C.paper }}><div style={{ fontSize: 24, opacity: 0.8 }}>Chào một ngày khám phá</div><div style={{ fontSize: 100, letterSpacing: -4, fontWeight: 500, marginTop: 7 }}>9:41</div></div>
        <div style={{ position: "absolute", left: 17, right: 17, top: 304, padding: "22px 22px 26px", borderRadius: 24, background: "#f6efe1f2", opacity: enter, transform: `translateY(${-48 * (1 - enter)}px)`, boxShadow: "0 10px 30px #00000015" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, fontWeight: 600, fontSize: 18, letterSpacing: 1.2 }}><Img src={img("logo.png")} style={{ width: 33, height: 33, objectFit: "contain" }} />THÁM VĂN<span style={{ marginLeft: "auto", color: "#718074", fontSize: 14, fontWeight: 400, letterSpacing: 0 }}>bây giờ</span></div>
          <div style={{ marginTop: 18, fontFamily: serif, fontSize: 28, lineHeight: 1.25, fontWeight: 600 }}>Nhà thờ Đức Bà</div><div style={{ marginTop: 11, fontSize: 21, lineHeight: 1.5 }}>Khám phá câu chuyện<br />gần bạn.</div><div style={{ marginTop: 15, fontSize: 18, color: C.terra, fontWeight: 600 }}>Chạm để xem địa điểm ↗</div>
        </div>
        <svg width="28" height="33" viewBox="0 0 35 40" style={{ position: "absolute", bottom: 88, left: 193, opacity: 0.65 }}><rect x="6" y="17" width="23" height="20" rx="5" fill="none" stroke={C.paper} strokeWidth="3" /><path d="M11 17V11C11 1 25 1 25 11V17" fill="none" stroke={C.paper} strokeWidth="3" /></svg>
      </>}
    </Phone>
    <Finger t={t} at={open} x={472} y={479} />
    <Finger t={t} at={route} x={472} y={687} />
    <Label style={{ position: "absolute", top: 800, left: 166, background: "transparent", fontSize: 16, padding: 0, color: "#687366" }}>Khi đã cho phép vị trí và thông báo</Label>
  </>;
};

export const GuideCapture: React.FC<{ scene: string; progress: number; cues?: Record<string, number> }> = ({ scene, progress, cues = {} }) => <div style={{ position: "absolute", width: 980, height: 820, color: C.green, fontFamily: sans }}>
  {scene === "camera" ? <Camera t={progress} cues={cues} /> : scene === "result" ? <Result t={progress} cues={cues} /> : scene === "atlas" ? <Atlas t={progress} cues={cues} /> : scene === "notice" ? <Notice t={progress} cues={cues} /> : null}
</div>;
