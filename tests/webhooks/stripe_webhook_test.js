#!/usr/bin/env node
const crypto = require('crypto');
const fetch = globalThis.fetch || require('node-fetch');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || 'LIFETIME_PRICE_ID';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test+stripe@example.com';
const endpoint = `${APP_URL.replace(/\/$/,'')}/api/stripe-webhook`;

async function run() {
  const event = {
    id: 'evt_test_123',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        object: 'checkout.session',
        customer: 'cus_test_123',
        customer_email: TEST_EMAIL,
        customer_details: { email: TEST_EMAIL },
        line_items: {
          data: [
            { price: { id: PRICE_ID } }
          ]
        }
      }
    }
  };

  const body = JSON.stringify(event);

  let sigHeader = '';
  if (WEBHOOK_SECRET) {
    const t = Math.floor(Date.now() / 1000);
    const signed = `${t}.${body}`;
    const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(signed).digest('hex');
    sigHeader = `t=${t},v1=${v1}`;
  }

  console.log('[STRIPE TEST] POST', endpoint, 'with signature:', !!sigHeader);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, sigHeader ? { 'stripe-signature': sigHeader } : {}),
    body
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('[STRIPE TEST] FAILED', res.status, text);
    process.exit(2);
  }
  console.log('[STRIPE TEST] OK', text);
}

if (require.main === module) run().catch(err => { console.error('[STRIPE TEST] ERROR', err); process.exit(3); });

module.exports = run;
