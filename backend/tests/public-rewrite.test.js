/**
 * Public rewrite — the free funnel's "watch your score move".
 * ----------------------------------------------------------------------------
 * The hook only works if three things hold:
 *
 *   1. The rewrite is the SAME rewrite the product uses (one prompt source, not
 *      a second copy that drifts).
 *   2. The response leads with criteria-level movement, not a bare total — a
 *      single number rising reads as "you graded your own homework".
 *   3. The free allowance is enforced server-side, and the rewrite is scarcer
 *      than scoring (one per day), so the demo is free but the loop is not.
 *
 * Run: cd backend && node --test tests/public-rewrite.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildCriteriaDelta } = require('../utils/criteriaDelta');
const { rewriteText } = require('../services/rewrite');
const { ORDERLESS_CRITERIA } = require('../agents/steve/scoring');

const ROOT = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const ROUTE_SRC = read('backend', 'routes', 'publicScore.js');
const RATE_SRC = read('backend', 'middleware', 'rateLimit.js');
const AI_SRC = read('backend', 'routes', 'ai.js');
const REWRITE_SRC = read('backend', 'services', 'rewrite.js');

/* ── the delta is a measurement, not a number ─────────────────────────────── */

const BEFORE = {
  score: 46,
  criteria: { need: 60, completeness: 55, evidence: 40, outcomes: 46, budget: 50, compliance: 40 },
  criteriaDefs: ORDERLESS_CRITERIA,
};
const AFTER = {
  score: 72,
  criteria: { need: 74, completeness: 70, evidence: 68, outcomes: 74, budget: 66, compliance: 58 },
  criteriaDefs: ORDERLESS_CRITERIA,
};

test('the delta reports total movement and per-criterion movement', () => {
  const delta = buildCriteriaDelta(BEFORE, AFTER);
  assert.equal(delta.total, 26);
  assert.equal(delta.byCriterion.length, ORDERLESS_CRITERIA.length);

  const evidence = delta.byCriterion.find((c) => c.key === 'evidence');
  assert.deepEqual(
    { from: evidence.from, to: evidence.to, delta: evidence.delta },
    { from: 40, to: 68, delta: 28 },
    'a criteria-level move must be reported, not just the total',
  );
  assert.ok(evidence.label, 'each criterion carries its human label for the UI');
});

test('the delta never invents a criterion the rubric does not have', () => {
  const delta = buildCriteriaDelta(BEFORE, AFTER);
  const keys = delta.byCriterion.map((c) => c.key);
  assert.deepEqual(keys, ORDERLESS_CRITERIA.map((c) => c.key));
});

test('a missing criteria set degrades to zeros rather than throwing', () => {
  const delta = buildCriteriaDelta({ score: 10 }, { score: 20, criteriaDefs: ORDERLESS_CRITERIA });
  assert.equal(delta.total, 10);
  assert.ok(delta.byCriterion.every((c) => c.from === 0));
});

/* ── one prompt source, not two ───────────────────────────────────────────── */

test('the signed-in route and the funnel share one rewrite transport', () => {
  assert.match(
    AI_SRC,
    /require\('\.\.\/services\/rewrite'\)/,
    'ai.js must import the shared rewrite service',
  );
  assert.doesNotMatch(
    AI_SRC,
    /async function groqChat/,
    'ai.js must not keep its own copy of the transport',
  );
  assert.match(ROUTE_SRC, /require\('\.\.\/services\/rewrite'\)/);
});

test('the funnel does not carry its own prompt text', () => {
  // A prompt duplicated into the route is the drift this exists to prevent.
  assert.doesNotMatch(
    ROUTE_SRC,
    /You are a (basic rewrite|clarity rewrite|impact rewrite)/,
    'rewrite prompts must live in services/rewrite.js only',
  );
  assert.match(REWRITE_SRC, /proposal_improve/);
});

test('an unknown rewrite action is refused, not sent to the provider', async () => {
  await assert.rejects(
    () => rewriteText({ action: 'not_an_action', content: 'hello' }),
    (error) => error.code === 'INVALID_ACTION',
  );
});

