import React from "react";
import { AbsoluteFill, Easing, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import voDurations from "../public/vo/durations.json";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Shot, XFADE, ringOf, shotsDuration } from "./components/Shots";
import { FeatureProps, FeatureScene } from "./scenes/FeatureScene";
import { Hook, Intro, Languages, Outro } from "./scenes/TitleScenes";

// ---- Dữ liệu từng cảnh: ảnh, đường dẫn, chuyển động camera, vùng nổi bật ----
const home: Shot[] = [
  { src: "home.png", url: "/vi", dur: 120, from: [0.5, 0.5, 1], to: [0.22, 0.3, 1.35], ring: [0.12, 0.18, 0.27, 0.27] },
  { src: "home-2.png", url: "/vi", dur: 120, from: [0.32, 0.75, 1], to: [0.3, 0.76, 1.5], ring: [0.12, 0.68, 0.4, 0.16] },
];
const explore: Shot[] = [
  { src: "explore.png", url: "/vi/explore", dur: 105, from: [0.5, 0.4, 1], to: [0.3, 0.48, 1.4], ring: [0.12, 0.4, 0.75, 0.16] },
  { src: "explore-search.png", url: "/vi/explore?q=chùa", dur: 110, from: [0.5, 0.5, 1.05], to: [0.22, 0.48, 1.35], ring: [0.13, 0.27, 0.25, 0.47] },
  { src: "place.png", url: "/vi/explore/hcm-0001", dur: 110, from: [0.5, 0.45, 1], to: [0.3, 0.6, 1.3], ring: [0.14, 0.48, 0.32, 0.22] },
  { src: "place-2.png", url: "/vi/explore/hcm-0001", dur: 120, from: [0.5, 0.4, 1], to: [0.78, 0.3, 1.55], ring: [0.69, 0.12, 0.19, 0.36] },
];
const map: Shot[] = [{ src: "map.png", url: "/vi/map", dur: 150, from: [0.5, 0.5, 1], to: [0.62, 0.5, 1.55], ring: [0.45, 0.3, 0.38, 0.45] }];
const mMap: Shot[] = [{ src: "m-map.png", url: "/vi/map", dur: 150, from: [0.5, 0.35, 1], to: [0.5, 0.42, 1.3] }];
const camera: Shot[] = [
  { src: "m-home.png", url: "/vi", dur: 100, from: [0.5, 0.6, 1], to: [0.5, 0.92, 1.6], ring: [0.36, 0.88, 0.28, 0.11] },
  { src: "m-camera.png", url: "/vi/camera", dur: 130, from: [0.5, 0.3, 1], to: [0.5, 0.45, 1.15], ring: [0.06, 0.41, 0.88, 0.46] },
];
const experiences: Shot[] = [
  { src: "experiences.png", url: "/vi/experiences", dur: 105, from: [0.5, 0.4, 1], to: [0.3, 0.68, 1.3], ring: [0.13, 0.43, 0.25, 0.53] },
  { src: "experience.png", url: "/vi/experiences/sai-gon-ben-song", dur: 100, from: [0.5, 0.35, 1.08], to: [0.5, 0.55, 1.22] },
  { src: "experience-2.png", url: "/vi/experiences/sai-gon-ben-song", dur: 120, from: [0.45, 0.4, 1], to: [0.76, 0.35, 1.5], ring: [0.65, 0.1, 0.23, 0.55] },
];
const challenges: Shot[] = [{ src: "challenges.png", url: "/vi/challenges", dur: 140, from: [0.5, 0.5, 1], to: [0.7, 0.47, 1.5], ring: [0.55, 0.35, 0.31, 0.24] }];
const journey: Shot[] = [{ src: "m-journey.png", url: "/vi/journey", dur: 150, from: [0.5, 0.4, 1], to: [0.5, 0.62, 1.2], ring: [0.08, 0.55, 0.84, 0.19] }];
const profile: Shot[] = [{ src: "m-profile.png", url: "/vi/profile", dur: 150, from: [0.5, 0.4, 1], to: [0.5, 0.48, 1.15], ring: [0.03, 0.41, 0.95, 0.11] }];
const dashboard: Shot[] = [{ src: "dashboard.png", url: "/vi/dashboard", dur: 140, from: [0.5, 0.5, 1], to: [0.28, 0.45, 1.3], ring: [0.01, 0.12, 0.13, 0.66] }];
const partners: Shot[] = [
  { src: "partners.png", url: "/vi/partners", dur: 110, from: [0.4, 0.4, 1], to: [0.7, 0.65, 1.3], ring: [0.51, 0.45, 0.37, 0.55] },
  { src: "partners-2.png", url: "/vi/partners", dur: 110, from: [0.6, 0.4, 1.05], to: [0.69, 0.5, 1.3], ring: [0.51, 0.06, 0.36, 0.7] },
];

type VoKey = Exclude<keyof typeof voDurations, "_voice">;
type Scene =
  | { kind: "title"; name: string; vo: VoKey; dur: number; C: React.FC }
  | { kind: "feature"; name: string; vo: VoKey; props: FeatureProps };

