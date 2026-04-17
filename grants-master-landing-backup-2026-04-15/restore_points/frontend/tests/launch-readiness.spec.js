// Example Playwright test for launch readiness (frontend)
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ request }) => {
  await request.post('/api/signup', { data: { email: 'test@example.com', password: 'testpass' } }).catch(() => {});
});

test.describe('Launch Readiness', () => {
  test('Login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText(/login/i);
  });

  test('Dashboard loads after login', async ({ page }) => {
    // simulate login by setting cookie then navigate to free dashboard
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ email: 'test@example.com', tier: 'free' }));
    });
    await page.goto('/dashboard/free');
    await expect(page.locator('h1')).toHaveText(/Welcome to Grants Master Free/i);
  });
});
