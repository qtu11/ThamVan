import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

// Build an original static render of our own scene for no-WebGL/reduced-motion
// clients. Run against the local app after changing its geometry or materials.
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    reducedMotion: 'no-preference',
  });
  await page.goto('http://localhost:3000/vi', { waitUntil: 'networkidle' });
  await page.locator('[data-scene-status="ready"]').waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('.city-canvas')).opacity === '1',
  );
  await mkdir('asset/city', { recursive: true });
  for (const view of [0, 1, 2]) {
    await page
      .getByRole('navigation', { name: 'Chọn góc nhìn thành phố' })
      .getByRole('link', { name: ['Bạch Đằng', 'Cầu Ba Son', 'Landmark 81'][view], exact: true })
      .click();
    await page.waitForFunction(
      (index) =>
        Math.abs(
          Number(document.querySelector('.city-canvas')?.dataset.cameraProgress) - index * 0.5,
        ) < 0.02,
      view,
    );
    for (const time of ['dusk', 'day']) {
      await page
        .getByRole('button', { name: time === 'day' ? 'Ban ngày' : 'Chạng vạng', exact: true })
        .click();
      await page.waitForFunction(
        (value) => document.querySelector('.city-canvas')?.dataset.lighting === value,
        time,
      );
      const prefix = ['hcm-city', 'hcm-ba-son', 'hcm-landmark81'][view];
      const name = `${prefix}${time === 'day' ? '-day' : view === 0 ? '-poster' : ''}`;
      const source = `asset/city/${name}.png`;
      await page.locator('.city-canvas canvas').screenshot({
        path: source,
        animations: 'disabled',
        // Element screenshots clip the composited page, including siblings above
        // the canvas. Exclude every overlay and the previous fallback explicitly.
        style:
          '.city-visual-top, .city-visual-bottom, .city-model-note, .city-render-mode, .city-poster, .city-callout, .city-time-switch { visibility: hidden !important; }',
      });
      await sharp(source).webp({ quality: 88 }).toFile(`public/images/${name}.webp`);
      console.log(`Created ${name} from the original Three.js model.`);
    }
  }
} finally {
  await browser.close();
}
