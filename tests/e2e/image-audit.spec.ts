import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

const index: { id: string; image: string | null; name: string }[] = JSON.parse(
  fs.readFileSync('public/images/thamvan-image-index.json', 'utf8'),
);
const photos = index.filter((row) => row.image);
const missing = index.filter((row) => !row.image);

test('photo library searches and paginates all 1505 places with real coverage', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto('/images/_thamvan_reports/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-gallery-ready', 'true');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mỗi nơi chốn');
  await expect(page.locator('.stats')).toContainText(String(index.length));
  await expect(page.locator('.stats')).toContainText(String(photos.length));
  await expect(page.locator('.gallery article')).toHaveCount(Math.min(24, photos.length));
  await expect(page.getByRole('status')).toContainText(photos.length.toLocaleString('vi-VN'));
  for (const photo of photos) {
    const response = await request.head(photo.image!);
    expect(response.ok(), photo.id).toBe(true);
    expect(response.headers()['content-type']).toMatch(/^image\//);
  }
  await page.getByLabel('Tình trạng ảnh').selectOption('all');
  await expect(page.getByRole('status')).toContainText(index.length.toLocaleString('vi-VN'));
  await page.getByLabel('Tên hoặc địa chỉ').fill('ba son');
  await expect(page.locator('.gallery')).toContainText('Cầu Ba Son');
  await page.getByLabel('Tên hoặc địa chỉ').fill('khong-tim-thay-thamvan-987654321');
  await expect(
    page.getByText('Không có địa điểm phù hợp. Hãy thử tên hoặc nhóm khác.'),
  ).toBeVisible();
  await page.getByLabel('Tên hoặc địa chỉ').fill('');
  await page.getByLabel('Tình trạng ảnh').selectOption('missing');
  await expect(page.getByRole('status')).toContainText(missing.length.toLocaleString('vi-VN'));
  await expect(page.locator('.gallery img')).toHaveCount(0);
  await page.getByLabel('Tình trạng ảnh').selectOption('photos');
  if (photos.length > 24) {
    const first = await page.locator('.gallery small').first().innerText();
    await page.getByRole('button', { name: 'Trang sau →' }).click();
    await expect(page.locator('.gallery small').first()).not.toHaveText(first);
    await page.getByRole('button', { name: '← Trang trước' }).click();
  }
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/place-image-audit.png', animations: 'disabled' });
  await page.getByRole('heading', { name: 'Ảnh đã bổ sung', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/place-images-clean.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/place-images-mobile.png', animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Tên hoặc địa chỉ').fill('Vintage');
  await expect(page.locator('.gallery img')).toHaveCount(1);
  await expect
    .poll(() => page.locator('.gallery img').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole('heading', { name: 'Ảnh đã bổ sung', exact: true }).scrollIntoViewIfNeeded();
  await page.locator('.gallery article').first().screenshot({
    path: 'test-results/place-vintage-corrected.png',
    animations: 'disabled',
  });
});

test('photo library keeps its full static fallback without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('/images/_thamvan_reports/index.html');
  await expect(page.locator('.gallery article')).toHaveCount(photos.length);
  await expect(page.getByRole('link', { name: 'Tải toàn bộ danh mục' })).toBeVisible();
  await expect(page.locator('details li')).toHaveCount(missing.length);
  await context.close();
});

test('place detail pages use the audited replacement photos rather than stale catalog files', async ({
  page,
}) => {
  for (const id of ['HCM-0859', 'HCM-0040', 'HCM-VR-0076']) {
    const entry = photos.find((p) => p.id === id)!;
    expect(entry?.image, id).toBeTruthy();
    await page.goto(`/vi/explore/${id.toLowerCase()}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.name);
    const photo = page.locator('.detail-hero img');
    const source = new URL((await photo.getAttribute('src'))!, page.url());
    expect(source.pathname).toBe(entry.image);
    expect(source.origin).toBe(new URL(page.url()).origin);
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(page.getByText('Quyền sử dụng ảnh đang được đối chiếu')).toBeVisible();
  await page.screenshot({
    path: 'test-results/place-shrine-corrected.png',
    animations: 'disabled',
  });
});
