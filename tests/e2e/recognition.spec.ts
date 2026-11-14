import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tv-permission-notice', 'accepted'));
});

test('camera uses only consented GPS, shows accuracy and can remove location', async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/recognize') || request.url().includes('/api/locate'))
      requests.push(request.url());
  });
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 10.7797, longitude: 106.699, accuracy: 18 });
  await page.goto('/vi/camera');
  const location = page.getByRole('checkbox', { name: 'Kèm vị trí hiện tại', exact: false });
  await expect(location).not.toBeChecked();
  await expect(page.getByText('Phân tích ảnh không kèm vị trí.', { exact: true })).toBeVisible();
  await location.check();
  await expect(page.getByRole('status').filter({ hasText: 'Đã lấy vị trí' })).toContainText('18 m');
  await page.locator('input[type=file]').setInputFiles('public/images/hue.jpg');
  await expect(page.locator('.camera-view>img')).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Tôi đồng ý gửi ảnh', exact: false }),
  ).not.toBeChecked();
  await location.uncheck();
  await expect(page.getByText('Phân tích ảnh không kèm vị trí.', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/recognition-consent-mobile.png', fullPage: true });
});

test('denied GPS leaves image-only analysis available without fabricated coordinates', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_success: unknown, failure: (error: object) => void) =>
          failure({ code: 1 }),
      },
    }),
  );
  await page.goto('/en/camera');
  const location = page.getByRole('checkbox', {
    name: 'Include my current location',
    exact: false,
  });
  await location.click();
  await expect(location).not.toBeChecked();
  await expect(
    page.getByText('Analyze the image without location.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.recognition-location .status[role="alert"]')).toBeVisible();
});
