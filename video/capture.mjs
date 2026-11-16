// Chụp ảnh 2x từng giao diện cho video Remotion (dev server ở chế độ demo).
// Dùng: node video/capture.mjs [base_url]  -> video/remotion/public/shots/*.png
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3100';
const OUT = path.resolve(process.env.OUT || 'video/remotion/public/shots');
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1600, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function settle(page, extra = 1500) {
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  // Ảnh lazy-load chỉ tải khi vào khung nhìn: cuộn hết trang rồi quay lại.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(extra);
}

// Vị trí thật của vùng cần làm nổi bật (tỉ lệ khung nhìn) cho từng ảnh -> rects.json.
const rects = {};
// focus: danh sách [locator, closestSelector?]; lấy hộp bao của tất cả.
async function measure(page, focus) {
  const vp = page.viewportSize();
  const boxes = [];
  for (const [loc, closest] of focus) {
    const r = await loc
      .first()
      .evaluate((el, sel) => {
        const t = (sel && el.closest(sel)) || el;
        const b = t.getBoundingClientRect();
        return { x: b.left, y: b.top, r: b.right, b: b.bottom };
      }, closest || null)
      .catch(() => null);
    if (r) boxes.push(r);
  }
  if (!boxes.length) return null;
  const pad = 10;
  const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad);
  const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad);
  const r = Math.min(vp.width, Math.max(...boxes.map((b) => b.r)) + pad);
  const b = Math.min(vp.height, Math.max(...boxes.map((b) => b.b)) + pad);
  const f = (v) => Math.round(v * 1000) / 1000;
  return [f(x / vp.width), f(y / vp.height), f((r - x) / vp.width), f((b - y) / vp.height)];
}

// Ẩn nút Next.js dev indicator khỏi ảnh.
const shot = async (page, name, focus) => {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  if (focus) {
    const r = await measure(page, focus);
    if (r) rects[name] = r;
    console.log(`  ${name}: ${r ? r.join(', ') : 'KHÔNG TÌM THẤY vùng'}`);
  }
};
const CARD = 'article, li, a';
const scrollTo = (page, y) => page.evaluate((y) => window.scrollTo(0, y), y).then(() => page.waitForTimeout(800));

const desktop = [
  ['home', async (p) => {
    await p.goto(`${BASE}/vi`); await settle(p); await shot(p, 'home', [[p.locator('h1')]]);
    await scrollTo(p, 900); await shot(p, 'home-2', [[p.getByText('Chụp để khám phá', { exact: true }), 'a, article, section']]);
  }],
  ['explore', async (p) => {
    await p.goto(`${BASE}/vi/explore`); await settle(p);
    const s = p.locator('input[type="search"], input[placeholder]').first();
    await shot(p, 'explore', [[s], [p.getByText('Lễ hội', { exact: false })], [p.getByText('Tất cả', { exact: true })]]);
    await s.fill('chùa'); await p.waitForTimeout(2500); await scrollTo(p, 330);
    await shot(p, 'explore-search', [[p.locator('a[href*="/vi/explore/hcm"]'), 'article, li']]);
  }],
  ['place', async (p) => {
    await p.goto(`${BASE}/vi/explore`); await settle(p, 500);
    const href = await p.locator('a[href*="/vi/explore/"]').first().getAttribute('href');
    console.log('place:', href);
    await p.goto(new URL(href, BASE).href); await settle(p);
    await shot(p, 'place', [[p.locator('h1')]]);
    await scrollTo(p, 800);
    await shot(p, 'place-2', [[p.getByText('Thực địa & Di chuyển').first(), 'aside, section, div[class]']]);
  }],
  ['map', async (p) => { await p.goto(`${BASE}/vi/map`); await settle(p, 8000); await shot(p, 'map', [[p.locator('.maplibregl-map, canvas')]]); }],
  ['experiences', async (p) => {
    await p.goto(`${BASE}/vi/experiences`); await settle(p);
    await shot(p, 'experiences', [[p.locator('a[href*="/vi/experiences/"]'), 'article, li']]);
    await p.goto(`${BASE}/vi/experiences/sai-gon-ben-song`); await settle(p); await shot(p, 'experience');
    await scrollTo(p, 800); await shot(p, 'experience-2', [[p.getByText('/ tháng').first(), 'aside, article, section']]);
  }],
  ['challenges', async (p) => {
    await p.goto(`${BASE}/vi/challenges`); await settle(p);
    await shot(p, 'challenges', [[p.getByText('thử thách đang chờ bạn').first(), 'section, article']]);
  }],
  ['dashboard', async (p) => { await p.goto(`${BASE}/vi/dashboard`); await settle(p); await shot(p, 'dashboard', [[p.locator('aside, nav[class*="side"]')]]); }],
  ['partners', async (p) => {
    await p.goto(`${BASE}/vi/partners`); await settle(p); await shot(p, 'partners', [[p.locator('form')]]);
    await scrollTo(p, 900); await shot(p, 'partners-2', [[p.locator('form')]]);
  }],
  ['lang', async (p) => { for (const l of ['en', 'zh']) { await p.goto(`${BASE}/${l}`); await settle(p); await shot(p, `home-${l}`); } }],
];

const mobile = [
  ['m-home', async (p) => { await p.goto(`${BASE}/vi`); await settle(p); await shot(p, 'm-home', [[p.locator('.bottom-nav a[href$="/camera"]')]]); }],
  ['m-camera', async (p) => {
    await p.goto(`${BASE}/vi/camera`); await settle(p, 5000);
    await shot(p, 'm-camera', [[p.getByText('Lấy vị trí của thiết bị')], [p.getByText('Quyền camera', { exact: true })]]);
  }],
  ['m-map', async (p) => { await p.goto(`${BASE}/vi/map`); await settle(p, 8000); await shot(p, 'm-map'); }],
  ['m-journey', async (p) => {
    await p.goto(`${BASE}/vi/journey`); await settle(p);
    await shot(p, 'm-journey', [[p.getByText('Bạch Đằng', { exact: true }).first(), 'button, a, li, div[class]'], [p.getByText('Chợ Lớn', { exact: true }).first(), 'button, a, li, div[class]']]);
  }],
  ['m-profile', async (p) => {
    await p.goto(`${BASE}/vi/profile`); await settle(p);
    await shot(p, 'm-profile', [[p.getByText('Đã lưu hành trình').first(), 'div[class], li'], [p.getByText('XP của bạn').first(), 'div[class], li']]);
  }],
];

const browser = await chromium.launch({
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const only = process.env.SHOTS?.split(',');
for (const [list, viewport, isMobile] of [[desktop, DESKTOP, false], [mobile, MOBILE, true]]) {
  for (const [name, run] of list) {
    if (only && !only.includes(name)) continue;
    const ctx = await browser.newContext({
      viewport, deviceScaleFactor: isMobile ? 3 : 2, isMobile, hasTouch: isMobile, locale: 'vi-VN',
      permissions: ['camera', 'geolocation'], geolocation: { latitude: 10.7769, longitude: 106.7009 },
    });
    const page = await ctx.newPage();
    try { await run(page); console.log('ok', name); } catch (e) { console.error('FAIL', name, e.message); }
    await ctx.close();
  }
}
await browser.close();
if (!only) writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(rects, null, 2));
