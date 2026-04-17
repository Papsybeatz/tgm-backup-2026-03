#!/usr/bin/env node
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const fetch = globalThis.fetch || require('node-fetch');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SECRET = process.env.LEMONSQUEEZY_SIGNING_SECRET || '';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test+lemon@example.com';
const endpoint = `${APP_URL.replace(/\/$/,'')}/api/lemon-webhook`;

async function run() {
  const payload = {
    event: 'purchase',
    action: 'completed',
    data: {
      email: TEST_EMAIL,
      variant: { id: 963478 },
      customer: { email: TEST_EMAIL }
    }
  };

  const body = JSON.stringify(payload);
  const signature = SECRET ? crypto.createHmac('sha256', SECRET).update(body).digest('hex') : '';

  console.log('[LEMON TEST] POST', endpoint);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LemonSqueezy-Signature': signature
    },
    body
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('[LEMON TEST] FAILED', res.status, text);
    process.exit(2);
  }
  console.log('[LEMON TEST] OK', text);
}

if (require.main === module) run().catch(err => { console.error('[LEMON TEST] ERROR', err); process.exit(3); });

module.exports = run;