const scenes: Scene[] = [
  { kind: "title", name: "Intro", vo: "intro", dur: 105, C: Intro },
  { kind: "title", name: "Hook", vo: "hook", dur: 105, C: Hook },
  {
    kind: "feature",
    name: "Trang chủ", vo: "home",
    props: {
      index: "01", route: "/vi", device: "browser", shots: home,
      title: "Trang chủ",
      body: "Bản đồ không gian Sài Gòn và sổ tay chọn lộ trình nhanh ngay màn hình đầu.",
      steps: ["Chọn thời gian và gu khám phá", "Bấm “Gợi ý cho tôi”", "Hoặc “Chụp để khám phá”"],
    },
  },
  {
    kind: "feature",
    name: "Khám phá", vo: "explore",
    props: {
      index: "02", route: "/vi/explore", device: "browser", shots: explore,
      title: "Khám phá 1.426 điểm di sản",
      body: "Tìm theo tên, lọc theo loại hình và khu vực, mở phiếu tư liệu từng nơi.",
      steps: ["Gõ “chùa” vào ô tìm kiếm", "Chạm một thẻ để xem chi tiết", "Bấm “Chỉ đường” hoặc mở bản đồ"],
    },
  },
  {
    kind: "feature",
    name: "Bản đồ", vo: "map",
    props: {
      index: "03", route: "/vi/map", device: "browser+phone", shots: map, shots2: mMap,
      title: "Bản đồ & chỉ đường",
      body: "Xem các điểm quanh vị trí của bạn và vẽ tuyến đường thật tới nơi muốn đến.",
    },
  },
  {
    kind: "feature",
    name: "Camera", vo: "camera",
    props: {
      index: "04", route: "/vi/camera", device: "phone", shots: camera,
      title: "Thám Văn Lens",
      body: "Hướng camera vào công trình, AI nhận diện và kể câu chuyện phía sau.",
      steps: ["Chạm nút Camera giữa thanh dưới", "Cấp quyền một lần", "Chụp và đọc kết quả"],
    },
  },
  {
    kind: "feature",
    name: "Hành trình trải nghiệm", vo: "experiences",
    props: {
      index: "05", route: "/vi/experiences", device: "browser", shots: experiences,
      title: "Hành trình kể chuyện",
      body: "Các tuyến đi bộ có lộ trình, điểm dừng và câu chuyện cho từng bước chân.",
      steps: ["Chọn một hành trình", "Xem lộ trình và điểm dừng", "Mở khóa bằng gói thành viên"],
    },
  },
  {
    kind: "feature",
    name: "Thử thách", vo: "challenges",
    props: {
      index: "06", route: "/vi/challenges", device: "browser", shots: challenges,
      title: "Thử thách & huy hiệu",
      body: "Trả lời câu đố, check-in tại di sản, tích XP và lên cấp.",
    },
  },
  {
    kind: "feature",
    name: "Hành trình cá nhân", vo: "journey",
    props: {
      index: "07", route: "/vi/journey · /vi/profile", device: "phones", shots: journey, shots2: profile,
      title: "Hộ chiếu thực địa",
      body: "Lưu nơi muốn đi, đóng dấu mỗi lần bước ra ngoài và theo dõi tiến độ khám phá.",
    },
  },
  {
    kind: "feature",
    name: "Bảng điều khiển", vo: "dashboard",
    props: {
      index: "08", route: "/vi/dashboard", device: "browser", shots: dashboard,
      title: "Không gian của bạn",
      body: "Đã lưu, timeline chuyến đi, lập lịch trình, gia đình và thông báo ở một nơi.",
    },
  },
  {
    kind: "feature",
    name: "Cho doanh nghiệp", vo: "partners",
    props: {
      index: "09", route: "/vi/partners", device: "browser", shots: partners,
      title: "Cho doanh nghiệp & trường học",
      body: "Bảo tàng, điểm du lịch, trường học cùng thiết kế hành trình riêng.",
      steps: ["Điền đề bài hợp tác", "Gửi yêu cầu", "THÁM VĂN phản hồi đề xuất"],
    },
  },
  { kind: "title", name: "Ngôn ngữ", vo: "languages", dur: 130, C: Languages },
  { kind: "title", name: "Outro", vo: "outro", dur: 120, C: Outro },
];

// ---- Khớp hình với lời đọc ----
const FPS = 30;
const T = 18; // độ dài chuyển cảnh
const VO_START = 16; // lời đọc bắt đầu khi chuyển cảnh gần xong
const VO_TAIL = 22; // khoảng lặng sau lời đọc trước cảnh kế

const voFrames = (key: VoKey) => Math.ceil(voDurations[key] * FPS);
const neededDur = (s: Scene) => VO_START + voFrames(s.vo) + VO_TAIL;

// Kéo dài các ảnh (theo tỉ lệ) để cảnh đủ dài cho lời đọc.
const fit = (shots: readonly Shot[], target: number): Shot[] => {
  const extra = target - shotsDuration(shots);
  if (extra <= 0) return [...shots];
  const sum = shots.reduce((a, s) => a + s.dur, 0);
  const out = shots.map((s) => ({ ...s, dur: s.dur + Math.floor((extra * s.dur) / sum) }));
  out[out.length - 1].dur += target - shotsDuration(out);
  return out;
};

