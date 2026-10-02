/**
 * Business-outcome alerting.
 *
 * The gap this closes: a Stripe webhook that answers 200 while a paying
 * customer silently gets no access. It never throws and never returns a 5xx,
 * so alertOnServerError cannot see it by construction — the request succeeded.
 * The webhook is right to answer 200 (Stripe must not retry), which is exactly
 * why nothing was ever raised.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  alertOnBusinessFailure,
  buildAlertHtml,
  isAlertingConfigured,
  _resetThrottle,
} = require('../utils/alerting.js');

const STRIPE_PATH = path.join(__dirname, '..', 'routes', 'webhooks', 'stripe.js');
const stripeSrc = fs.readFileSync(STRIPE_PATH, 'utf8');

const BUSINESS_KINDS = [
  'checkout_completed_no_user',
  'checkout_unknown_price',
  'subscription_no_user',
  'subscription_unknown_price',
  'invoice_paid_no_user',
];

/* ── the email itself ──────────────────────────────────────────────── */

test('buildAlertHtml renders a business failure distinctly from a server error', () => {
  const biz = buildAlertHtml({
    kind: 'business',
    title: 'Paid checkout with no matching user',
    message: 'x',
  });
  assert.match(biz, /Business failure/);
  assert.doesNotMatch(biz, /Server error/, 'a business alert must not be labelled a server error');
  assert.match(biz, /Paid checkout with no matching user/);

  const srv = buildAlertHtml({ status: 500, method: 'POST', path: '/x', message: 'y' });
  assert.match(srv, /Server error/);
  assert.doesNotMatch(srv, /Business failure/, 'a server error must not be labelled a business failure');
});

