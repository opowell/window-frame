import { defineConfig, devices } from '@playwright/test'

/**
 * Component tests run against the real stories in a real browser.
 *
 * Port 6012 rather than Storybook's default 6006, so a Storybook already
 * running for another project on this machine is left alone.
 */
const PORT = Number(process.env.STORYBOOK_PORT ?? 6012)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chrome-beta',
      use: {
        ...devices['Desktop Chrome'],
        // Verify against the next Chrome rather than the bundled Chromium.
        channel: 'chrome-beta',
      },
    },
  ],
  webServer: {
    command: `npx storybook dev -p ${PORT} --no-open --ci`,
    url: `http://localhost:${PORT}/index.json`,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
