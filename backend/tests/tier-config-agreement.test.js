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

test('the Founding Member card does not claim features the lifetime tier lacks', async () => {
  // The card said "Everything in Starter, forever" while listing "Funder
  // alignment insights" and "Grant Fit Score" — neither of which TIERS.lifetime
  // grants. It is a hybrid tier, so it must not borrow a tier name either:
  // calling it "Pro" would imply team seats, shared workspace, NY funder
  // intelligence and document uploads, all of which it withholds.
  const { TIERS } = await frontendTiersPromise;
  const granted = TIERS.lifetime.features;
  const card = fs.readFileSync(path.join(REPO, 'src', 'components', 'PricingPage.jsx'), 'utf8');

  const start = card.indexOf('const LIFETIME_FEATURES');
  const end = card.indexOf('function CheckIcon');
  assert.ok(start !== -1 && end > start, 'could not isolate the Founding Member card block');
  const block = card.slice(start, end);

  const CLAIMS = [
    ['funder_alignment', /Funder alignment/i],
    ['grant_fit_score', /Grant Fit Score/i],
    ['compliance_checks', /Compliance checks/i],
  ];
  for (const [key, label] of CLAIMS) {
    if (!granted.includes(key)) {
      assert.doesNotMatch(
        block,
        label,
        `the card claims "${key}", which TIERS.lifetime does not grant`
      );
    }
  }

  assert.doesNotMatch(
    block,
    /Everything in (Starter|Pro)/,
    'the lifetime tier is a hybrid — it must not be described as a copy of another tier'
  );
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
