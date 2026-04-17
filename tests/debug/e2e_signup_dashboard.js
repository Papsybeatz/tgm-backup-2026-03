const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const base = 'http://localhost:5173';
    const email = `autotest+ui${Date.now()}@example.com`;

    // Go to signup
    await page.goto(`${base}/signup`, { waitUntil: 'networkidle' });
    await page.fill('input[type=email]', email);
    const pwLoc = page.locator('input[type=password]');
    const pwCount = await pwLoc.count();
    if (pwCount >= 1) await pwLoc.nth(0).fill('testpass');
    if (pwCount >= 2) await pwLoc.nth(1).fill('testpass');
    // optional org/name fields may be present
    const orgField = await page.$('input[placeholder="Organization (optional)"], input[name=org]');
    if (orgField) await orgField.fill('QA');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type=submit]')
    ]);

    // After signup we expect to land on onboarding (or be redirected)
    await page.waitForTimeout(500);

    // Explicitly select onboarding options by label to ensure selections are set
    await page.waitForSelector('text=What type of grants do you write?', { timeout: 5000 }).catch(() => {});
    // Step 1: select 'Nonprofit'
    const nonprofit = page.locator('button', { hasText: 'Nonprofit' });
    if (await nonprofit.count() > 0) {
      await nonprofit.first().click();
      await page.waitForTimeout(400);
    }

    // Step 2: select 'Beginner'
    const beginner = page.locator('button', { hasText: 'Beginner' });
    if (await beginner.count() > 0) {
      await beginner.first().click();
      await page.waitForTimeout(400);
    }

    // Step 3: select 'Explore opportunities'
    const explore = page.locator('button', { hasText: 'Explore opportunities' });
    if (await explore.count() > 0) {
      await explore.first().click();
      await page.waitForTimeout(400);
    }

    // Wait for final redirect to dashboard
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    } catch (e) {
      // not redirected within timeout
    }

    const url = page.url();
    console.log('Final URL:', url);
    const outPath = page.url().includes('/dashboard') ? 'tests/debug/e2e_signup_dashboard_full.png' : 'tests/debug/e2e_signup_dashboard_partial.png';
    await page.screenshot({ path: outPath, fullPage: true });
    console.log('screenshot saved to', outPath);
  } catch (err) {
    console.error('E2E script error:', err.message);
  } finally {
    await browser.close();
  }
})();
