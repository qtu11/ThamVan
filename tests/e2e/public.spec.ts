import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tv-device-consent', JSON.stringify({ version: 1, acceptedAt: '2026-11-14T00:00:00Z', location: true, terms: true, camera: true, photos: true })));
});

test('Google sign-in is localized, fails closed without configuration, and handles cancelled callbacks', async ({
  page,
  request,
}) => {
  for (const [locale, label] of [
    ['vi', 'Tiếp tục với Google'],
    ['en', 'Continue with Google'],
    ['zh', '使用 Google 继续'],
  ]) {
    await page.goto(`/${locale}/auth/login`);
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  await page.goto(
    '/auth/callback?locale=en&next=/en/journey&error=access_denied&error_description=private-error',
  );
  await expect(page).toHaveURL(/\/en\/auth\/login\?/);
  await expect(page.locator('.status[role=alert]')).toContainText('Google sign-in was cancelled');
  await expect(page.locator('body')).not.toContainText('private-error');
  const attempt = await request.post('/api/auth/google', {
    headers: { Origin: 'http://localhost:3000' },
    data: { locale: 'vi' },
  });
  expect([200, 503]).toContain(attempt.status());
  const attemptBody = await attempt.json();
  if (attempt.status() === 200) {
    expect(attemptBody.url).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
  } else {
    expect(['googleUnavailable', 'notConfigured']).toContain(attemptBody.error);
  }
  await page.goto('/vi/auth/consent?next=/vi/journey');
  await expect(page).toHaveURL(/\/vi\/auth\/login\?next=/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/vi/auth/login');
  await page.screenshot({ path: 'test-results/google-login-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/google-login-desktop.png', fullPage: true });
});
test('home, responsive layout, real image assets and accessibility', async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/vi');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Đừng chỉ đến.');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('body')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    await expect(image).not.toHaveJSProperty('naturalWidth', 0);
  }
  await page.locator('.city-opening').scrollIntoViewIfNeeded();
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.every(
          (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
});
test('accent-insensitive search, empty filters and all detail actions', async ({ page }) => {
  await page.goto('/vi/explore');
  await page.getByRole('searchbox').fill('Buu dien Trung tam Sai Gon');
  await expect(page.locator('.heritage-card')).toHaveCount(1);
  await page.locator('.heritage-card').click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bưu điện Trung tâm Sài Gòn' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nguồn tham khảo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu hành trình', exact: true }).click();
  await expect(page).toHaveURL(/\/vi\/auth\/login/);
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await page.goto('/vi/explore?kind=festival');
  await expect(page.locator('.heritage-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Chưa có nội dung phù hợp' })).toBeVisible();
});
test('language change retains current route and updates document language', async ({ page }) => {
  await page.goto('/vi/explore/hcm-0051');
  await page.getByRole('combobox').first().selectOption('en');
  await expect(page).toHaveURL('/en/explore/hcm-0051');
  await expect(page.getByRole('heading', { name: 'The story', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('combobox').first().selectOption('zh');
  await expect(page.getByRole('heading', { name: '遗产故事' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bưu điện Trung tâm Sài Gòn');
});
test('camera previews a picked library photo and never fabricates recognition', async ({ page }) => {
  await page.goto('/vi/camera');
  await page.locator('input[type=file]').setInputFiles('public/images/hue.jpg');
  await expect(page.locator('img.lens-still')).toBeVisible();
  await expect(page.locator('.recognition-result')).toHaveCount(0);
});
test('map tracks the real device position without printing coordinates', async ({ page, context }) => {
  await page.route('**/api/nearby**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, area: 'Quận 1', placesAvailable: true, places: [] }) }),
  );
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 10.779981, longitude: 106.700021 });
  await page.goto('/vi/map');
  await page.locator('#map-search').fill('Buu dien Trung tam Sai Gon');
  await expect(page.locator('.atlas-list .atlas-item')).toHaveCount(1);
  await expect(page.locator('.atlas-list')).toContainText('Bưu điện Trung tâm Sài Gòn');
  await expect(page.locator('.atlas-list')).toContainText(/\d+ m ·/);
  expect(await page.locator('body').innerText()).not.toMatch(/10\.7799|106\.700|°N/);
});
test('settings persist guest choices, legal pages and gated private pages render', async ({
  page,
}) => {
  await page.goto('/vi/profile');
  await page.getByRole('slider').fill('8');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await page.reload();
  await expect(page.getByRole('slider')).toHaveValue('8');
  for (const path of ['journey', 'challenges', 'terms', 'privacy', 'credits', 'welcome', 'admin']) {
    const response = await page.goto(`/vi/${path}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1,h2').first()).toBeVisible();
  }
  await page.goto('/vi/welcome');
  await page.getByRole('button', { name: 'Tiếp theo' }).click();
  await page.getByRole('button', { name: 'Tiếp theo' }).click();
  await expect(page.getByRole('button', { name: 'Tiếp theo' })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tiếp theo' }).click();
  await expect(page.getByRole('heading', { name: 'Bạn luôn có quyền lựa chọn' })).toBeVisible();
});
test('security headers, CSRF and unconfigured writes fail closed', async ({ request }) => {
  const response = await request.get('/vi');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toContain("object-src 'none'");
  expect(response.headers()['content-security-policy']).toContain("'nonce-");
  expect(response.headers()['cache-control']).toContain('no-store');
  const forged = await request.post('/api/saved', {
    headers: { Origin: 'https://evil.example' },
    data: { entry_id: '00000000-0000-4000-8000-000000000001' },
  });
  expect(forged.status()).toBe(403);
  const guest = await request.post('/api/saved', {
    headers: { Origin: 'http://localhost:3000' },
    data: { entry_id: '00000000-0000-4000-8000-000000000001' },
  });
  expect([401, 503]).toContain(guest.status());
  expect(await guest.json()).toEqual(
    guest.status() === 401 ? { error: 'authRequired' } : { error: 'notConfigured' },
  );
  const invalid = await request.post('/api/auth', {
    headers: { Origin: 'http://localhost:3000' },
    data: { email: 'bad' },
  });
  expect(invalid.status()).toBe(422);
  const callback = await request.get('/auth/callback?next=https://evil.example', {
    maxRedirects: 0,
  });
  expect(callback.headers().location).toBe('http://localhost:3000/vi/auth/login?error=authInvalid');
});
test('English and Chinese pages have no serious accessibility violations', async ({ page }) => {
  for (const path of [
    '/en/explore',
    '/zh/profile',
    '/vi/auth/register',
    '/vi/camera',
    '/vi/challenges',
  ]) {
    await page.goto(path);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(audit.violations, `${path}`).toEqual([]);
  }
});
test('denied GPS explains how to re-enable it and search still works', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_s: unknown, failure: (error: object) => void) => failure({ code: 1 }),
        watchPosition: (_s: unknown, failure: (error: object) => void) => {
          failure({ code: 1 });
          return 1;
        },
        clearWatch: () => undefined,
      },
    });
  });
  await page.goto('/vi/map');
  await page.getByRole('button', { name: 'Vị trí của tôi', exact: true }).click();
  await expect(page.locator('.atlas-location-note[role=alert]')).toContainText('chặn quyền vị trí');
  await page.locator('#map-search').fill('Buu dien Trung tam Sai Gon');
  await page.locator('.atlas-filters select').last().selectOption('Quận 1');
  await expect(page.locator('.atlas-list .atlas-item')).toHaveCount(1);
});
test('all main screens fit a 320px viewport in three languages', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 820 });
  for (const locale of ['vi', 'en', 'zh'])
    for (const path of [
      'explore',
      'explore/hcm-0051',
      'map',
      'camera',
      'challenges',
      'journey',
      'profile',
      'auth/register',
      'welcome',
    ]) {
      await page.goto(`/${locale}/${path}`);
      await expect(page.locator('main')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${locale}/${path}`,
      ).toBe(true);
    }
});
test.describe('camera device flow', () => {
  test('captures a frame and releases the device', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await page.goto('/vi/camera');
    await expect(page.locator('video.lens-video')).toBeVisible();
    await page.getByRole('button', { name: 'Chụp ảnh', exact: true }).click();
    await expect(page.locator('img.lens-still')).toBeVisible();
    expect(
      await page.locator('video').evaluate((video) => (video as HTMLVideoElement).srcObject === null),
    ).toBe(true);
  });
});
