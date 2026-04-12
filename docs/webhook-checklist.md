## Webhook Registration & Testing Checklist

- **Purpose**: register LemonSqueezy and Stripe webhooks, set env vars, and run local signed-webhook tests.

- **Required env vars (recommended)**
  - `APP_URL` — public or local URL where your server is reachable (e.g., `http://localhost:3000`)
  - `LEMONSQUEEZY_SIGNING_SECRET` — LemonSqueezy HMAC secret
  - `STRIPE_API_KEY` — Stripe secret key (for checkout/tests)
  - `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret (for signature verification in tests)
  - `STRIPE_LIFETIME_PRICE_ID` — Price id that maps to lifetime tier

- **Register endpoints**
  - LemonSqueezy webhook URL: `${APP_URL}/api/lemon-webhook`
  - Stripe webhook URL: `${APP_URL}/api/stripe-webhook`

- **Quick local testing**
  1. Start your backend: `node server.js` (or `npm start`).
  2. Set env vars for test run (example):

```bash
export APP_URL=http://localhost:3000
export LEMONSQUEEZY_SIGNING_SECRET=your_lemon_secret
export STRIPE_WEBHOOK_SECRET=whsec_...
export STRIPE_LIFETIME_PRICE_ID=price_ABC123
export TEST_EMAIL=test+webhook@example.com
```

  3. Run the webhook tests:

```bash
npm run test:webhooks
```

- **If using Stripe CLI (recommended for production-like tests)**
  - Install Stripe CLI and run: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
  - Trigger events: `stripe trigger checkout.session.completed`

- **Notes**
  - LemonSqueezy test script computes HMAC-SHA256 over the JSON body and sends it in `X-LemonSqueezy-Signature` header.
  - Stripe test script constructs a `t=...,v1=...` signature header compatible with `stripe.webhooks.constructEvent`.
  - Adjust `TEST_EMAIL` to match a user in your DB or the test user you intend to create.
