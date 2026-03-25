// tests/autosave.spec.js
// Playwright test: Draft autosave and persistence
const { test, expect } = require('@playwright/test');

test('Draft autosave and persistence', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('text=New Draft');
  await page.fill('[data-testid="draft-editor"]', 'This is a test draft.');
  await page.waitForTimeout(3000); // Wait for autosave
  await page.reload();
  await expect(page.locator('[data-testid="draft-editor"]')).toHaveValue('This is a test draft.');
  await page.fill('[data-testid="draft-title"]', 'Renamed Draft');
  await page.reload();
  await expect(page.locator('[data-testid="draft-title"]')).toHaveValue('Renamed Draft');
  await page.click('text=Delete Draft');
  await expect(page.locator('text=Renamed Draft')).toHaveCount(0);
});
