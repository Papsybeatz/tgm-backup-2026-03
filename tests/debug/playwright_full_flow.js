const playwright = require('playwright');
const crypto = require('crypto');

(async () => {
  const base = 'http://localhost:4000';
  try {
    const email = `autotest+pf_${Date.now()}@example.com`;
    console.log('test email:', email);

    // create a Playwright API request context for server-side HTTP calls
    const request = await playwright.request.newContext();

    // login (creates user)
    let res = await request.post(`${base}/api/auth/login`, { headers: { 'Content-Type': 'application/json' }, data: JSON.stringify({ email }) });
    if (res.status() < 200 || res.status() >= 300) throw new Error('login failed');
    const login = await res.json();
    const token = login.token;
    console.log('token obtained');

    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    // set token in localStorage so AuthContext restores session
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.evaluate((t) => localStorage.setItem('token', t), token);

    // go to workspace and write content
    await page.goto('http://localhost:5173/workspace/new-draft', { waitUntil: 'networkidle' });
    const content = 'Playwright full-flow test content ' + Date.now();
    await page.fill('textarea', content);
    // wait for autosave debounce (1.5s configured earlier)
    await page.waitForTimeout(2500);

    // confirm draft saved via API
    const draftsResp = await page.evaluate(async (t) => {
      const r = await fetch('/api/drafts', { headers: { Authorization: `Bearer ${t}` } });
      return await r.json();
    }, token);
    console.log('drafts fetch result:', draftsResp && draftsResp.drafts && draftsResp.drafts.length);
    if (!draftsResp || !draftsResp.drafts || draftsResp.drafts.length === 0) throw new Error('autosave failed');

    // simulate LemonSqueezy webhook for lifetime purchase
    const variantId = process.env.LEMONSQUEEZY_LIFETIME_VARIANT_ID || '963478';
    const order = { id: `ord_${Date.now()}`, variant_id: variantId, user_email: email };
    const payload = { event: 'order.completed', data: { attributes: order } };
    const raw = JSON.stringify(payload);
    const signingSecret = process.env.LEMONSQUEEZY_SIGNING_SECRET || 'sk_test_grantsmaster_1234567890';
    const signature = crypto.createHmac('sha256', signingSecret).update(raw).digest('hex');

    res = await request.post(`${base}/api/lemon-webhook`, { headers: { 'Content-Type': 'application/json', 'x-signature': signature }, data: raw });
    const txt = await res.text();
    console.log('webhook response:', res.status(), txt.slice(0, 200));
    if (res.status() < 200 || res.status() >= 300) throw new Error('webhook rejected');

    // wait for user record update
    await new Promise(r => setTimeout(r, 400));

    // reload app and fetch /api/auth/me
    await page.reload({ waitUntil: 'networkidle' });
    const me = await page.evaluate(async (t) => {
      const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } });
      return await r.json();
    }, token);
    console.log('auth/me:', me);
    if (me.tier === 'lifetime') {
      console.log('Playwright full-flow PASSED');
      await browser.close();
      await request.dispose();
      process.exit(0);
    }
    throw new Error('tier not updated: ' + JSON.stringify(me));
  } catch (e) {
    console.error('Playwright full-flow failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
