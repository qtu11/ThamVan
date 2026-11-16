import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const root = path.dirname(fileURLToPath(import.meta.url));
const review = path.join(root, "out/silent58-v5-review");
await mkdir(review, { recursive: true });
const browserExecutable = path.join(root, "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), outDir: path.join(root, "out/silent58-bundle"), publicDir: path.join(root, "public"), rspack: true });
const composition = await selectComposition({ serveUrl, id: "ThamVanKhongLoi58s", browserExecutable });
assert.equal(composition.durationInFrames, 1740);
assert.equal(composition.fps, 30);
assert.equal(composition.width, 1920);
assert.equal(composition.height, 1080);

if (process.argv.includes("--review")) {
  for (const [index, frame] of [90, 285, 465, 600, 720, 855, 990, 1125, 1260, 1440, 1650].entries()) {
    await renderStill({ serveUrl, composition, browserExecutable, frame, output: path.join(review, `${String(index + 1).padStart(2, "0")}.png`), imageFormat: "png" });
    console.log(`Reviewed scene ${index + 1}/11`);
  }
  for (const [name, click] of Object.entries({ camera: 222, map: 603, level: 837, answer: 888, planner: 1095, save: 1239 })) {
    for (const offset of [-1, 10, 30]) {
      await renderStill({ serveUrl, composition, browserExecutable, frame: click + offset, output: path.join(review, `${name}-${offset < 0 ? "before" : `after-${offset}`}.png`), imageFormat: "png" });
    }
    console.log(`Reviewed click response: ${name}`);
  }
} else {
  let last = -1;
  await renderMedia({
    serveUrl, composition, browserExecutable,
    outputLocation: path.join(root, "../THAM_VAN_58S_TUONG_TAC.mp4"),
    codec: "h264", crf: 18, pixelFormat: "yuv420p", imageFormat: "jpeg", jpegQuality: 95,
    concurrency: 2, overwrite: true,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 100);
      if (percent >= last + 5) { console.log(`Render ${percent}%`); last = percent; }
    },
  });
  console.log("Exported THAM_VAN_58S_TUONG_TAC.mp4");
}
