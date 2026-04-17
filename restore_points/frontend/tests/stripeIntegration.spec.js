// tests/stripeIntegration.spec.js
// Playwright test: Stripe integration (mocked)
const { test, expect } = require('@playwright/test');

test('Stripe checkout and gating', async ({ page }) => {
  await page.goto('/pricing');
  await page.click('text=Start Starter');
  // Simulate Stripe checkout (mocked)
  await page.waitForURL('**/stripe/checkout/success', { timeout: 10000 });
  await page.goto('/dashboard');
  await expect(page.locator('text=Starter')).toBeVisible();
  await page.click('text=Pro-only Feature');
  await expect(page.locator('text=Upgrade to Pro')).toHaveCount(0); // Gating removed
  await page.click('text=Downgrade');
  await expect(page.locator('text=Upgrade to Pro')).toBeVisible(); // Gating returns
});