const fitted: Scene[] = scenes.map((s) => {
  if (s.kind === "title") return { ...s, dur: Math.max(s.dur, neededDur(s)) };
  const visual = Math.max(shotsDuration(s.props.shots), s.props.shots2 ? shotsDuration(s.props.shots2) : 0);
  const target = Math.max(visual, neededDur(s));
  return {
    ...s,
    props: { ...s.props, shots: fit(s.props.shots, target), shots2: s.props.shots2 ? fit(s.props.shots2, target) : undefined },
  };
});

const sceneDur = (s: Scene) =>
  s.kind === "title"
    ? s.dur
    : Math.max(shotsDuration(s.props.shots), s.props.shots2 ? shotsDuration(s.props.shots2) : 0);

// Khung hình bắt đầu của mỗi cảnh trên timeline tổng (đã trừ phần chồng chuyển cảnh).
const starts = fitted.map((_, i) => fitted.slice(0, i).reduce((a, s) => a + sceneDur(s), 0) - T * i);
const timing = linearTiming({ durationInFrames: T, easing: Easing.bezier(0.65, 0, 0.35, 1) });
// Kiểu presentation khác nhau theo từng hiệu ứng; TransitionSeries chấp nhận tất cả lúc chạy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentations: any[] = [
  slide({ direction: "from-right" }),
  fade(),
  wipe({ direction: "from-right" }),
  slide({ direction: "from-bottom" }),
];

export const TOTAL = fitted.reduce((sum, s) => sum + sceneDur(s), 0) - T * (fitted.length - 1);

// ---- Âm thanh ----
// Khoảng thời gian có lời đọc, để hạ nhạc nền (ducking).
const voWindows = fitted.map((s, i) => [starts[i] + VO_START, starts[i] + VO_START + voFrames(s.vo)] as const);

const musicVolume = (f: number) => {
  const base = 0.42;
  const duck = 0.14;
  // Nhạc giảm mượt trong 8 khung hình trước/sau mỗi đoạn lời đọc.
  const near = Math.min(...voWindows.map(([a, b]) => (f < a ? a - f : f > b ? f - b : 0)));
  const v = duck + (base - duck) * Math.min(1, near / 8);
  const fadeIn = Math.min(1, f / 20);
  const fadeOut = Math.min(1, (TOTAL - f) / 45);
  return v * fadeIn * fadeOut;
};

// Click khi khung nổi bật xuất hiện (ShotView: ring hiện ở 18% thời lượng ảnh).
const ringClicks = fitted.flatMap((s, i) => {
  if (s.kind !== "feature") return [];
  let off = 0;
  return s.props.shots.flatMap((shot) => {
    const at = starts[i] + off + Math.round(shot.dur * 0.18);
    off += shot.dur - XFADE;
    return ringOf(shot) ? [at] : [];
  });
});

const cameraIndex = fitted.findIndex((s) => s.vo === "camera");
const cameraShutter =
  cameraIndex >= 0 && fitted[cameraIndex].kind === "feature"
    ? starts[cameraIndex] + fitted[cameraIndex].props.shots[0].dur - XFADE
    : null;

const SoundLayer: React.FC = () => (
  <>
    <Audio name="Nhạc nền" src={staticFile("music.wav")} volume={musicVolume} />
    {fitted.map((s, i) => (
      <Sequence key={`vo-${s.vo}`} name={`Lời đọc: ${s.name}`} from={starts[i] + VO_START} durationInFrames={voFrames(s.vo) + 4}>
        <Audio src={staticFile(`vo/${s.vo}.wav`)} volume={1} />
      </Sequence>
    ))}
    {starts.slice(1).map((at, i) => (
      <Sequence key={`wh-${i}`} name="Whoosh" from={Math.max(0, at - 6)} durationInFrames={30}>
        <Audio src="https://remotion.media/whoosh.wav" volume={0.22} />
      </Sequence>
    ))}
    {ringClicks.map((at, i) => (
      <Sequence key={`ck-${i}`} name="Click" from={at} durationInFrames={15}>
        <Audio src="https://remotion.media/mouse-click.wav" volume={0.3} />
      </Sequence>
    ))}
    {cameraShutter !== null ? (
      <Sequence name="Màn trập" from={cameraShutter} durationInFrames={30}>
        <Audio src="https://remotion.media/shutter-modern.wav" volume={0.35} />
      </Sequence>
    ) : null}
  </>
);

export const ThamVanVideo: React.FC = () => (
  <AbsoluteFill style={{ background: "#f6efe1" }}>
    <SoundLayer />
    <TransitionSeries>
      {fitted.flatMap((s, i) => [
        ...(i > 0
          ? [<TransitionSeries.Transition key={`t${i}`} presentation={presentations[i % presentations.length]} timing={timing} />]
          : []),
        <TransitionSeries.Sequence key={s.name} name={s.name} durationInFrames={sceneDur(s)}>
          {s.kind === "title" ? <s.C /> : <FeatureScene {...s.props} />}
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
  </AbsoluteFill>
);
