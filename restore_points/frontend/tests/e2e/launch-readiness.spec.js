// Example Playwright test for launch readiness (frontend)

const { test, expect } = require('@playwright/test');

test.describe('Launch Readiness', () => {
    test.beforeEach(async () => {
      // Ensure test user exists before each test
      await fetch('http://localhost:4000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'testpass' })
      });
    });
  test('Login page loads', async ({ page }) => {
    await page.goto('http://localhost:4000/login', { waitUntil: 'domcontentloaded' });

    // Explicit wait for page navigation and ensure default visibility conditions
    await expect(page).toHaveURL(/\/login$/);

    // Debugging visibility
    const loginPageRoot = page.locator('[data-testid="login-page-root"]');
    const isRootVisible = await loginPageRoot.isVisible();
    if (!isRootVisible) {
      console.error('login-page-root element is not visible.');
    }
    await expect(loginPageRoot).toBeVisible({ timeout: 20000 }); // Increase timeout if delays are expected

    // Check the form and inputs
    const loginForm = page.locator('[data-testid="login-form"]');
    await loginForm.waitFor();
    await expect(loginForm).toBeVisible();

    // Verify other input elements as well
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
  });

  test('Dashboard loads after login', async ({ page }) => {
    await page.goto('http://localhost:4000/login');

    // Wait until the login form appears
    const emailField = page.locator('[data-testid="login-email"]');
    const passwordField = page.locator('[data-testid="login-password"]');

    // Confirm they are interactable and visible
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();

    // Fill in login details
    await emailField.fill('test@example.com');
    await passwordField.fill('testpass');

    // Submit the form
    const submitButton = page.locator('[data-testid="login-submit"]');
    await submitButton.click();

    // Confirm login successful (i.e., redirect happened)
    await page.waitForNavigation(); // Wait for navigation before URL assertion
    await expect(page).toHaveURL(/\/dashboard(\/|$)/);

    // Check if the dashboard loaded
    const dashboardTestIds = [
      'dashboard-free-root',
      'dashboard-starter-root',
      'dashboard-pro-root',
      'dashboard-agency-root',
    ];
    let dashboardFound = false;
    for (const testId of dashboardTestIds) {
      const dashboardRoot = page.locator(`[data-testid="${testId}"]`);
      if (await dashboardRoot.isVisible()) {
        await expect(dashboardRoot).toBeVisible({ timeout: 20000 });
        dashboardFound = true;
        break;
      }
    }
    if (!dashboardFound) {
      console.error('No dashboard root element is visible.');
    }
    expect(dashboardFound).toBe(true);
  });
});
