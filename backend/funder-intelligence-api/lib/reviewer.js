/**
 * Reviewer mode — turns scored applications into a reviewer's worklist.
 *
 * The scoring primitives already existed in engines.js (computeScoring,
 * summarizeBatch and friends) but they produced an analytics digest, not a
 * decision surface. A reviewer needs three things this adds:
 *
 *   1. ranked cohorts    — every applicant ranked, with percentile and a band
 *   2. suggested statuses — advance / hold / decline / needs-more-info + WHY
 *   3. risk flags         — consolidated per application, with severity
 *   4. bias detection     — signals that the scoring is rewarding something
 *                           other than merit, which is the reviewer's real fear
 *
 * Reviewer seats are sold inside the funder tiers, not as a separate plan, so
 * `seats` is reported from the plan rather than gated here.
 */
const { summarizeBatch } = require('./engines');

/** Reviewer seats included per funder plan. Seats are a tier feature, not a product. */
const REVIEWER_SEATS_BY_PLAN = {
  funder_pilot: 3,
  funder_scale: 15,
  funder_enterprise: Infinity,
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function reviewerSeatsForPlan(planKey) {
  const seats = REVIEWER_SEATS_BY_PLAN[planKey];
  return seats === undefined ? 0 : seats;
}

/** Pearson correlation. Returns null when there is not enough spread to say anything. */
function correlation(pairs) {
  const usable = pairs.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (usable.length < 5) return null;

  const n = usable.length;
  const meanX = usable.reduce((s, [x]) => s + x, 0) / n;
  const meanY = usable.reduce((s, [, y]) => s + y, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const [x, y] of usable) {
    const dx = x - meanX;
    const dy = y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return Number((num / Math.sqrt(denX * denY)).toFixed(3));
}

function applicationText(application) {
  const parts = [];
  const push = (value) => {
    if (typeof value === 'string') parts.push(value);
    else if (Array.isArray(value)) value.forEach(push);
    else if (value && typeof value === 'object') Object.values(value).forEach(push);
  };
  push(application?.narratives);
  push(application?.narrative);
  push(application?.summary);
  push(application?.answers);
  return parts.join(' ');
}

/**
 * Turn one scored application into a decision with a reason.
 *
 * The composite alone is not enough to decide: a high score with low confidence
 * (thin evidence) or a high risk score is not an advance.
 */
function suggestedStatus(entry) {
  const { composite, confidence, riskScore, eligibility } = entry;
  const eligible = eligibility?.eligible !== false;
  const reasons = [];

  if (!eligible) {
    return { status: 'decline', rationale: 'Fails eligibility criteria.', reasons: ['ineligible'] };
  }

  if (riskScore >= 70) {
    return { status: 'decline', rationale: 'Risk score indicates a serious concern.', reasons: ['high_risk'] };
  }

  if (confidence < 55) {
    reasons.push('thin_evidence');
    if (composite >= 70) {
      return {
        status: 'needs_more_info',
        rationale: 'Scores well but the supporting evidence is thin — request more before deciding.',
        reasons,
      };
    }
  }

  if (composite >= 78 && confidence >= 70 && riskScore <= 55) {
    return { status: 'advance', rationale: 'Strong composite score with adequate evidence.', reasons: ['strong'] };
  }

  if (composite >= 62) {
    return { status: 'hold', rationale: 'Competitive but not clearly ahead of the cohort.', reasons: ['mid_band'] };
  }

  return { status: 'decline', rationale: 'Below the competitive band for this cycle.', reasons: ['low_composite'] };
}

function riskSeverity(riskScore, confidence) {
  if (riskScore >= 70) return 'high';
  if (riskScore >= 55) return 'medium';
  if (confidence < 60) return 'medium';
  if (riskScore >= 40) return 'low';
  return 'none';
}

/**
 * Bias signals.
 *
 * Each one is a statement about the cohort, with the evidence attached, so a
 * reviewer can judge it rather than trust it. Nothing here is an accusation —
 * these are prompts to look closer.
 */
function detectBias(applications, scored) {
  const signals = [];

  const composites = scored.map((entry) => entry.composite_score);
  const bands = {
    low: composites.filter((v) => v < 50).length,
    mid: composites.filter((v) => v >= 50 && v < 70).length,
    good: composites.filter((v) => v >= 70 && v < 85).length,
    high: composites.filter((v) => v >= 85).length,
  };
  const total = composites.length || 1;
  const largestBand = Math.max(...Object.values(bands));

  if (composites.length >= 8 && largestBand / total > 0.6) {
    signals.push({
      type: 'score_clustering',
      severity: 'medium',
      finding: `${Math.round((largestBand / total) * 100)}% of applications landed in one score band.`,
      why_it_matters: 'Low discrimination — the rubric is not separating applicants, so ranking is close to arbitrary.',
      distribution: bands,
    });
  }

  // Length bias: does the score track how much was written rather than merit?
  const lengthPairs = applications.map((application, index) => [
    applicationText(application).trim().split(/\s+/).filter(Boolean).length,
    scored[index]?.composite_score ?? 0,
  ]);
  const lengthCorrelation = correlation(lengthPairs);
  if (lengthCorrelation !== null && lengthCorrelation > 0.5) {
    signals.push({
      type: 'length_bias',
      severity: 'high',
      finding: `Score correlates with application length (r=${lengthCorrelation}).`,
      why_it_matters:
        'Longer applications are scoring higher regardless of substance — a known, legally risky bias that disadvantages smaller organisations.',
      correlation: lengthCorrelation,
    });
  }

  const geographies = scored.map((entry) => entry.application_geography || 'unknown');
  const geoCounts = geographies.reduce((acc, g) => {
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});
  const largestGeo = Object.entries(geoCounts).sort((a, b) => b[1] - a[1])[0];
  if (geographies.length >= 8 && largestGeo && largestGeo[1] / geographies.length > 0.6) {
    signals.push({
      type: 'geography_skew',
      severity: 'medium',
      finding: `${Math.round((largestGeo[1] / geographies.length) * 100)}% of applications came from one geography.`,
      why_it_matters: 'The cohort is not representative, so portfolio-level conclusions drawn from it will be skewed.',
      largest: largestGeo[0],
    });
  }

  // Thin evidence hiding behind a good score.
  const highScoreLowConfidence = scored.filter((e) => e.composite_score >= 75 && e.confidence < 65).length;
  if (highScoreLowConfidence >= 3) {
    signals.push({
      type: 'confidence_divergence',
      severity: 'high',
      finding: `${highScoreLowConfidence} applications scored 75+ with confidence under 65.`,
      why_it_matters: 'High scores resting on thin evidence — advancing these is the most likely source of a bad award.',
      count: highScoreLowConfidence,
    });
  }

  return signals;
}

/**
 * Reviewer worklist for a cohort.
 *
 * @param {object} funder
 * @param {Array} applications
 * @param {object} [options]
 * @param {string} [options.planKey] funder plan, which sets the reviewer seats
 * @param {Array}  [options.reviewerScores] [{ application_id, reviewer_score }] to
 *        compare human judgement against the engine
 */
function buildReviewerWorklist(funder, applications, options = {}) {
  const list = Array.isArray(applications) ? applications : [];
  const batch = summarizeBatch(funder, list);
  const results = batch.results || [];

  const ranked = [...results].sort((a, b) => b.composite_score - a.composite_score);

  const worklist = ranked.map((entry, index) => {
    const decision = suggestedStatus({
      composite: entry.composite_score,
      confidence: toNumber(entry.scoring?.confidence, 0),
      riskScore: toNumber(entry.scoring?.risk_score, 0),
      eligibility: entry.eligibility,
    });

    const flags = (entry.scoring?.suggested_reviewer_flags || []).map((flag) => ({
      flag,
      severity: riskSeverity(toNumber(entry.scoring?.risk_score, 0), toNumber(entry.scoring?.confidence, 100)),
    }));

    return {
      rank: index + 1,
      percentile: ranked.length > 1 ? Math.round((1 - index / (ranked.length - 1)) * 100) : 100,
      cohort: index < ranked.length * 0.2 ? 'top' : index < ranked.length * 0.5 ? 'middle' : 'lower',
      application_id: entry.application_id,
      geography: entry.application_geography,
      composite_score: entry.composite_score,
      fit_score: entry.fit?.fit_score ?? null,
      overall_score: entry.scoring?.overall_score ?? null,
      confidence: entry.scoring?.confidence ?? null,
      risk_score: entry.scoring?.risk_score ?? null,
      suggested_status: decision.status,
      rationale: decision.rationale,
      decision_reasons: decision.reasons,
      risk_flags: flags,
    };
  });

  // Reviewer-vs-engine divergence: systematic disagreement means one of the two
  // is miscalibrated, and a reviewer should know before they overrule the engine.
  const supplied = Array.isArray(options.reviewerScores) ? options.reviewerScores : [];
  const byId = new Map(worklist.map((row) => [row.application_id, row]));
  const deltas = supplied
    .map((row) => {
      const target = byId.get(row.application_id);
      if (!target || !Number.isFinite(Number(row.reviewer_score))) return null;
      return Number(row.reviewer_score) - target.composite_score;
    })
    .filter((value) => value !== null);

  const meanDelta = deltas.length ? Number((deltas.reduce((s, v) => s + v, 0) / deltas.length).toFixed(1)) : null;

  const biasSignals = detectBias(list, results);
  if (meanDelta !== null && Math.abs(meanDelta) >= 15) {
    biasSignals.push({
      type: 'reviewer_divergence',
      severity: 'high',
      finding: `Reviewers score ${meanDelta > 0 ? 'higher' : 'lower'} than the engine by ${Math.abs(meanDelta)} points on average across ${deltas.length} applications.`,
      why_it_matters:
        'A systematic gap in one direction means the rubric or the reviewers are miscalibrated. Neither ranking should be trusted until they are reconciled.',
      mean_delta: meanDelta,
      compared: deltas.length,
    });
  }

  const counts = worklist.reduce((acc, row) => {
    acc[row.suggested_status] = (acc[row.suggested_status] || 0) + 1;
    return acc;
  }, {});

  return {
    summary: {
      applicants: worklist.length,
      suggested_status_counts: counts,
      advance_candidates: worklist.filter((row) => row.suggested_status === 'advance').length,
      high_risk: worklist.filter((row) => row.risk_flags.some((f) => f.severity === 'high')).length,
      reviewer_seats: reviewerSeatsForPlan(options.planKey),
      seats_are_tier_feature: true,
    },
    cohorts: {
      top: worklist.filter((row) => row.cohort === 'top'),
      middle: worklist.filter((row) => row.cohort === 'middle'),
      lower: worklist.filter((row) => row.cohort === 'lower'),
    },
    worklist,
    bias_signals: biasSignals,
    score_distribution: batch.analytics?.score_distribution || null,
  };
}

module.exports = {
  buildReviewerWorklist,
  detectBias,
  suggestedStatus,
  reviewerSeatsForPlan,
  REVIEWER_SEATS_BY_PLAN,
  correlation,
};
