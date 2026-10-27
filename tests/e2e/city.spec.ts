import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('real city renderer handles context loss and keeps a useful poster', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vi');
  const scene = page.locator('.city-canvas-wrap');
  await expect(scene).toHaveAttribute('data-scene-status', 'ready', { timeout: 25000 });
  await expect(scene.locator('canvas')).toHaveCount(1);
  expect(
    Number(await page.locator('.city-canvas').getAttribute('data-draw-calls')),
  ).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/startup-3d-desktop.png', animations: 'disabled' });
  await page
    .getByRole('group', { name: 'Chọn góc nhìn thành phố' })
    .getByRole('button', { name: /Cầu Ba Son/ })
    .click();
  await expect
    .poll(async () =>
      Number(await page.locator('.city-canvas').getAttribute('data-camera-progress')),
    )
    .toBeGreaterThan(0.49);
  await page.screenshot({ path: 'test-results/startup-3d-bason.png', animations: 'disabled' });
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await scene.locator('canvas').dispatchEvent('webglcontextlost', { cancelable: true });
  await expect(scene).toHaveAttribute('data-scene-status', 'unavailable');
  await expect(scene.locator('canvas')).toHaveCount(0);
  await expect
    .poll(() =>
      page.locator('.city-poster').evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole('link', { name: 'Tìm hành trình của tôi', exact: true }).click();
  await expect(page).toHaveURL('/vi/experiences');
  expect(errors).toEqual([]);
});

test('city remains readable with reduced motion and when WebGL is unavailable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  await expect(page.locator('.home-experience')).toHaveAttribute('data-motion', 'off');
  await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toBeDisabled();
  await page
    .getByRole('group', { name: 'Choose a city view' })
    .getByRole('button', { name: /Landmark 81/ })
    .click();
  await expect(page.locator('.city-poster')).toHaveAttribute('src', '/images/hcm-landmark81.webp');
  await expect(page.locator('.city-canvas canvas')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (kind: string, ...args: unknown[]) {
        if (kind === 'webgl' || kind === 'webgl2') return null;
        return Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
  await page.goto('/vi');
  await expect(page.locator('.city-canvas-wrap')).toHaveAttribute(
    'data-scene-status',
    'unavailable',
  );
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('home and story walk preview remain useful without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('/vi');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.city-canvas canvas')).toHaveCount(0);
  await expect
    .poll(() =>
      page.locator('.city-poster').evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole('link', { name: 'Tìm hành trình của tôi', exact: true }).click();
  await expect(page).toHaveURL('/vi/experiences');
  await page.locator('.experience-card').first().click();
  await expect(page.locator('.walk-task')).toHaveCount(1);
  await context.close();
});
