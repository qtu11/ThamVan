import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: `npm run start -- --port ${new URL(baseURL).port || '3000'}`,
    url: `${baseURL}/vi`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
