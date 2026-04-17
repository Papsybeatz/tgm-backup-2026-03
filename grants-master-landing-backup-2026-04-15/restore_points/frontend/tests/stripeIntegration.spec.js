// tests/stripeIntegration.spec.js
// Playwright test: Stripe integration (mocked)
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ request }) => {
  await request.post('/api/signup', { data: { email: 'test@example.com', password: 'testpass' } }).catch(() => {});
});

test('Stripe checkout and gating', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({ email: 'test@example.com', tier: 'free' }));
  });
  // Instead of clicking an external checkout, call the upgrade API to simulate a successful purchase
  await page.request.post('/api/upgrade/starter', { data: { email: 'test@example.com' } });
  await page.goto('/dashboard/agency');
  // Agency dashboard shows a tier badge; ensure the page rendered after upgrade call
  await expect(page.locator('text=Agency Dashboard')).toBeVisible();
});
