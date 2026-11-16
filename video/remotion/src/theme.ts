import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadBeVietnam } from "@remotion/google-fonts/BeVietnamPro";

// Cùng font và màu với app (src/app/globals.css).
export const serif = loadLora("normal", {
  weights: ["500", "600"],
  subsets: ["latin", "vietnamese"],
}).fontFamily;
export const serifItalic = loadLora("italic", {
  weights: ["500"],
  subsets: ["latin", "vietnamese"],
}).fontFamily;
export const sans = loadBeVietnam("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin", "vietnamese"],
}).fontFamily;

export const C = {
  green: "#114436",
  greenDark: "#092e23",
  ink: "#042e23",
  paper: "#f6efe1",
  cream: "#ece4d2",
  terra: "#963a1b",
  brass: "#5f4112",
};

export const FPS = 30;

export const DOMAIN = "tham-van.vercel.app";
