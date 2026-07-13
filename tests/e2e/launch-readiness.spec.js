
// Example Playwright test for launch readiness (frontend)
import { test, expect } from '@playwright/test';

test.describe('Launch Readiness', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('user');
      window.localStorage.removeItem('tgm_onboarded');
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });
  });

  test('Login page loads', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Explicit wait for page navigation and ensure default visibility conditions
    await expect(page).toHaveURL(/\/login/);

    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByTestId('login-page-root')).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('Dashboard loads after login', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'playwright-test-token');
      window.localStorage.setItem('tgm_onboarded', '1');
      window.localStorage.setItem('user', JSON.stringify({ email: 'founder@example.com', tier: 'starter' }));
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: 'founder@example.com', tier: 'starter' }),
      });
    });

    await page.goto('/login');

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard(\/|$)/);
    await expect(page.locator('main').first()).toBeVisible();
  });
});
