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
const path = require('node:path');

const TIERS_PATH = path.join(__dirname, '..', '..', 'src', 'config', 'tiers.js');
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
