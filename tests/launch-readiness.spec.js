// Example Playwright test for launch readiness (frontend)
// Save as tests/launch-readiness.spec.js

const { test, expect } = require('@playwright/test');

test.describe('Launch Readiness', () => {
  test('Login page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await expect(page).toHaveTitle(/login/i);
  });

  test('Dashboard loads after login', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    // Simulate login (replace with actual selectors/logic)
    await page.fill('input[type=email]', 'test@example.com');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});
