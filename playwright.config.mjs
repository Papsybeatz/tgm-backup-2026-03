import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.js'],
  testIgnore: ['**/restore_points/**', '**/grants-master-landing-backup-2026-04-15/**'],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'powershell -NoProfile -Command "Start-Process node -ArgumentList \'server.js\' | Out-Null; npm run dev -- --host 0.0.0.0 --port 5173"',
    port: 5173,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
