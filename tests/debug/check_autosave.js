const playwright = require('playwright');
(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const email = `autotest+autosave${Date.now()}@example.com`;
    // Login via API to get token
    const loginResp = await page.request.post('http://localhost:4000/api/auth/login', { data: { email } });
    const loginJson = await loginResp.json();
    const token = loginJson.token;

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    // persist token so AuthContext restoreSession will pick it up
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.goto('http://localhost:5173/workspace/new-draft', { waitUntil: 'networkidle' });
    await page.fill('textarea', 'This is an autosave test. ' + Date.now());
    // Wait longer than debounce (1.5s)
    await page.waitForTimeout(2200);
    // Fetch drafts using Authorization header
    const res = await page.evaluate(async (t) => {
      try {
        const r = await fetch('/api/drafts', { headers: { Authorization: `Bearer ${t}` } });
        return await r.json();
      } catch (e) { return { error: e.message } }
    }, token);
    console.log('Drafts fetch result:', JSON.stringify(res).slice(0,1000));
    await page.screenshot({ path: 'tests/debug/check_autosave.png', fullPage: true });
    console.log('screenshot saved to tests/debug/check_autosave.png');
  } catch (e) {
    console.error('check_autosave error:', e.message);
  } finally {
    await browser.close();
  }
})();