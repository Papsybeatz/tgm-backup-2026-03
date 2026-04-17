const { test, expect } = require('@playwright/test');

const tiers = [
  { key: 'free', path: '/dashboard/free', selector: '[data-testid="dashboard-free-root"]' },
  { key: 'starter', path: '/dashboard/starter', selector: '[data-testid="dashboard-starter-root"]' },
  { key: 'pro', path: '/dashboard/pro', selector: '[data-testid="dashboard-pro-root"]' },
  { key: 'agency-starter', path: '/dashboard/agency-starter', selector: 'h1:has-text("Agency Starter Dashboard")' },
  { key: 'agency-unlimited', path: '/dashboard/agency-unlimited', selector: 'h1:has-text("Agency Unlimited Dashboard")' },
  { key: 'lifetime', path: '/dashboard/pro', selector: '[data-testid="dashboard-pro-root"]' },
];

function uiTierFor(tier) {
  if (tier === 'agency-starter') return 'agency_starter';
  if (tier === 'agency-unlimited') return 'agency_unlimited';
  if (tier === 'lifetime') return 'pro';
  return tier;
}

test.describe('Tier verification', () => {
  for (const t of tiers) {
    test(`verifies ${t.key} unlocks expected UI`, async ({ page, request }) => {
      const email = `playwright+${t.key}+${Date.now()}@example.com`;
      // create user
      const signup = await request.post('http://localhost:4000/api/signup', {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ email, password: 'test' })
      });
      if (signup.status() >= 400) {
        throw new Error('Signup failed: ' + (await signup.text()));
      }

      // For verification we set the tier directly in localStorage rather than exercising external checkout

      const uiTier = uiTierFor(t.key);

      // Ensure the app sees the user + tier via localStorage before any script runs
      await page.addInitScript(({ email, uiTier }) => {
        localStorage.setItem('user', JSON.stringify({ email, tier: uiTier }));
      }, { email, uiTier });

      // navigate to dashboard path on the backend-served SPA and assert expected element
      await page.goto('http://localhost:4000' + t.path);
      await expect(page.locator(t.selector)).toBeVisible({ timeout: 15000 });

      // take screenshot for records
      await page.screenshot({ path: `test-results/tier-${t.key}-${Date.now()}.png`, fullPage: true });
    });
  }
});
