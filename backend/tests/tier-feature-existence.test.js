/**
 * Guard: every feature a tier advertises must be backed by real code.
 *
 * Why this exists
 * ---------------
 * The tier configs carried 47 feature labels with nothing behind them. Three of
 * those pointed at endpoints that answered `501 Not Implemented`, one gated an
 * endpoint that had been retired (`410 Gone`), and several named capabilities
 * that only ever appeared in marketing copy. `/api/match` had earlier returned a
 * *false success* — "a paying customer was told matching ran when it never did."
 *
 * A tier is a price promise. Advertising a capability no code implements is a
 * false claim about the product, and it is the same defect class as telling a
 * user their score was capped when the cap never bound.
 *
 * Why a registry instead of a text search
 * ---------------------------------------
 * A plain "does this string appear somewhere?" search is not evidence. It was
 * satisfied by dead code under `_orphaned/`, by the marketing copy in
 * PricingPage.jsx, and by the 501 stubs themselves — the three things it most
 * needed to reject. So each feature must instead name the file that implements
 * it and a pattern that must match in that file. Adding a feature label now
 * requires naming the code behind it, and the test checks that code exists.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Feature -> the code that implements it. Each entry is [relative file, pattern];
 * the file must exist and the pattern must match its contents.
 *
 * A gate entry proves the feature is enforced on a live endpoint. The `export_*`
 * entries have no gate on purpose: export works on every tier, so it is listed
 * on every tier and is not what an upgrade buys.
 */
const EVIDENCE = {
  draft_basic: [['backend/routes/ai.js', /requireFeature\(\s*'draft_basic'\s*\)/]],
  draft_unlimited: [['backend/routes/ai.js', /requireFeature\(\s*'draft_unlimited'\s*\)/]],
  scoring_basic: [['backend/server.js', /requireFeature\(\s*'scoring_basic'\s*\)/]],
  scoring_detailed: [['backend/utils/scoreGate.js', /hasFeature\([^)]*'scoring_detailed'/]],
  version_history: [['backend/routes/drafts.js', /requireFeature\(\s*'version_history'\s*\)/]],
  email_delivery: [['backend/routes/drafts.js', /requireFeature\(\s*'email_delivery'\s*\)/]],
  client_folders: [['backend/routes/clients.js', /requireFeature\(\s*'client_folders'\s*\)/]],
  client_aware_steve: [['backend/routes/assistant.js', /hasFeature\([^)]*'client_aware_steve'/]],
  export_pdf: [['backend/routes/drafts.js', /export\.pdf/]],
  export_doc: [['backend/routes/drafts.js', /export\.docx/]],
};

/**
 * Capabilities that must not appear in a tier, each with the reason it was
 * removed. Re-adding one means deleting the reason — which is the point.
 */
const NOT_BUILT = [
  [/^matching_/, 'Funder matching is not built: POST /api/match returns 501 Not Implemented.'],
  [/^ny_/, 'NY funder intelligence and NY compliance rules are not built.'],
  [/^analytics_/, 'Advanced analytics is not built: GET /api/analytics returns 501 Not Implemented.'],
  [
    /^ai_rewrite$/,
    'The endpoint it gated, POST /api/agent/call, is retired (410 Gone). Steve drafts on every tier, so AI is not what a tier unlocks.',
  ],
  [
    /^(missing_components|compliance_checks|grant_fit_score|funder_alignment)$/,
    'The Checkmate scoring engine returns this to every tier, so it is not something a tier unlocks.',
  ],
];

/** Features advertised by the backend tier config (the source of truth). */
function backendFeatures() {
  const { TIERS } = require('../middleware/tierAuth.js');
  const found = new Set();
  for (const tier of Object.values(TIERS)) {
    for (const feature of (tier && tier.features) || []) found.add(feature);
  }
  return [...found].sort();
}

/** Features advertised by the frontend tier config. */
function frontendFeatures() {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'src', 'config', 'tiers.js'), 'utf8');
  const found = new Set();
  for (const block of source.matchAll(/features:\s*\[([^\]]*)\]/g)) {
    for (const literal of block[1].matchAll(/'([a-z0-9_]+)'/g)) found.add(literal[1]);
  }
  return [...found].sort();
}

function bothConfigs() {
  return [
    ...backendFeatures().map((f) => `backend: ${f}`),
    ...frontendFeatures().map((f) => `frontend: ${f}`),
  ];
}

test('every advertised feature names the code that implements it', () => {
  const features = bothConfigs();
  assert.ok(features.length > 0, 'expected features in the tier configs');

  const unexplained = features.filter((label) => !EVIDENCE[label.replace(/^\w+: /, '')]);

  assert.deepEqual(
    unexplained,
    [],
    `These features are advertised but name no implementation:\n  ` +
      unexplained.join('\n  ') +
      `\n\nAdd an EVIDENCE entry pointing at the code, or remove the label. A tier ` +
      `is a price promise; advertising an unimplemented feature is a false claim ` +
      `about the product.`,
  );
});

test('every EVIDENCE entry points at code that exists and matches', () => {
  const failures = [];

  for (const [feature, entries] of Object.entries(EVIDENCE)) {
    for (const [relative, pattern] of entries) {
      const full = path.join(REPO_ROOT, relative);
      if (!fs.existsSync(full)) {
        failures.push(`${feature}: ${relative} does not exist`);
        continue;
      }
      if (!pattern.test(fs.readFileSync(full, 'utf8'))) {
        failures.push(`${feature}: ${relative} does not match ${pattern}`);
      }
    }
  }

  assert.deepEqual(failures, [], `EVIDENCE entries that no longer hold:\n  ` + failures.join('\n  '));
});

test('no tier advertises a capability that is known not to be built', () => {
  const offenders = [];

  for (const label of bothConfigs()) {
    const feature = label.replace(/^\w+: /, '');
    const known = NOT_BUILT.find(([pattern]) => pattern.test(feature));
    if (known) offenders.push(`${label} — ${known[1]}`);
  }

  assert.deepEqual(
    offenders,
    [],
    `A tier is advertising a capability the product does not have:\n  ` + offenders.join('\n  '),
  );
});

test('every tier config feature list is a non-empty array of strings', () => {
  const { TIERS } = require('../middleware/tierAuth.js');
  for (const [name, tier] of Object.entries(TIERS)) {
    assert.ok(Array.isArray(tier.features), `${name}.features must be an array`);
    assert.ok(tier.features.length > 0, `${name}.features must not be empty`);
    for (const feature of tier.features) {
      assert.equal(
        typeof feature,
        'string',
        `${name}.features must contain only strings, found ${typeof feature}`,
      );
    }
  }
});
