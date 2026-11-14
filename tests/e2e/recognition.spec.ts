import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('asks once per device: every box must be ticked, then the camera opens', async ({ page, context }) => {
  await context.grantPermissions(['camera', 'geolocation']);
  await context.setGeolocation({ latitude: 10.7797, longitude: 106.699, accuracy: 18 });
  await page.goto('/vi/camera');
  const gate = page.getByRole('dialog', { name: 'Bật quyền trước khi chụp' });
  await expect(gate).toBeVisible();
  const go = page.getByRole('button', { name: 'Tiếp tục & mở camera' });
  await expect(go).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Lấy vị trí của thiết bị' }).check();
  await expect(go).toBeDisabled();
  await page.getByText('Chọn tất cả', { exact: true }).click();
  await expect(go).toBeEnabled();
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
  await go.click();
  await expect(gate).toBeHidden();
  await expect(page.locator('video.lens-video')).toBeVisible();
  await expect(page.getByText('Đang dùng vị trí của bạn')).toBeVisible();
  // No coordinates, accuracy figures or IP anywhere on screen.
  expect(await page.locator('body').innerText()).not.toMatch(/10\.77|106\.69|±|\bIP\b/);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Bật quyền trước khi chụp' })).toHaveCount(0);
});

test('capture shows the shot and an analysis sheet without fabricating results', async ({ page, context }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tv-device-consent', JSON.stringify({ version: 1, acceptedAt: 'x', location: false, terms: true, camera: true, photos: true })),
  );
  await context.grantPermissions(['camera']);
  await page.goto('/vi/camera');
  await page.getByRole('button', { name: 'Chụp ảnh', exact: true }).click();
  await expect(page.locator('img.lens-still')).toBeVisible();
  await expect(page.locator('video.lens-video')).toBeHidden();
  await expect(page.getByRole('region', { name: 'Kết quả phân tích' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chụp lại' })).toBeVisible();
  await expect(page.locator('.recognition-result')).toHaveCount(0);
});
