import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { catalog } from '@/data/catalog';

// Render the actual result component with deterministic API-shaped fixtures.
// This checks the result UI without introducing a fake login route in the application.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tv-permission-notice', 'accepted'));
});

test('recognition result renders objects, sources and GPS conflict accessibly on mobile', async ({
  page,
}) => {
  const entry = catalog[0];
  const markup = await readFile(
    'docs/verification/recognition-2026-10-31/result-fixture.html',
    'utf8',
  );
  await page.goto('/vi/camera');
  await page
    .locator('.camera-layout > div')
    .first()
    .evaluate((element, html) => {
      element.innerHTML = html;
    }, markup);
  await expect(
    page.getByRole('heading', { name: 'Ảnh và vị trí hiện tại chưa khớp' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cổng trang trí', exact: true })).toBeVisible();
  await expect(page.getByText('Địa điểm này xa vị trí hiện tại', { exact: false })).toBeVisible();
  await page.locator('.recognition-result summary').click();
  await expect(
    page
      .locator('.recognition-result details')
      .getByRole('link', { name: entry.sources[0].title, exact: true }),
  ).toHaveAttribute('href', entry.sources[0].url);
  await expect(page.locator('.recognition-match .photo img')).not.toHaveJSProperty(
    'naturalWidth',
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: 'test-results/recognition-result-conflict-mobile.png',
    fullPage: true,
  });
});
