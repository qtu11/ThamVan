import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const root = path.dirname(fileURLToPath(import.meta.url));
const review = path.join(root, "out/guide120-review");
await mkdir(review, { recursive: true });
const timings = JSON.parse(await readFile(path.join(root, "public/vo-120/timings.json"), "utf8"));
assert.equal(timings.scenes.length, 18);
assert.equal(timings.fps, 30);
assert.equal(timings.voice, "VieNeu-TTS v3 Turbo · Mỹ Duyên");
assert.equal(timings.noTempoOrPitchChange, true);
let previousEnd = 0;
let voiceEnd = 0;
for (const scene of timings.scenes) {
  assert.equal(scene.sceneStart, previousEnd, `Scene continuity: ${scene.id}`);
  assert(scene.start >= scene.sceneStart && scene.end <= scene.sceneEnd + 0.001, `Narration must fit: ${scene.id}`);
  assert(scene.start >= voiceEnd, `Narrations overlap: ${scene.id}`);
  assert(scene.words.length > 0, `Missing captions: ${scene.id}`);
  assert(scene.words.every(w => w.end >= w.start && w.start >= 0 && w.end <= scene.sceneEnd - scene.sceneStart + 0.001), `Caption bounds: ${scene.id}`);
  await access(path.join(root, `public/vo-120/${scene.id}.wav`));
  previousEnd = scene.sceneEnd;
  voiceEnd = scene.end;
}
assert.equal(previousEnd, timings.total);
for (const filename of ["music-120", "click", "shutter", "whoosh", "notification", "chime"]) await access(path.join(root, `public/audio-120/${filename}.wav`));
for (const filename of ["artifact-real.jpg", "performance-real.jpg", "atlas-map-base.png", "journey-map-base.png", "notice-map-base.png"]) await access(path.join(root, `public/guide120/${filename}`));
for (const kind of ["journey", "notice"]) {
  const route = JSON.parse(await readFile(path.join(root, `public/guide120/${kind}-route-osrm.json`), "utf8"));
  const projection = JSON.parse(await readFile(path.join(root, `public/guide120/${kind}-map-projection.json`), "utf8"));
  assert.equal(route.code, "Ok");
  assert(route.routes[0].geometry.coordinates.length > 20, `Street geometry required: ${kind}`);
  assert.equal(projection.points.length, route.routes[0].geometry.coordinates.length, `Project every route vertex: ${kind}`);
  assert(projection.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), `Projection invalid: ${kind}`);
}
const browserExecutable = path.join(root, "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), outDir: path.join(root, "out/guide120-bundle"), publicDir: path.join(root, "public"), rspack: true });
const inputProps = { timings };
const composition = await selectComposition({ serveUrl, id: "ThamVanHuongDan120s", browserExecutable, inputProps });
assert.equal(composition.durationInFrames, timings.total * 30);
assert.equal(composition.width, 1920);
assert.equal(composition.height, 1080);
assert.equal(composition.fps, 30);

if (process.argv.includes("--review")) {
  const shots = timings.scenes.map(s => ({ name: s.id, seconds: s.sceneStart + (s.sceneEnd - s.sceneStart) * 0.75 }));
  shots.push({ name: "camera-before-shutter", seconds: 24.5 }, { name: "camera-after-shutter", seconds: 26 }, { name: "planner-conditions", seconds: 79.5 }, { name: "final-card", seconds: 119.3 });
  for (const shot of shots) {
    await renderStill({ serveUrl, composition, browserExecutable, inputProps, frame: Math.round(shot.seconds * 30), output: path.join(review, `${shot.name}.png`), imageFormat: "png" });
    console.log(`Reviewed ${shot.name} at ${shot.seconds.toFixed(2)}s`);
  }
} else {
  let last = -1;
  const outputLocation = path.join(root, "../THAM_VAN_GIOI_THIEU_2_PHUT.mp4");
  await renderMedia({
    serveUrl, composition, browserExecutable, inputProps, outputLocation,
    codec: "h264", crf: 18, pixelFormat: "yuv420p", imageFormat: "jpeg", jpegQuality: 95,
    concurrency: 4, overwrite: true,
    onProgress: ({ progress, renderedFrames, encodedFrames }) => {
      const percent = Math.floor(progress * 100);
      if (percent >= last + 5) { console.log(`Render ${percent}% (${renderedFrames} rendered, ${encodedFrames} encoded)`); last = percent; }
    },
  });
  await writeFile(path.join(review, "render-info.json"), JSON.stringify({ output: outputLocation, fps: 30, width: 1920, height: 1080, seconds: timings.total, voice: timings.voice, estimatedCaptionWords: timings.scenes.flatMap(s => s.words).filter(w => w.estimated).length }, null, 2));
  console.log(`Exported ${outputLocation}`);
}
