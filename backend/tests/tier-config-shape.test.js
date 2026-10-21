/**
 * The shape of the tier config.
 * ----------------------------------------------------------------------------
 * `TIERS[key].dashboardModules` used to describe a tier-aware dashboard — free
 * showed `['draft']`, Pro showed `['draft','scoring','matching','analytics',
 * 'calendar']`, and so on. Nothing read it. Not the dashboard, not a gate, not a
 * test. `getDashboardModules()` was exported and imported by nobody.
 *
 * That is worse than dead code: it is a config that describes a product that
 * does not exist. Someone reading `pro.dashboardModules` would reasonably think
 * the dashboard changes at Pro, and then either build against a layout contract
 * that was never implemented, or — worse — quote it to a customer.
 *
 * It was removed. The real entitlement gates live in the API
 * (backend/middleware/tierAuth.js `requireFeature`), which is stronger than
 * hiding a module in the UI anyway. This test keeps a dead key from creeping
 * back: every tier carries exactly the four fields something actually uses.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const TIERS_PATH = path.join(REPO, 'src', 'config', 'tiers.js');

const TIER_KEYS = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];

// The fields a tier may carry. `key` and `name` label it, `features` is read by
// hasFeature(), `limits` by getTierLimits() and by the backend agreement test.
const ALLOWED_FIELDS = ['key', 'name', 'features', 'limits'];

test('every tier carries only fields something reads', async () => {
  const { TIERS } = await import(TIERS_PATH);
  for (const tierKey of TIER_KEYS) {
    const tier = TIERS[tierKey];
    assert.ok(tier, `tier "${tierKey}" is missing`);
    const unknown = Object.keys(tier).filter((f) => !ALLOWED_FIELDS.includes(f));
    assert.deepEqual(
      unknown,
      [],
      `tier "${tierKey}" carries ${unknown.join(', ')}, which nothing reads. ` +
        'Either wire it to a real component or remove it — a config that describes ' +
        'a product you do not ship gets mistaken for one.',
    );
  }
});

test('the dashboardModules field is gone, and stays gone', async () => {
  const { TIERS } = await import(TIERS_PATH);
  for (const tierKey of TIER_KEYS) {
    assert.equal(
      TIERS[tierKey].dashboardModules,
      undefined,
      `tier "${tierKey}" reintroduced dashboardModules, which no component reads`,
    );
  }
});

test('the dead module accessor is no longer exported', async () => {
  const mod = await import(TIERS_PATH);
  assert.equal(
    typeof mod.getDashboardModules,
    'undefined',
    'getDashboardModules() was removed because nothing imported it; do not restore it without a consumer',
  );
});

test('each tier key matches the slot it sits in', async () => {
  const { TIERS } = await import(TIERS_PATH);
  for (const tierKey of TIER_KEYS) {
    assert.equal(TIERS[tierKey].key, tierKey, `TIERS.${tierKey}.key disagrees with its slot`);
  }
});

test('the surviving fields keep their shapes', async () => {
  const { TIERS } = await import(TIERS_PATH);
  for (const tierKey of TIER_KEYS) {
    const tier = TIERS[tierKey];
    assert.equal(typeof tier.name, 'string');
    assert.ok(tier.name.trim().length > 0, `tier "${tierKey}" needs a display name`);
    assert.ok(Array.isArray(tier.features), `tier "${tierKey}" features must be an array`);
    assert.ok(
      tier.features.every((f) => typeof f === 'string'),
      `tier "${tierKey}" features must all be strings`,
    );
    assert.equal(typeof tier.limits, 'object');
    assert.ok(tier.limits !== null, `tier "${tierKey}" needs limits`);
  }
});
