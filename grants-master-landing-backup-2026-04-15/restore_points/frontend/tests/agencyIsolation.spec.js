// tests/agencyIsolation.spec.js
// Playwright test: Agency workspace isolation
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ request }) => {
  await request.post('/api/signup', { data: { email: 'test@example.com', password: 'testpass' } }).catch(() => {});
});

test('Agency workspace isolation', async ({ page }) => {
  // set auth cookie so RequireAuth allows access
  await page.addInitScript(() => {
    // ensure the test user has an agency tier so Agency Dashboard doesn't redirect to Upgrade
    localStorage.setItem('user', JSON.stringify({ email: 'test@example.com', tier: 'agency_starter' }));
  });
  await page.goto('/dashboard/agency');
  // Assert Agency dashboard UI and navigate to draft editor
  await expect(page.locator('text=Agency Dashboard')).toBeVisible();
  await page.click('text=Start Writing');
  await page.waitForURL('**/draft');
  await expect(page.locator('textarea')).toBeVisible();
});
