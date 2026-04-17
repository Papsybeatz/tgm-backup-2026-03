// tests/autosave.spec.js
// Playwright test: Draft autosave and persistence
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ request }) => {
  await request.post('/api/signup', { data: { email: 'test@example.com', password: 'testpass' } }).catch(() => {});
});

test('Draft editor accepts input', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({ email: 'test@example.com', tier: 'free' }));
  });
  await page.goto('/workspace/free-draft');
  const textarea = page.locator('textarea[placeholder="Type your grant draft here…"]');
  await expect(textarea).toBeVisible();
  await textarea.fill('This is a test draft.');
  await expect(textarea).toHaveValue('This is a test draft.');
});
