/**
 * Reviewer mode tests
 * ----------------------------------------------------------------------------
 * Run: cd backend/funder-intelligence-api && npm run test:reviewer
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildReviewerWorklist,
  detectBias,
  suggestedStatus,
  reviewerSeatsForPlan,
  correlation,
} = require('./lib/reviewer');

function makeApplication(id, words, geography = 'ke') {
  const narrative = Array.from({ length: words }, (_, i) => `word${i}`).join(' ');
  return {
    id,
    narratives: { need: narrative, approach: narrative },
    budget: { total: 50000, lines: [{ label: 'programme', amount: 50000 }] },
    org_profile: { country: geography, registration_number: 'REG-1' },
    metadata: { geography },
  };
}

const FUNDER = {
  funder_id: 'f_test',
  name: 'Test Foundation',
  rubric_definition: {
    criteria: [
      { name: 'need', weight: 1, description: 'clarity of need' },
      { name: 'approach', weight: 1, description: 'quality of approach' },
      { name: 'evidence', weight: 1, description: 'supporting evidence' },
    ],
  },
  priority_areas: ['education', 'health'],
  eligibility: {},
};

test('the worklist is ranked and every applicant gets a decision with a reason', () => {
  const applications = [
    makeApplication('a', 120),
    makeApplication('b', 400),
    makeApplication('c', 40),
    makeApplication('d', 250),
    makeApplication('e', 80),
  ];

  const result = buildReviewerWorklist(FUNDER, applications, { planKey: 'funder_scale' });

  assert.equal(result.worklist.length, 5);

  // Ranked, descending.
  const scores = result.worklist.map((row) => row.composite_score);
  for (let i = 1; i < scores.length; i += 1) {
    assert.ok(scores[i - 1] >= scores[i], 'worklist must be sorted by composite score');
  }
  assert.equal(result.worklist[0].rank, 1);
  assert.equal(result.worklist[0].percentile, 100);

  // Every row carries a decision and a rationale.
  for (const row of result.worklist) {
    assert.ok(['advance', 'hold', 'decline', 'needs_more_info'].includes(row.suggested_status));
    assert.ok(row.rationale && row.rationale.length > 0);
    assert.ok(['top', 'middle', 'lower'].includes(row.cohort));
  }

  // Cohorts partition the set.
  const cohortTotal = result.cohorts.top.length + result.cohorts.middle.length + result.cohorts.lower.length;
  assert.equal(cohortTotal, 5);
});

test('reviewer seats come from the funder plan, not a separate product', () => {
  assert.equal(reviewerSeatsForPlan('funder_pilot'), 3);
  assert.equal(reviewerSeatsForPlan('funder_scale'), 15);
  assert.equal(reviewerSeatsForPlan('funder_enterprise'), Infinity);

  const result = buildReviewerWorklist(FUNDER, [makeApplication('a', 100)], { planKey: 'funder_pilot' });
  assert.equal(result.summary.reviewer_seats, 3);
  assert.equal(result.summary.seats_are_tier_feature, true);
});

test('a high score resting on thin evidence is not advanced', () => {
  // Good composite, low confidence — the most likely source of a bad award.
  const decision = suggestedStatus({ composite: 82, confidence: 40, riskScore: 20, eligibility: { eligible: true } });
  assert.equal(decision.status, 'needs_more_info');
  assert.ok(decision.reasons.includes('thin_evidence'));
});

test('ineligibility and high risk decline regardless of score', () => {
  assert.equal(suggestedStatus({ composite: 95, confidence: 90, riskScore: 10, eligibility: { eligible: false } }).status, 'decline');
  assert.equal(suggestedStatus({ composite: 95, confidence: 90, riskScore: 85, eligibility: { eligible: true } }).status, 'decline');
});

test('correlation is correct and refuses to guess on thin data', () => {
  assert.equal(correlation([[1, 2], [2, 4], [3, 6], [4, 8], [5, 10]]), 1);
  assert.equal(correlation([[1, 10], [2, 8], [3, 6], [4, 4], [5, 2]]), -1);
  assert.equal(correlation([[1, 1], [2, 2]]), null, 'fewer than 5 points must return null');
  assert.equal(correlation([[1, 5], [1, 5], [1, 5], [1, 5], [1, 5]]), null, 'zero spread must return null');
});

test('bias detection reports the evidence, not just a verdict', () => {
  // Craft a cohort where the score tracks text length.
  const applications = Array.from({ length: 10 }, (_, i) => makeApplication(`a${i}`, 20 + i * 40));
  const scored = applications.map((_, i) => ({
    application_id: `a${i}`,
    composite_score: 40 + i * 5,
    confidence: 80,
    risk_score: 10,
    application_geography: 'ke',
  }));

  const signals = detectBias(applications, scored);
  const lengthBias = signals.find((s) => s.type === 'length_bias');

  assert.ok(lengthBias, 'length bias should be detected when score tracks length');
  assert.equal(lengthBias.severity, 'high');
  assert.ok(lengthBias.correlation > 0.5);
  assert.ok(lengthBias.why_it_matters.includes('smaller organisations'));
});

test('score clustering is flagged when the rubric barely discriminates', () => {
  const applications = Array.from({ length: 10 }, (_, i) => makeApplication(`a${i}`, 100));
  const scored = applications.map((_, i) => ({
    application_id: `a${i}`,
    composite_score: 72 + (i % 2), // everything in one band
    confidence: 80,
    risk_score: 10,
    application_geography: 'ke',
  }));

  const signals = detectBias(applications, scored);
  assert.ok(signals.some((s) => s.type === 'score_clustering'));
});

test('systematic reviewer divergence is surfaced', () => {
  const applications = Array.from({ length: 6 }, (_, i) => makeApplication(`a${i}`, 100));
  const reviewerScores = applications.map((_, i) => ({ application_id: `a${i}`, reviewer_score: 95 }));

  const result = buildReviewerWorklist(FUNDER, applications, {
    planKey: 'funder_scale',
    reviewerScores,
  });

  const divergence = result.bias_signals.find((s) => s.type === 'reviewer_divergence');
  assert.ok(divergence, 'a systematic gap between reviewers and the engine must be flagged');
  assert.equal(divergence.severity, 'high');
  assert.ok(divergence.mean_delta > 0);
});
