// playwright.config.js
// Ensure Playwright E2E tests run against the Express backend (not Vite dev server)

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
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
