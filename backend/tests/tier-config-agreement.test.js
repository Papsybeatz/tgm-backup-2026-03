/**
 * Pins the frontend tier config (src/config/tiers.js, ESM) and the backend
 * enforcement config (backend/middleware/tierAuth.js, CJS) to agree on limits.
 *
 * Why this exists: the frontend advertised Starter as `drafts: 100` while the
 * backend enforced `drafts: Infinity`. The pricing page said "Unlimited drafts"
 * and the backend agreed, so the marketing copy was safe — but the two configs
 * disagreed, and a future gate reading the frontend value could have silently
 * capped a paying customer.
 *
 * Both configs are imported for real rather than grepped, so a phrase split
 * across a line break cannot make this pass vacuously.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const TIERS_PATH = path.join(REPO, 'src', 'config', 'tiers.js');
const frontendTiersPromise = import(TIERS_PATH);
const { TIERS: BACKEND_TIERS } = require('../middleware/tierAuth.js');

const TIER_KEYS = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];
const COMPARED_LIMITS = ['drafts', 'scoring', 'matching', 'teamSeats', 'clientFolders'];

test('frontend and backend agree on every shared tier limit', async () => {
  const { TIERS: FRONTEND_TIERS } = await frontendTiersPromise;
  for (const key of TIER_KEYS) {
    assert.ok(FRONTEND_TIERS[key], `frontend config is missing tier "${key}"`);
    assert.ok(BACKEND_TIERS[key], `backend config is missing tier "${key}"`);
    const fe = FRONTEND_TIERS[key].limits || {};
    const be = BACKEND_TIERS[key].limits || {};
    for (const field of COMPARED_LIMITS) {
      if (!(field in fe) || !(field in be)) continue;
      assert.equal(
        fe[field],
        be[field],
        `tier "${key}" limit "${field}" disagrees: frontend=${fe[field]} backend=${be[field]}`
      );
    }
  }
});

test('starter drafts are unlimited in BOTH configs (regression pin)', async () => {
  const { TIERS: FRONTEND_TIERS } = await frontendTiersPromise;
  assert.equal(
    FRONTEND_TIERS.starter.limits.drafts,
    Infinity,
    'frontend starter drafts must be unlimited, not a finite number'
  );
  assert.equal(
    BACKEND_TIERS.starter.limits.drafts,
    Infinity,
    'backend starter drafts must be unlimited'
  );
});

test('the limit comparison is not vacuous', async () => {
  const { TIERS: FRONTEND_TIERS } = await frontendTiersPromise;
  let compared = 0;
  for (const key of TIER_KEYS) {
    const fe = (FRONTEND_TIERS[key] && FRONTEND_TIERS[key].limits) || {};
    const be = (BACKEND_TIERS[key] && BACKEND_TIERS[key].limits) || {};
    for (const field of COMPARED_LIMITS) if (field in fe && field in be) compared++;
  }
  assert.ok(compared >= 12, `expected at least 12 comparable limit fields, found ${compared}`);
});

/* ─────────────── the Founding Member card ─────────────── */

test('the Founding Member card claims only what the product actually does', async () => {
  // The card is a $499 promise, and it used to sell things that do not exist:
  // unlimited funder matching (POST /api/match → 501), advanced analytics
  // (GET /api/analytics → 501), reviewer simulation, a grant calendar, priority
  // AI processing, a template library and a Founding Member badge.
  //
  // A card describes what the product does; TIERS.*.features describes what an
  // upgrade unlocks. Those are different lists, so each claim is checked against
  // the capability itself rather than against the tier's feature array.
  const { TIERS } = await frontendTiersPromise;
  const granted = TIERS.lifetime.features;
  const card = fs.readFileSync(path.join(REPO, 'src', 'components', 'PricingPage.jsx'), 'utf8');

  const start = card.indexOf('const LIFETIME_FEATURES');
  const end = card.indexOf('function CheckIcon');
  assert.ok(start !== -1 && end > start, 'could not isolate the Founding Member card block');
  const block = card.slice(start, end);

  // It must not sell anything that is not built.
  const NOT_BUILT_CLAIMS = [
    [/Unlimited funder matching/i, 'funder matching is not built (POST /api/match → 501)'],
    [/Advanced analytics/i, 'advanced analytics is not built (GET /api/analytics → 501)'],
    [/Reviewer simulation/i, 'reviewer simulation is not built'],
    [/Grant calendar/i, 'the grant calendar is not built'],
    [/Priority AI processing/i, 'AI is not prioritised by tier'],
    [/Template library/i, 'the template library is not built'],
    [/badge and certificate/i, 'no badge or certificate is rendered anywhere'],
  ];
  for (const [label, why] of NOT_BUILT_CLAIMS) {
    assert.doesNotMatch(block, label, `the card claims something unbuilt: ${why}`);
  }

  // The scoring insights it names are produced by the Checkmate engine, which
  // computes them for every tier — so they are evidence-checked against the
  // engine, not against TIERS.lifetime.features (they are not tier features).
  const SCORING_INSIGHTS = [
    [/Funder alignment/i, /criteria\.alignment/, 'funder alignment'],
    [/Grant Fit Score/i, /overall/, 'a grant fit score'],
    [/Missing components/i, /missingComponents/, 'missing components'],
    [/Compliance checks/i, /criteria\.compliance/, 'compliance checks'],
  ];
  const scoring = fs.readFileSync(
    path.join(REPO, 'backend', 'agents', 'steve', 'scoring.js'),
    'utf8'
  );
  for (const [label, evidence, name] of SCORING_INSIGHTS) {
    if (label.test(block)) {
      assert.match(
        scoring,
        evidence,
        `the card claims ${name}, but the scoring engine does not produce it`
      );
    }
  }

  // "Everything in Starter" is honest only while the tier really is a superset.
  if (/Everything in Starter/.test(block)) {
    const missing = TIERS.starter.features.filter((f) => !granted.includes(f));
    assert.deepEqual(
      missing,
      [],
      `the card says "Everything in Starter" but lifetime lacks: ${missing.join(', ')}`
    );
  }

  // It must never claim Pro: lifetime has no seats, shared workspace, NY funder
  // intelligence or document uploads.
  assert.doesNotMatch(block, /Everything in Pro/, 'lifetime is not a Pro superset');
});

