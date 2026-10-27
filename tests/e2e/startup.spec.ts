import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('startup home is responsive, accessible and has live product destinations', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vi');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Đừng chỉ đến.');
  await expect(page.locator('.experience-card')).toHaveCount(3);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    await expect(image).not.toHaveJSProperty('naturalWidth', 0);
  }
  await page.locator('h1').scrollIntoViewIfNeeded();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: 'test-results/startup-home-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.screenshot({ path: 'test-results/startup-hero-desktop.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/startup-home-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('combobox', { name: 'GU CỦA TÔI' }).selectOption('local');
  await page.getByRole('link', { name: 'Gợi ý cho tôi' }).click();
  await expect(page).toHaveURL(/experiences\/mot-ngay-cho-lon/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chợ Lớn, chậm một nhịp');
  await expect(page.locator('.walk-task')).toHaveCount(1);
  await expect(page.locator('.locked-stop')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('passport persists on-device and exports honest self-marked stamps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/vi');
  const stamp = page.getByRole('button', { name: 'Đánh dấu Bạch Đằng', exact: true });
  await stamp.click();
  await expect(stamp).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(stamp).toHaveAttribute('aria-pressed', 'true');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải hộ chiếu', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('tham-van-passport.txt');
});

test('checkout and business inquiries fail honestly without live configuration', async ({
  page,
  request,
}) => {
  await page.goto('/vi/checkout?product=walk&experience=sai-gon-ben-song');
  await expect(page.getByText('Bộ hướng dẫn chưa mở bán', { exact: true })).toBeVisible();
  const api = await request.post('/api/checkout', {
    headers: { Origin: 'http://localhost:3000' },
    data: {
      product: 'walk',
      experience: 'sai-gon-ben-song',
      locale: 'vi',
      consent: true,
      amount: 1,
    },
  });
  expect(api.status()).toBe(503);
  expect(
    (
      await request.post('/api/checkout', {
        headers: { Origin: 'https://attacker.test' },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const locked = await request.get('/api/experiences/sai-gon-ben-song/download?locale=vi');
  expect(locked.status()).toBe(403);
  await page.goto('/vi/experiences/sai-gon-ben-song?status=PAID');
  await expect(page.locator('.walk-task')).toHaveCount(1);
  await page.goto('/vi/partners');
  await expect(page.getByRole('button', { name: 'Gửi đề bài hợp tác' })).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải mẫu đề bài' }).click();
  expect((await download).suggestedFilename()).toBe('tham-van-partnership-brief.txt');
});

test('three locales, shared navigation, route previews and small-screen commerce', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const locale of ['vi', 'en', 'zh']) {
    for (const route of [
      '',
      '/experiences',
      '/experiences/nhung-lop-ky-uc',
      '/checkout?product=collection',
      '/partners',
    ]) {
      await page.goto(`/${locale}${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      await page.setViewportSize({ width: 320, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await page.goto('/en/experiences');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('vi');
  await expect(page).toHaveURL('/vi/experiences');
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await expect(page.locator('#mobile-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-navigation')).toHaveCount(0);
});

test('purchase, preview and partnership pages meet WCAG checks', async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of [
    '/vi/experiences',
    '/vi/experiences/sai-gon-ben-song',
    '/vi/checkout?product=collection',
    '/vi/partners',
    '/vi/journey',
  ]) {
    await page.goto(route);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(audit.violations, route).toEqual([]);
  }
});

test('3D view selector moves the real scene, handles pause and reduced motion', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vi');
  const scene = page.locator('.city-canvas-wrap');
  await expect(scene).toHaveAttribute('data-scene-status', 'ready', { timeout: 25000 });
  await expect(scene.locator('canvas')).toHaveCount(1);
  const tabs = page.getByRole('group', { name: 'Chọn góc nhìn thành phố' });
  await tabs.getByRole('button', { name: /Cầu Ba Son/ }).click();
  await expect(scene).toHaveAttribute('data-city-view', '1');
  await expect
    .poll(async () =>
      Number(await page.locator('.city-canvas').getAttribute('data-camera-progress')),
    )
    .toBeGreaterThan(0.45);
  await tabs.getByRole('button', { name: /Landmark 81/ }).click();
  await expect
    .poll(async () =>
      Number(await page.locator('.city-canvas').getAttribute('data-camera-progress')),
    )
    .toBeGreaterThan(0.94);
  await page.getByRole('button', { name: 'Chuyển động: Bật', exact: true }).click();
  await expect(scene.locator('canvas')).toHaveCount(0);
  await expect(scene).toHaveAttribute('data-scene-status', 'static');
  await page.getByRole('button', { name: 'Chuyển động: Tắt', exact: true }).click();
  await expect(scene).toHaveAttribute('data-scene-status', 'ready');
  await expect(scene.locator('canvas')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(scene.locator('canvas')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Đang giảm chuyển động', exact: true }),
  ).toBeDisabled();
});
