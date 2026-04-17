# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: grants-master-landing-backup-2026-04-15\restore_points\frontend\tests\e2e\launch-readiness.spec.js >> Launch Readiness >> Login page loads
- Location: grants-master-landing-backup-2026-04-15\restore_points\frontend\tests\e2e\launch-readiness.spec.js:14:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="login-page-root"]')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('[data-testid="login-page-root"]')

```

# Page snapshot

```yaml
- generic [ref=e2]: Cannot GET /login
```

# Test source

```ts
  1  | // Example Playwright test for launch readiness (frontend)
  2  | 
  3  | const { test, expect } = require('@playwright/test');
  4  | 
  5  | test.describe('Launch Readiness', () => {
  6  |     test.beforeEach(async () => {
  7  |       // Ensure test user exists before each test
  8  |       await fetch('http://localhost:4000/api/signup', {
  9  |         method: 'POST',
  10 |         headers: { 'Content-Type': 'application/json' },
  11 |         body: JSON.stringify({ email: 'test@example.com', password: 'testpass' })
  12 |       });
  13 |     });
  14 |   test('Login page loads', async ({ page }) => {
  15 |     await page.goto('http://localhost:4000/login', { waitUntil: 'domcontentloaded' });
  16 | 
  17 |     // Explicit wait for page navigation and ensure default visibility conditions
  18 |     await expect(page).toHaveURL(/\/login$/);
  19 | 
  20 |     // Debugging visibility
  21 |     const loginPageRoot = page.locator('[data-testid="login-page-root"]');
  22 |     const isRootVisible = await loginPageRoot.isVisible();
  23 |     if (!isRootVisible) {
  24 |       console.error('login-page-root element is not visible.');
  25 |     }
> 26 |     await expect(loginPageRoot).toBeVisible({ timeout: 20000 }); // Increase timeout if delays are expected
     |                                 ^ Error: expect(locator).toBeVisible() failed
  27 | 
  28 |     // Check the form and inputs
  29 |     const loginForm = page.locator('[data-testid="login-form"]');
  30 |     await loginForm.waitFor();
  31 |     await expect(loginForm).toBeVisible();
  32 | 
  33 |     // Verify other input elements as well
  34 |     await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
  35 |     await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
  36 |   });
  37 | 
  38 |   test('Dashboard loads after login', async ({ page }) => {
  39 |     await page.goto('http://localhost:4000/login');
  40 | 
  41 |     // Wait until the login form appears
  42 |     const emailField = page.locator('[data-testid="login-email"]');
  43 |     const passwordField = page.locator('[data-testid="login-password"]');
  44 | 
  45 |     // Confirm they are interactable and visible
  46 |     await expect(emailField).toBeVisible();
  47 |     await expect(passwordField).toBeVisible();
  48 | 
  49 |     // Fill in login details
  50 |     await emailField.fill('test@example.com');
  51 |     await passwordField.fill('testpass');
  52 | 
  53 |     // Submit the form
  54 |     const submitButton = page.locator('[data-testid="login-submit"]');
  55 |     await submitButton.click();
  56 | 
  57 |     // Confirm login successful (i.e., redirect happened)
  58 |     await page.waitForNavigation(); // Wait for navigation before URL assertion
  59 |     await expect(page).toHaveURL(/\/dashboard(\/|$)/);
  60 | 
  61 |     // Check if the dashboard loaded
  62 |     const dashboardTestIds = [
  63 |       'dashboard-free-root',
  64 |       'dashboard-starter-root',
  65 |       'dashboard-pro-root',
  66 |       'dashboard-agency-root',
  67 |     ];
  68 |     let dashboardFound = false;
  69 |     for (const testId of dashboardTestIds) {
  70 |       const dashboardRoot = page.locator(`[data-testid="${testId}"]`);
  71 |       if (await dashboardRoot.isVisible()) {
  72 |         await expect(dashboardRoot).toBeVisible({ timeout: 20000 });
  73 |         dashboardFound = true;
  74 |         break;
  75 |       }
  76 |     }
  77 |     if (!dashboardFound) {
  78 |       console.error('No dashboard root element is visible.');
  79 |     }
  80 |     expect(dashboardFound).toBe(true);
  81 |   });
  82 | });
  83 | 
```