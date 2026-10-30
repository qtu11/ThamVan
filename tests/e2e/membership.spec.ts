import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('three monthly plans, functional dashboard tabs and honest disconnected states', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/vi/dashboard');
  await expect(page.getByText('Đang xem trước dashboard.', { exact: false })).toBeVisible();
  await expect(page.locator('.dash-metric')).toHaveCount(4);
  await expect(page.locator('.dash-metric').first()).toContainText('—');
  await page.getByRole('button', { name: 'Gói & thanh toán', exact: true }).click();
  await expect(page.locator('[data-plan]')).toHaveCount(3);
  await expect(page.locator('[data-plan=premium]')).toContainText('39.000');
  await expect(page.locator('[data-plan=family]')).toContainText('89.000');
  await expect(page.locator('[data-plan=family]')).toContainText('4');
  await page.getByRole('button', { name: 'Timeline map', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bắt đầu ghi chuyến đi', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Tải video tua nhanh', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText('— km', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'AI lên lịch trình FAMILY', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Tạo lịch trình của gia đình', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText('Dịch vụ AI chưa kết nối.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng góp địa điểm', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Gửi admin xét duyệt', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Thông báo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bật thông báo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: 'test-results/membership-dashboard-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/membership-dashboard-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
  const disabled = await request.post('/api/membership/checkout', {
    headers: { Origin: 'http://localhost:3000' },
    data: { plan: 'family', method: 'card', locale: 'vi', consent: true, amount: 1 },
  });
  expect(disabled.status()).toBe(503);
});
test('dashboard and checkout accessibility, mobile layouts, admin preview and PWA assets', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of [
    '/vi/dashboard',
    '/vi/dashboard?tab=billing',
    '/vi/dashboard?tab=contributions',
    '/vi/dashboard?tab=timeline',
    '/vi/dashboard?tab=family',
    '/vi/dashboard?tab=planner',
    '/vi/dashboard?tab=notifications',
    '/vi/checkout?plan=family',
    '/vi/admin/dashboard',
    '/vi/admin/dashboard?tab=plans',
  ]) {
    await page.goto(route);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(audit.violations, route).toEqual([]);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} ${width}`,
      ).toBe(true);
    }
  }
  await page.goto('/vi/admin/dashboard');
  await page.screenshot({
    path: 'test-results/membership-admin-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Chi phí', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ghi sổ chi phí', exact: true })).toBeDisabled();
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe('standalone');
  const worker = await request.get('/sw.js');
  expect(worker.ok()).toBe(true);
  expect(await worker.text()).not.toContain("addEventListener('fetch'");
});
