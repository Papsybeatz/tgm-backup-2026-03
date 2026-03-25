// tests/agencyIsolation.spec.js
// Playwright test: Agency workspace isolation
const { test, expect } = require('@playwright/test');

test('Agency workspace isolation', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('text=Clients');
  await page.click('text=Add Client');
  await page.fill('[data-testid="client-name"]', 'Client A');
  await page.click('text=Create');
  await page.click('text=Switch to Client A');
  await page.click('text=New Draft');
  await page.fill('[data-testid="draft-editor"]', 'Client A draft');
  await page.click('text=Switch to Personal Workspace');
  await expect(page.locator('text=Client A draft')).toHaveCount(0);
  await page.click('text=Switch to Client A');
  await expect(page.locator('[data-testid="draft-editor"]')).toHaveValue('Client A draft');
});
