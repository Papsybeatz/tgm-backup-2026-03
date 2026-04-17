// playwright.config.js
// Ensure Playwright E2E tests run against the Express backend (not Vite dev server)

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testIgnore: '**/*.test.js',
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3001', // Frontend dev server (Vite)
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
