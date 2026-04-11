import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — smoke tests only.
 *
 * Scope is deliberately minimal while the app is in active redesign:
 * we test only the highest-stakes public entry surfaces (home,
 * sign-in, register) and do NOT attempt authenticated flows. Broader
 * UI coverage will come back once the surfaces stop moving daily.
 *
 * Runs against Chromium only to keep the smoke suite under 30 seconds.
 * Add Firefox/WebKit back when we need cross-browser confidence.
 */
export default defineConfig({
  testDir: './__e2e__',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
});
