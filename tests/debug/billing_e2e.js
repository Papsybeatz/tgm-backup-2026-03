const fetch = global.fetch || require('node-fetch');
const crypto = require('crypto');
(async function(){
  try {
    const email = `autotest+billing${Date.now()}@example.com`;
    console.log('email:', email);

    // login (creates user)
    let res = await fetch('http://localhost:4000/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    if (!res.ok) throw new Error('login failed');
    const login = await res.json();
    const token = login.token;
    console.log('token obtained');

    // craft lemon webhook payload for lifetime variant
    const variantId = process.env.LEMONSQUEEZY_LIFETIME_VARIANT_ID || '963478';
    const order = { id: `ord_${Date.now()}`, variant_id: variantId, user_email: email };
    const payload = { event: 'order.completed', data: { attributes: order } };
    const raw = JSON.stringify(payload);

    // prefer env, fallback to known dev secret from .env
    const signingSecret = process.env.LEMONSQUEEZY_SIGNING_SECRET || 'sk_test_grantsmaster_1234567890';
    // compute HMAC over JSON string of payload (server uses JSON.stringify(req.body) for HMAC input)
    const signature = crypto.createHmac('sha256', signingSecret).update(raw).digest('hex');

    // POST webhook
    res = await fetch('http://localhost:4000/api/lemon-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-signature': signature, 'x-lemon-signature': signature, 'x-lemon-squeezy-signature': signature }, body: raw });
    const txt = await res.text();
    console.log('webhook response:', res.status, txt.slice(0,200));
    if (!res.ok) throw new Error('webhook rejected');

    // wait briefly for DB writes
    await new Promise(r=>setTimeout(r,300));

    // verify via auth/me (use token)
    res = await fetch('http://localhost:4000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    const me = await res.json();
    console.log('auth/me:', me);
    if (me.tier === 'lifetime') {
      console.log('Billing E2E PASSED — tier set to lifetime');
      process.exit(0);
    } else {
      console.error('Billing E2E FAILED — tier not updated', me.tier);
      process.exit(2);
    }
  } catch (e) {
    console.error('E2E error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
