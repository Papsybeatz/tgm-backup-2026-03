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

/* ─────────────── the retired tiers ─────────────── */

test('the retired tiers are gone from the pricing page', () => {
  // The $499 Founding Member tier and the $299 Agency+ tier are no longer sold.
  // Both stay grandfathered in the configs so existing accounts keep access, but
  // a card for either would put a product back on sale that nobody can buy.
  //
  // This replaces a test that pinned the Founding Member card's contents. That
  // test read the block between two constants, so it would have failed on a
  // rename rather than on the real problem, and it cannot outlive the card.
  const card = fs.readFileSync(path.join(REPO, 'src', 'components', 'PricingPage.jsx'), 'utf8');
  assert.doesNotMatch(card, /Founding Member/i, 'the Founding Member card is still on the pricing page');
  assert.doesNotMatch(card, /\$499/, 'the $499 lifetime price is still on the pricing page');
  assert.doesNotMatch(card, /Agency\+/, 'the retired Agency+ tier is still on the pricing page');
  assert.doesNotMatch(card, /\$299/, 'the $299 Agency+ price is still on the pricing page');
  // Display names must come from the config, not be retyped on the page.
  assert.match(card, /from '\.\.\/config\/tiers'/, 'the page must import the tier config');
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
