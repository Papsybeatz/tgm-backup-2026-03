/**
 * Checkmate scoring gate — Model A.
 * ----------------------------------------------------------------------------
 * The paid unlock is the FIX, not the diagnosis. Free gets a real score and the
 * named gaps; Starter+ gets the recommended fixes. Free is also capped at 3
 * scores.
 *
 * This is the rule the pricing page and the marketing campaign both sell, so it
 * is enforced on the server. A signed-in free user can call /api/score directly,
 * which means a client-side lock is not a paywall.
 *
 * Run: cd backend && npm run test:score-gate
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { FREE_SCORE_LIMIT, SCORE_ACTION, checkScoreQuota, applyScoreGate } = require('../utils/scoreGate');
const { hasFeature } = require('../middleware/tierAuth');

const ROOT = path.join(__dirname, '..', '..');
const SERVER_SRC = fs.readFileSync(path.join(ROOT, 'backend', 'server.js'), 'utf8');
const tiersPromise = import(path.join(ROOT, 'src', 'config', 'tiers.js'));

/* ── the tier split: scoring_detailed is Starter+ ─────────────────────────── */

test('scoring_detailed belongs to Starter and above, never to Free', () => {
  assert.equal(hasFeature('free', 'scoring_detailed'), false, 'Free must not get the fixes');
  for (const tier of ['starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime']) {
    assert.equal(hasFeature(tier, 'scoring_detailed'), true, `${tier} must get scoring_detailed`);
  }
});

test('Free can still run the engine — the diagnosis is not the paywall', () => {
  // The teaser only works if Free actually gets a real score. If this ever
  // flips, the landing page has nothing to show and the funnel breaks.
  assert.equal(hasFeature('free', 'scoring_basic'), true);
  assert.equal(hasFeature('free', 'scoring_engine'), true);
});

/* ── the free-score cap ───────────────────────────────────────────────────── */

test('Free gets exactly six scores, and the seventh is refused', () => {
  // Six, not three: Free gets six daily uses so a visitor stays attached long
  // enough to convert. This number is the product decision, not an accident.
  assert.equal(FREE_SCORE_LIMIT, 6);

  for (const used of [0, 1, 2, 3, 4, 5]) {
    assert.equal(checkScoreQuota('free', used).allowed, true, `score ${used + 1} must be allowed`);
  }

  const seventh = checkScoreQuota('free', 6);
  assert.equal(seventh.allowed, false);
  assert.equal(seventh.reason, 'free_score_limit');
  assert.equal(seventh.remaining, 0);
});

test('the cap reports how many scores are left, counting down to zero', () => {
  assert.equal(checkScoreQuota('free', 0).remaining, 6);
  assert.equal(checkScoreQuota('free', 1).remaining, 5);
  assert.equal(checkScoreQuota('free', 2).remaining, 4);
});

test('paid tiers are unmetered', () => {
  for (const tier of ['starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime']) {
    assert.equal(checkScoreQuota(tier, 999).allowed, true, `${tier} must not be capped`);
  }
});

test('an unknown tier is metered as Free, not as a paid tier', () => {
  // A bad tier string must not buy unmetered scoring. This mirrors hasFeature,
  // which falls back to Free for an unrecognised tier.
  assert.equal(checkScoreQuota('not_a_tier', 999).allowed, false);
});

test('a nonsense usage count cannot unlock or falsely lock the cap', () => {
  // NaN / undefined must read as "zero used", not as "over the limit".
  assert.equal(checkScoreQuota('free', NaN).allowed, true);
  assert.equal(checkScoreQuota('free', undefined).allowed, true);
  assert.equal(checkScoreQuota('free', -5).used, 0);
});

/* ── the report gate: Free keeps the diagnosis, loses the fixes ───────────── */

test('Free keeps the score and gaps but receives no fixes', () => {
  const report = { score: 61, label: 'In Progress', criteria: { need: 40 }, weaknesses: ['Outcomes are not quantified'], fixes: ['Quantify at least one outcome.'] };
  const gated = applyScoreGate('free', report);

  assert.equal(gated.score, 61, 'the score itself must survive the gate');
  assert.deepEqual(gated.criteria, { need: 40 }, 'the criteria breakdown must survive');
  assert.deepEqual(gated.weaknesses, report.weaknesses, 'the named gaps must survive');
  assert.deepEqual(gated.fixes, [], 'Free must not receive the fixes');
  assert.equal(gated.fixesLocked, true);
});

test('Starter and above receive the fixes, unlocked', () => {
  const report = { score: 61, fixes: ['Quantify at least one outcome.'] };
  for (const tier of ['starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime']) {
    const gated = applyScoreGate(tier, report);
    assert.deepEqual(gated.fixes, report.fixes, `${tier} must receive the fixes`);
    assert.equal(gated.fixesLocked, false);
  }
});

/* ── the frontend cap and the backend cap must be the same number ─────────── */

test('the enforced Free cap matches the cap the pricing page advertises', async () => {
  const { TIERS } = await tiersPromise;
  assert.equal(
    TIERS.free.limits.scoring,
    FREE_SCORE_LIMIT,
    'src/config/tiers.js and utils/scoreGate.js disagree on the free score limit',
  );
});

/* ── the route actually enforces it ───────────────────────────────────────── */

test('/api/score checks the quota before scoring and returns 402 when exhausted', () => {
  const route = SERVER_SRC.slice(
    SERVER_SRC.indexOf("app.post('/api/score'"),
    SERVER_SRC.indexOf("app.get('/api/analytics'"),
  );

  assert.match(route, /checkScoreQuota\(/, 'the route must check the quota');
  assert.match(route, /res\.status\(402\)/, 'an exhausted free quota must return 402');
  assert.match(route, /prisma\.aiLog\.count\(/, 'the quota must be counted from the usage ledger');
  assert.match(route, new RegExp(`action:\\s*SCORE_ACTION`), 'the count must filter on the score action');
});

test('/api/score applies the gate and records the score in the ledger', () => {
  const route = SERVER_SRC.slice(
    SERVER_SRC.indexOf("app.post('/api/score'"),
    SERVER_SRC.indexOf("app.get('/api/analytics'"),
  );

  assert.match(route, /applyScoreGate\(/, 'the route must gate the report');
  assert.match(route, /fixesLocked/, 'the response must tell the UI the fixes are locked');
  assert.match(route, /logAiAction\(req\.user\.id,\s*SCORE_ACTION\)/, 'the score must be recorded for the next count');
});

test('the score action string is stable — the ledger depends on it', () => {
  assert.equal(SCORE_ACTION, 'score');
});