test('a business alert escapes its content instead of injecting it', () => {
  const html = buildAlertHtml({ kind: 'business', title: '<script>alert(1)</script>', message: 'm' });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('a business alert carries the context needed to act on it', () => {
  const html = buildAlertHtml({
    kind: 'business',
    title: 'Subscription with an unmapped price',
    message: 'price_x maps to no tier',
    userEmail: 'owner@example.com',
    tier: 'agency_starter',
    subjectRef: 'sub_123',
  });
  assert.match(html, /price_x maps to no tier/);
  assert.match(html, /owner@example\.com/);
  assert.match(html, /agency_starter/);
  assert.match(html, /admin\/monitoring/);
});

/* ── the alerter never throws ──────────────────────────────────────── */

test('a business alert without a kind is refused rather than guessed', async () => {
  const r = await alertOnBusinessFailure({});
  assert.equal(r.sent, false);
  assert.equal(r.reason, 'no_kind');

  const r2 = await alertOnBusinessFailure();
  assert.equal(r2.sent, false);
  assert.equal(r2.reason, 'no_kind');
});

test('a business alert never throws and reports why it was suppressed', async () => {
  _resetThrottle();
  const r = await alertOnBusinessFailure({ kind: 'unit_test_kind', message: 'x' });
  assert.equal(r.sent, false);
  assert.ok(
    ['no_api_key', 'throttled'].includes(r.reason),
    `unexpected suppression reason: ${r.reason}`
  );
  _resetThrottle();
});

test('alerting failure can never break the request path', async () => {
  // Even given hostile input the call resolves rather than rejects.
  const r = await alertOnBusinessFailure({ kind: 'unit_test_hostile', message: { bad: true } });
  assert.equal(typeof r.sent, 'boolean');
  _resetThrottle();
});

/* ── the webhook must actually raise, not merely log ───────────────── */

test('every silent-access-loss branch raises a business alert', () => {
  for (const kind of BUSINESS_KINDS) {
    assert.match(
      stripeSrc,
      new RegExp(`kind: '${kind}'`),
      `stripe webhook never raises ${kind}`
    );
  }
});

test('the alert sits in the same block as the log line it accompanies', () => {
  // Line-aware: find each logStripeEvent that reports an access loss and
  // require an alertOnBusinessFailure call within the next few lines. A
  // plain substring search could match a comment describing the absence.
  const lines = stripeSrc.split('\n');
  const logIndexes = [];
  lines.forEach((l, i) => {
    if (
      /logStripeEvent\(event,\s*(null|user\.id)/.test(l) &&
      /no matching user|unknown price|no user for/.test(l)
    ) {
      logIndexes.push(i);
    }
  });
  assert.ok(
    logIndexes.length >= 5,
    `expected at least 5 access-loss log lines, found ${logIndexes.length}`
  );
  for (const i of logIndexes) {
    const window = lines.slice(i, i + 14).join('\n');
    assert.match(window, /alertOnBusinessFailure\(\{/, `no business alert follows line ${i + 1}`);
  }
});

test('an access-loss branch still answers 200 so Stripe does not retry', () => {
  const lines = stripeSrc.split('\n');
  const alertIndexes = [];
  lines.forEach((l, i) => {
    if (/alertOnBusinessFailure\(\{/.test(l)) alertIndexes.push(i);
  });
  assert.equal(alertIndexes.length, 5, `expected 5 wired branches, found ${alertIndexes.length}`);
  for (const i of alertIndexes) {
    const window = lines.slice(i, i + 14).join('\n');
    assert.match(window, /res\.status\(200\)/, `branch at line ${i + 1} does not answer 200`);
    assert.doesNotMatch(window, /res\.status\(5\d\d\)/, `branch at line ${i + 1} answers a 5xx`);
  }
});

/* ── suppression must be LOUD, never silent ────────────────────────── */

test('isAlertingConfigured reports readiness as booleans, never values', () => {
  const saved = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = 'secret-value-that-must-not-leak';

  const cfg = isAlertingConfigured();

  assert.equal(cfg.brevoConfigured, true);
  assert.equal(typeof cfg.recipientConfigured, 'boolean');
  assert.equal(typeof cfg.defaultsToFounder, 'boolean');
  assert.doesNotMatch(
    JSON.stringify(cfg),
    /secret-value-that-must-not-leak/,
    'the configuration probe must never return the key itself'
  );

  if (saved === undefined) delete process.env.BREVO_API_KEY;
  else process.env.BREVO_API_KEY = saved;
});

test('isAlertingConfigured tells the truth when the key is absent', () => {
  const saved = process.env.BREVO_API_KEY;
  delete process.env.BREVO_API_KEY;

  assert.equal(isAlertingConfigured().brevoConfigured, false);

  if (saved !== undefined) process.env.BREVO_API_KEY = saved;
});

test('a suppressed business alert logs at ERROR level with the reason and the kind', async () => {
  // The whole point: a missing key must not be able to swallow a checkout
  // failure quietly. The log line has to carry enough to act on.
  const savedKey = process.env.BREVO_API_KEY;
  delete process.env.BREVO_API_KEY;

  const captured = [];
  const realError = console.error;
  console.error = (...args) => { captured.push(args.map(String).join(' ')); };

  let result;
  try {
    result = await alertOnBusinessFailure({
      kind: 'checkout_completed_no_user',
      subjectRef: 'cs_test_123',
      message: 'paid but received no access',
    });
  } finally {
    console.error = realError;
    if (savedKey !== undefined) process.env.BREVO_API_KEY = savedKey;
  }

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'no_api_key');

  const line = captured.join('\n');
  assert.match(line, /SUPPRESSED/, 'the log must say the alert was suppressed');
  assert.match(line, /no_api_key/, 'the log must name the reason');
  assert.match(
    line,
    /checkout_completed_no_user/,
    'the log must name the kind so a suppressed checkout failure is actionable'
  );
  assert.match(line, /cs_test_123/, 'the log must carry the subject ref');
});

test('a suppressed alert is never reported as sent', async () => {
  const savedKey = process.env.BREVO_API_KEY;
  delete process.env.BREVO_API_KEY;
  const realError = console.error;
  console.error = () => {};

  try {
    const r = await alertOnBusinessFailure({ kind: 'checkout_unknown_price', message: 'x' });
    assert.notEqual(r.sent, true, 'a suppressed alert must never claim to have been sent');
  } finally {
    console.error = realError;
    if (savedKey !== undefined) process.env.BREVO_API_KEY = savedKey;
  }
});
