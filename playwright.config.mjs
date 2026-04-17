import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:4000', // Express backend with SPA fallback
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'node server.js',
    port: 4000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
