/**
 * /api/ai/* endpoint gates.
 * ----------------------------------------------------------------------------
 * These four endpoints shipped with only `requireAuth`, so any logged-in free
 * user could call full AI drafting directly. The UI did not call them, so it was
 * latent rather than live — but it contradicted "Starter = full AI drafting",
 * and the pricing page advertises basic AI (brainstorm, basic rewrite) on Free.
 *
 * Run: cd backend && npm run test:ai-gates
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { hasFeature } = require('../middleware/tierAuth');

const AI_SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ai.js'), 'utf8');

// Full AI drafting is Starter. Basic AI (brainstorm + basic rewrite) is Free.
const EXPECTED_GATE = {
  '/draft': 'draft_unlimited',
  '/improve': 'draft_unlimited',
  '/brainstorm': 'draft_basic',
  '/rewrite-basic': 'draft_basic',
};

function gateFor(routePath) {
  const re = new RegExp(
    "router\\.(?:post|get)\\(\\s*['\"]" + routePath.replace(/-/g, '\\-') + "['\"]\\s*," +
    "\\s*requireAuth\\s*,\\s*requireFeature\\(\\s*['\"]([a-z_]+)['\"]\\s*\\)",
  );
  const m = AI_SRC.match(re);
  return m ? m[1] : null;
}

function routePathsWithAuth() {
  return [...AI_SRC.matchAll(/router\.(?:post|get)\(\s*['"]([^'"]+)['"]\s*,\s*requireAuth/g)]
    .map((m) => m[1]);
}

/* ── every AI endpoint carries a tier gate ────────────────────────────────── */

test('no AI endpoint is left with only requireAuth', () => {
  const routes = routePathsWithAuth();
  assert.ok(routes.length > 0, 'expected to find AI routes');
  for (const p of routes) {
    assert.ok(gateFor(p), `${p} has requireAuth but no requireFeature — it is ungated`);
  }
});

test('each AI endpoint requires the tier its feature belongs to', () => {
  for (const [p, feature] of Object.entries(EXPECTED_GATE)) {
    assert.equal(gateFor(p), feature, `${p} must require ${feature}`);
  }
});

/* ── the tier split the pricing page promises ─────────────────────────────── */

test('full AI drafting is Starter and above, never Free', () => {
  assert.equal(hasFeature('free', 'draft_unlimited'), false, 'Free must not get full AI drafting');
  for (const tier of ['starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime']) {
    assert.equal(hasFeature(tier, 'draft_unlimited'), true, `${tier} must get full AI drafting`);
  }
});

test('basic AI stays available on Free', () => {
  // The landing page and the free tier both promise basic AI assistance. If this
  // flips, Free loses the teaser that makes the upgrade make sense.
  assert.equal(hasFeature('free', 'draft_basic'), true);
});

test('the gate feature keys actually exist on some tier', () => {
  const tiers = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];
  for (const feature of Object.values(EXPECTED_GATE)) {
    const held = tiers.some((t) => hasFeature(t, feature));
    assert.ok(held, `${feature} is not granted by any tier — the gate would lock everyone out`);
  }
});

test('requireFeature is imported from the tier middleware', () => {
  assert.match(AI_SRC, /require\(['"][^'"]*middleware\/tierAuth['"]\)/);
  assert.match(AI_SRC, /\brequireFeature\b/);
});
