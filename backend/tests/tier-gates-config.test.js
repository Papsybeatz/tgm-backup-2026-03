/**
 * Frontend tier gates must agree with the frontend feature lists.
 * ----------------------------------------------------------------------------
 * src/config/tiers.js ships two things that can drift apart:
 *
 *   1. the `features` array — what a tier actually gets, and
 *   2. getTierGates() — the boolean flags UI components read.
 *
 * They had already drifted:
 *   - getTierGates() said scoring was Pro+, while the feature list gave full
 *     scoring (scoring_engine, scoring_detailed) to Starter. That locked a
 *     paying Starter customer out of the feature they bought.
 *   - getTierGates() said export was Starter+, while Free ships export_pdf and
 *     export_doc and the pricing page advertises "Export to PDF" on Free.
 *
 * These tests import the real module rather than grepping the source, so a
 * phrase split across a line break cannot silently pass — the failure mode that
 * bit the source-text assertions elsewhere in this suite.
 *
 * Run: cd backend && npm run test:tiers
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const TIERS_PATH = path.join(__dirname, '..', '..', 'src', 'config', 'tiers.js');
const tiersPromise = import(TIERS_PATH);

/* ── the specific regression: scoring is Starter+, not Pro+ ───────────────── */

test('scoring is locked on Free and unlocked from Starter upward', async () => {
  const { getTierGates } = await tiersPromise;

  assert.equal(getTierGates('free').scoringUnlocked, false, 'Free must not have full scoring');

  for (const tier of ['starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime']) {
    assert.equal(getTierGates(tier).scoringUnlocked, true, `${tier} must have scoring unlocked`);
  }
});

/* ── the property that actually matters: gate == feature list ─────────────── */

test('the scoring gate agrees with the feature list at every tier', async () => {
  const { TIERS, getTierGates } = await tiersPromise;

  for (const [tier, config] of Object.entries(TIERS)) {
    const hasFullScoring =
      config.features.includes('scoring_engine') || config.features.includes('scoring_detailed');
    assert.equal(
      getTierGates(tier).scoringUnlocked,
      hasFullScoring,
      `${tier}: gate says scoringUnlocked=${getTierGates(tier).scoringUnlocked} but the feature list ` +
        `${hasFullScoring ? 'includes' : 'does not include'} full scoring`,
    );
  }
});

test('the export gate agrees with the feature list at every tier', async () => {
  const { TIERS, getTierGates } = await tiersPromise;

  // Free is the case that broke: it ships both exporters, so a Starter+ gate
  // locked a feature the tier already had.
  assert.equal(getTierGates('free').exportUnlocked, true, 'Free must be able to export');

  for (const [tier, config] of Object.entries(TIERS)) {
    const canExport =
      config.features.includes('export_pdf') || config.features.includes('export_doc');
    assert.equal(
      getTierGates(tier).exportUnlocked,
      canExport,
      `${tier}: export gate disagrees with the feature list`,
    );
  }
});

/* ── a gate must never require more than the feature list grants ──────────── */

test('no gate is stricter than the tier feature list it describes', async () => {
  const { TIERS, getTierGates } = await tiersPromise;

  // Each entry maps a gate flag to the feature(s) that grant it. If the feature
  // is present the gate must be true; a false gate is the "you bought it and
  // still can't use it" bug.
  const FEATURE_FOR_GATE = {
    aiActionsUnlocked: 'ai_rewrite',
    templatesUnlocked: 'project_templates',
    grantMatchesUnlocked: 'matching_engine',
    teamFeaturesUnlocked: 'team_seats_3',
    clientFoldersUnlocked: 'client_folders',
  };

  for (const [tier, config] of Object.entries(TIERS)) {
    const gates = getTierGates(tier);
    for (const [gate, feature] of Object.entries(FEATURE_FOR_GATE)) {
      if (config.features.includes(feature)) {
        assert.equal(
          gates[gate],
          true,
          `${tier} has ${feature} but ${gate} is false`,
        );
      }
    }
  }
});