test('the lifetime tier is a superset of starter in BOTH configs', async () => {
  // A $499 lifetime deal must not withhold features from the $29/mo plan. Both
  // configs are checked, because the frontend gates the UI and the backend
  // enforces the API — fixing one alone leaves the two disagreeing.
  const { TIERS: FRONTEND_TIERS } = await frontendTiersPromise;
  for (const [name, TIERS] of [['frontend', FRONTEND_TIERS], ['backend', BACKEND_TIERS]]) {
    const missing = TIERS.starter.features.filter((f) => !TIERS.lifetime.features.includes(f));
    assert.deepEqual(
      missing,
      [],
      `${name} lifetime tier is missing starter features: ${missing.join(', ')}`
    );
  }
});

test('no file uses a tiers.js helper without importing it', () => {
  // There is no linter in this repo, so nothing caught this: UnifiedDashboard
  // called tierAtLeast() on the /dashboard route without importing it. The
  // minifier left the name unrenamed because it resolved as a free variable, so
  // the build stayed green and the crash only appeared at runtime on a core
  // route. Comments are stripped first — a mention inside a comment is not a use.
  const HELPERS = [
    'TIERS', 'hasFeature', 'getDashboardModules', 'getTierLimits',
    'isWithinLimit', 'tierAtLeast', 'getTierGates',
  ];
  const SRC = path.join(REPO, 'src');
  const offenders = [];

  const stripComments = (t) =>
    t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full);
        continue;
      }
      if (!/\.(jsx?|tsx?)$/.test(entry.name)) continue;
      if (full.endsWith(path.join('config', 'tiers.js'))) continue;

      const text = stripComments(fs.readFileSync(full, 'utf8'));
      const importStatements = text.match(/import[\s\S]*?from\s*['"][^'"]+['"]/g) || [];

      for (const name of HELPERS) {
        if (!new RegExp(`(?<![\\w.$])${name}(?![\\w$])`).test(text)) continue;
        const imported = importStatements.some((s) => new RegExp(`\\b${name}\\b`).test(s));
        const declared = new RegExp(`(?:function|class|const|let|var)\\s+${name}\\b`).test(text);
        if (!imported && !declared) offenders.push(`${path.relative(REPO, full)} uses ${name}`);
      }
    }
  };

  walk(SRC);
  assert.deepEqual(offenders, [], `tier helpers used without an import:\n${offenders.join('\n')}`);
});

test('the lifetime tier grants no team seats in either config', async () => {
  // The frontend advertised teamSeats: 1 while backend/routes/teamInvites.js
  // seatCapFor() reads a missing value as none, so a lifetime user was shown a
  // seat the API would refuse.
  const { TIERS: FRONTEND_TIERS } = await frontendTiersPromise;
  assert.equal(FRONTEND_TIERS.lifetime.limits.teamSeats, 0, 'frontend lifetime must grant no seats');
  assert.equal(BACKEND_TIERS.lifetime.limits.teamSeats, 0, 'backend lifetime must grant no seats');
});

/* ─────────────── funder application limits ─────────────── */

test('published funder app limits match the backend default', () => {
  // The tier cards said 150 / 1,000 applications per cycle while the request
  // form said 50 / 500, so one page showed two products. The backend is the
  // authority, and publishing a higher number than it grants is an overpromise.
  const cfg = fs.readFileSync(path.join(REPO, 'src', 'config', 'funderAppLimits.js'), 'utf8');
  const pilot = Number(cfg.match(/pilot:\s*(\d+)/)[1]);
  const scale = Number(cfg.match(/scale:\s*(\d+)/)[1]);

  const checkout = fs.readFileSync(path.join(REPO, 'backend', 'routes', 'checkout.js'), 'utf8');
  const fallback = checkout.match(/planKey === 'funder_pilot' \? (\d+) : (\d+)/);
  assert.ok(fallback, 'could not find the funder checkout fallback to compare against');

  assert.equal(pilot, Number(fallback[1]), 'published pilot limit must equal the backend default');
  assert.equal(scale, Number(fallback[2]), 'published scale limit must equal the backend default');

  const page = fs.readFileSync(path.join(REPO, 'src', 'components', 'FunderApiLandingPage.jsx'), 'utf8');
  assert.match(page, /FUNDER_APP_LIMITS\.pilot/, 'the tier cards must read the shared limit');
  assert.match(page, /FUNDER_APP_LIMITS\.scale/, 'the tier cards must read the shared limit');
  assert.doesNotMatch(
    page,
    /150 applications\/cycle|1,000 applications\/cycle/,
    'stale hard-coded funder limits are still on the page'
  );
});