/* ── the route: re-scores, diffs, and caps ────────────────────────────────── */

test('the rewrite route re-scores both drafts with the same engine', () => {
  assert.match(ROUTE_SRC, /router\.post\('\/rewrite'/);
  assert.match(ROUTE_SRC, /rewriteText\(/);
  assert.match(ROUTE_SRC, /buildCriteriaDelta\(/);
  // Two scoreDraft calls: the original and the rewrite. Scoring the rewrite is
  // what makes the delta honest.
  const calls = ROUTE_SRC.match(/scoreDraft\(/g) || [];
  assert.ok(calls.length >= 3, `expected scoreDraft in /score and twice in /rewrite, found ${calls.length}`);
});

test('the rewrite route is behind its own one-per-day limiter', () => {
  assert.match(
    ROUTE_SRC,
    /router\.post\('\/rewrite',\s*publicRewriteDailyLimiter/,
    'the rewrite route must be limited server-side',
  );
  const block = RATE_SRC.match(/publicRewriteDailyLimiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/);
  assert.ok(block, 'publicRewriteDailyLimiter definition not found');
  assert.equal(Number(block[0].match(/max:\s*(\d+)/)?.[1]), 1, 'the free rewrite is one per day');
  assert.match(block[0], /skipFailedRequests:\s*true/, 'a rejected upload must not burn the rewrite');
});

test('a missing provider fails loudly instead of echoing the original as a rewrite', () => {
  // Returning the unchanged document as a "rewrite" would be a silent lie, and
  // the whole funnel rests on the rewrite being real.
  assert.match(ROUTE_SRC, /NO_KEY/);
  assert.match(ROUTE_SRC, /503/);
});

test('the rewrite caps its input so one upload cannot blow the model context', () => {
  assert.match(ROUTE_SRC, /MAX_REWRITE_CHARS/);
  assert.match(ROUTE_SRC, /slice\(0, MAX_REWRITE_CHARS\)/);
});

test('the rewrite response states that nothing was stored', () => {
  const rewriteBlock = ROUTE_SRC.slice(ROUTE_SRC.indexOf("router.post('/rewrite'"));
  assert.match(rewriteBlock, /stored:\s*false/);
  assert.match(rewriteBlock, /originalText/);
  assert.match(rewriteBlock, /rewrittenText/);
  assert.match(rewriteBlock, /bandChange/);
});

/* ── the page is actually wired to the endpoint ───────────────────────────── */

const PAGE = read('src', 'components', 'PublicScorePage.jsx');

test('the funnel page calls the rewrite endpoint', () => {
  assert.match(PAGE, /\/api\/public\/rewrite/, 'the page must call the endpoint it is built for');
  assert.match(PAGE, /runRewrite/);
});

test('the page renders the delta, the criteria breakdown and the band change', () => {
  assert.match(PAGE, /rewrite\.delta\.total/);
  assert.match(PAGE, /rewrite\.delta\.byCriterion/);
  assert.match(PAGE, /rewrite\.bandChange/);
  assert.match(PAGE, /DeltaRow/);
});

test('the page shows the rewritten draft side by side with the original', () => {
  assert.match(PAGE, /rewrite\.originalText/);
  assert.match(PAGE, /rewrite\.rewrittenText/);
  assert.match(PAGE, /downloadText\(/, 'the rewritten draft must be downloadable');
});

test('the page no longer sells the rewrite as the paid unlock', () => {
  // The inversion: the rewrite IS the free demonstration. Starter sells
  // unlimited rewrites, not the first one.
  assert.doesNotMatch(PAGE, /line-by-line rewrite/i, 'the rewrite is no longer the paywall');
  assert.doesNotMatch(PAGE, /rewrite is unlocked on Starter/i, 'the rewrite is free now');
  assert.match(PAGE, /unlimited/i, 'the reframe must sell unlimited, not access');
});

test('the free allowance copy says six, not three', () => {
  assert.match(PAGE, /Six free scores/);
  assert.doesNotMatch(PAGE, /Three free scores/);
});
