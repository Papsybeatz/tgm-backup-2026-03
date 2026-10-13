/**
 * The funnel events must never carry the letter, the file name, or the email.
 * ----------------------------------------------------------------------------
 * The checkup is anonymous and the letter is the most sensitive thing the
 * product touches. "We don't send it" is a promise; this file is the proof.
 *
 * It exercises the REAL client module, not a copy of its rule. `src/lib/
 * analytics.js` is an ES module that Vite compiles for the browser, and the
 * backend suite is CommonJS, so the source is read and imported as a temporary
 * `.mjs`. `import.meta.env` is undefined under Node, which the module already
 * handles, so what runs here is the same code that runs in the browser.
 *
 * Both copies of the rule — client and server — are then fed the same hostile
 * inputs and must agree. They are duplicated by necessity (the client one reads
 * Vite's `import.meta.env` and cannot be required from Node), so a parity test
 * is what stops them drifting apart into two different privacy policies.
 *
 * Run: cd backend && node --test tests/analytics-privacy.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', '..');
const CLIENT_SRC = path.join(ROOT, 'src', 'lib', 'analytics.js');

const server = require('../utils/analytics');

// A real-shaped weak grant letter, and a real-shaped address. These are the
// things that must never appear in a payload.
const LETTER_TEXT = `Dear Program Officer,
Bright Future Youth Collective respectfully requests $75,000 to expand our
after-school STEM mentoring program serving 200 students in East Buffalo.
We are the only provider in the region and we have a proven track record.`;
const EMAIL = 'program.officer@brightfutureyouth.org';
const FILENAME = 'bright-future-weak-letter.txt';

/** Load the real client module as ESM so the test exercises shipped code. */
async function loadClientModule() {
  const source = fs.readFileSync(CLIENT_SRC, 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgm-analytics-'));
  const file = path.join(dir, 'analytics.mjs');
  fs.writeFileSync(file, source, 'utf8');
  return import(pathToFileURL(file).href);
}

const EVENTS = [
  'checkup_view',
  'letter_uploaded',
  'rewrite_clicked',
  'rewrite_shown',
  'signup_clicked',
  'signup_completed',
  'checkout_started',
  'subscribed',
];

// ---------------------------------------------------------------------------
// The eight events, each fed everything that must not leave
// ---------------------------------------------------------------------------

test('no event payload contains letter text, an email, or a file name', async () => {
  const client = await loadClientModule();
  const captured = [];
  client.setAnalyticsSink((payload) => captured.push(payload));

  for (const event of EVENTS) {
    client.track(event, {
      // The plausible-but-wrong keys a future caller might reach for.
      letterText: LETTER_TEXT,
      draft: LETTER_TEXT,
      content: LETTER_TEXT,
      text: LETTER_TEXT,
      body: LETTER_TEXT,
      email: EMAIL,
      filename: FILENAME,
      file: FILENAME,
      name: FILENAME,
      // And the real ones, with hostile values smuggled inside.
      source: LETTER_TEXT,
      reason: EMAIL,
      context: FILENAME,
      score: 51,
    });
  }

  assert.equal(captured.length, EVENTS.length, 'every event must be emitted');

  const wire = JSON.stringify(captured);
  for (const secret of [LETTER_TEXT, EMAIL, FILENAME, 'Bright Future']) {
    assert.ok(
      !wire.includes(secret),
      `payload leaked: ${secret.slice(0, 40)}`
    );
  }

  // The honest properties still get through.
  for (const payload of captured) {
    assert.equal(payload.properties.score, 51);
  }
});

test('an unlisted key is dropped by the allowlist, not by the name pass', async () => {
  const client = await loadClientModule();
  const captured = [];
  client.setAnalyticsSink((payload) => captured.push(payload));

  // The keys are chosen NOT to match FORBIDDEN_KEY, and the values are
  // deliberately token-shaped rather than prose — a short organisation name is
  // exactly the kind of thing a caller might attach. Both choices matter:
  // a prose value would be dropped by the value guard, and a name like
  // `letterText` would be dropped by the name pass, so either would let this
  // test pass while the allowlist was gone. Three overlapping layers each cover
  // for the others, which is the point — but only if each is proven alone.
  client.track('letter_uploaded', {
    proposal: 'BrightFutureYouth',
    submission: 'EastBuffaloSTEM',
    document: 'BuffaloNY14201',
    raw: 'ProgramOfficerName',
    input: 'grant-application-2026',
    score: 51,
  });

  assert.deepEqual(captured[0].properties, { score: 51 });
  assert.ok(!JSON.stringify(captured).includes('BrightFutureYouth'));
  assert.ok(!JSON.stringify(captured).includes('EastBuffaloSTEM'));
});

test('an allowed key cannot be used as a carrier for a letter', async () => {
  const client = await loadClientModule();
  const captured = [];
  client.setAnalyticsSink((payload) => captured.push(payload));

  // `source` is legitimately allowed, so it is the one place a letter could
  // ride out under a permitted key.
  client.track('signup_clicked', { source: LETTER_TEXT, band: 'Needs Work' });

  assert.equal(
    captured[0].properties.source,
    undefined,
    'prose under an allowed key must be dropped, not truncated'
  );
  // A genuine label still passes, so the rule is a guard and not a mute.
  assert.equal(captured[0].properties.band, 'Needs Work');
  assert.ok(!JSON.stringify(captured).includes('East Buffalo'));
});

test('a value that reads as an address is dropped whatever key it arrives under', async () => {
  const client = await loadClientModule();
  const captured = [];
  client.setAnalyticsSink((payload) => captured.push(payload));

  client.track('signup_clicked', { source: EMAIL, band: 'Needs Work' });

  assert.deepEqual(captured[0].properties, { band: 'Needs Work' });
  assert.ok(!JSON.stringify(captured).includes(EMAIL));
});

test('objects and arrays are dropped rather than serialised', async () => {
  const client = await loadClientModule();
  const captured = [];
  client.setAnalyticsSink((payload) => captured.push(payload));

  client.track('letter_uploaded', {
    score: { nested: LETTER_TEXT },
    words: [LETTER_TEXT],
    band: 51,
  });

  assert.deepEqual(captured[0].properties, { band: 51 });
});

test('tracking never throws, whatever it is handed', async () => {
  const client = await loadClientModule();
  client.setAnalyticsSink(() => {});

  assert.doesNotThrow(() => client.track('checkup_view'));
  assert.doesNotThrow(() => client.track('checkup_view', null));
  assert.doesNotThrow(() => client.track('checkup_view', LETTER_TEXT));
  assert.doesNotThrow(() => client.track('checkup_view', { score: NaN }));
  assert.doesNotThrow(() => client.track('checkup_view', { score: Infinity }));
  assert.doesNotThrow(() => client.track('', { score: 1 }));
  assert.doesNotThrow(() => client.track(null));
});

test('a throwing sink cannot break the page', async () => {
  const client = await loadClientModule();
  client.setAnalyticsSink(() => {
    throw new Error('provider exploded');
  });

  // The checkup page calls this from a render path. A tracker outage must not
  // become a scoring outage.
  assert.doesNotThrow(() => client.track('checkup_view'));
  client.setAnalyticsSink(null);
});

test('non-finite numbers are dropped, not sent as null or NaN', async () => {
  const client = await loadClientModule();
  const captured = [];
  client.setAnalyticsSink((payload) => captured.push(payload));

  client.track('letter_uploaded', { score: NaN, words: Infinity, delta: 0 });

  // Zero is a real value and must survive; NaN and Infinity must not.
  assert.deepEqual(captured[0].properties, { delta: 0 });
});

// ---------------------------------------------------------------------------
// The server event — where the email actually is in scope
// ---------------------------------------------------------------------------

test('the server sanitizer drops an email and a Stripe customer id', () => {
  const clean = server.sanitizeProps({
    email: EMAIL,
    customerId: 'cus_QXyZ123',
    userId: 42,
    tier: 'pro',
    priceId: 'price_1UOV3r64TrQMI3mIVWTA5hVy',
    letterText: LETTER_TEXT,
  });

  // `tier` and `priceId` are non-identifying and survive; the rest do not.
  assert.deepEqual(clean, {
    tier: 'pro',
    priceId: 'price_1UOV3r64TrQMI3mIVWTA5hVy',
  });
  assert.ok(!JSON.stringify(clean).includes(EMAIL));
  assert.ok(!JSON.stringify(clean).includes('cus_'));
});

test('trackSubscribed is inert without a key and never rejects', async () => {
  // No POSTHOG_API_KEY in the test environment, which is the intended default:
  // the event is wired but silent until a provider is configured.
  const result = await server.trackSubscribed({
    userId: 7,
    tier: 'pro',
    priceId: 'price_x',
    interval: 'recurring',
    context: 'checkout',
  });
  assert.equal(result, false);

  // And a missing user must not throw either.
  await assert.doesNotReject(() => server.trackSubscribed({ tier: 'pro' }));
});

// ---------------------------------------------------------------------------
// Parity — two copies of one policy, or two policies
// ---------------------------------------------------------------------------

test('the client and server rules agree on every hostile input', async () => {
  const client = await loadClientModule();

  const inputs = [
    { letterText: LETTER_TEXT },
    { email: EMAIL },
    { filename: FILENAME },
    { score: 51, words: 176, band: 'Needs Work' },
    { source: LETTER_TEXT },
    { source: EMAIL },
    { proposal: LETTER_TEXT },
    { submission: LETTER_TEXT },
    { proposal: 'BrightFutureYouth' },
    { document: 'BuffaloNY14201' },
    { band: 'Needs Work' },
    { context: 'checkup-unlock-panel' },
    { score: { nested: LETTER_TEXT } },
    { score: NaN, delta: 11 },
    { tier: 'pro', priceId: 'price_x', context: 'checkout' },
    { fromScore: 51, toScore: 62, delta: 11 },
    { customerId: 'cus_123', userId: 1 },
  ];

  for (const input of inputs) {
    assert.deepEqual(
      client.sanitizeProps(input),
      server.sanitizeProps(input),
      `client and server disagree on ${JSON.stringify(Object.keys(input))}`
    );
  }
});

test('the two allowlists are the same set', async () => {
  const client = await loadClientModule();

  assert.deepEqual(
    [...client.ALLOWED_PROPS].sort(),
    [...server.ALLOWED_PROPS].sort(),
    'a property allowed on one side and not the other is how a policy drifts'
  );
  assert.equal(
    client.FORBIDDEN_KEY.source,
    server.FORBIDDEN_KEY.source,
    'the forbidden-key rules must not diverge'
  );
});

test('every funnel event name is declared in one place', async () => {
  const client = await loadClientModule();

  assert.deepEqual(Object.values(client.FUNNEL_EVENTS).sort(), [...EVENTS].sort());
  // `subscribed` is the only server-emitted event, so it is the only one that
  // must not appear as a client call site.
  assert.ok(Object.values(client.FUNNEL_EVENTS).includes('subscribed'));
});
