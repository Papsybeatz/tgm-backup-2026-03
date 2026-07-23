const { average, clamp, keywordCoverage, parseNumber, toArray } = require('./utils');

function getNarratives(application) {
  return toArray(application?.narratives).map((value) => String(value || ''));
}

function getAttachmentMetadata(application) {
  return toArray(application?.attachments).map((item) => (typeof item === 'string' ? { name: item } : item || {}));
}

function collectApplicationText(application) {
  const narratives = getNarratives(application).join('\n');
  const summary = String(application?.project_summary || '');
  const organization = JSON.stringify(application?.org_profile || {});
  const metadata = JSON.stringify(application?.metadata || {});
  return [summary, narratives, organization, metadata].filter(Boolean).join('\n');
}

function computeEvidenceSignal(applicationText) {
  const numericSignals = (applicationText.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const evidenceKeywords = (applicationText.match(/\b(data|baseline|outcome|impact|evaluation|metric|kpi)\b/gi) || []).length;
  return clamp(45 + numericSignals * 4 + evidenceKeywords * 5);
}

function budgetSignals(budget) {
  const total = parseNumber(budget?.total);
  const admin = parseNumber(budget?.admin_cost);
  const program = parseNumber(budget?.program_cost);

  const warnings = [];
  if (!total || total <= 0) {
    warnings.push('Missing or invalid total budget.');
    return {
      sanityScore: 52,
      warnings,
      total: null,
      adminRatio: null,
      programRatio: null,
    };
  }

  const adminRatio = admin !== null ? admin / total : null;
  const programRatio = program !== null ? program / total : null;
  let sanityScore = 72;

  if (adminRatio !== null && adminRatio > 0.35) {
    sanityScore -= 20;
    warnings.push('Administrative cost ratio exceeds 35%.');
  }
  if (programRatio !== null && programRatio < 0.5) {
    sanityScore -= 12;
    warnings.push('Program delivery ratio is below 50%.');
  }

  return {
    sanityScore: clamp(sanityScore),
    warnings,
    total,
    adminRatio,
    programRatio,
  };
}

function confidenceScore(applicationText, attachmentMetadata) {
  const textLength = applicationText.length;
  const attachmentBonus = Math.min(16, attachmentMetadata.length * 4);
  const lengthBonus = textLength > 5000 ? 25 : textLength > 2500 ? 20 : textLength > 1000 ? 13 : textLength > 500 ? 8 : 3;
  return clamp(52 + attachmentBonus + lengthBonus);
}

function scoreCriterion(applicationText, criterion, context) {
  const name = criterion.name || 'Unnamed criterion';
  const description = criterion.description || '';
  const combinedTarget = `${name} ${description}`;
  const relevance = keywordCoverage(combinedTarget, applicationText);
  const priorityBoost = keywordCoverage(context.priorityText, applicationText);
  const evidence = context.evidenceSignal / 100;
  const completeness = context.completenessSignal / 100;

  const base = 42 + relevance * 35 + priorityBoost * 12 + evidence * 7 + completeness * 4;
  const score = clamp(Math.round(base));
  const confidence = clamp(Math.round((context.confidence + score) / 2));
  const explanation = relevance >= 0.4
    ? `${name} aligns with key language in the application narrative.`
    : `${name} has limited explicit support in the narrative and should be clarified.`;

  return {
    criterion: name,
    weight: criterion.weight,
    score,
    confidence,
    explanation,
  };
}

function computeScoring(funder, application) {
  const criteria = toArray(funder?.rubric_definition?.criteria);
  if (!criteria.length) {
    throw new Error('Funder rubric has no criteria.');
  }

  const applicationText = collectApplicationText(application);
  const attachmentMetadata = getAttachmentMetadata(application);
  const evidenceSignal = computeEvidenceSignal(applicationText);
  const completenessSignal = clamp(
    (applicationText.length > 900 ? 72 : applicationText.length > 450 ? 60 : 48) +
    (attachmentMetadata.length ? 8 : 0) +
    (application?.budget ? 8 : 0)
  );
  const budget = budgetSignals(application?.budget || {});
  const confidence = confidenceScore(applicationText, attachmentMetadata);
  const priorityText = toArray(funder?.priority_areas).join(' ');

  const criterionScores = criteria.map((criterion) =>
    scoreCriterion(applicationText, criterion, {
      completenessSignal,
      confidence,
      evidenceSignal,
      priorityText,
    })
  );

  const weightedSum = criterionScores.reduce((sum, item) => sum + item.score * item.weight, 0);
  const weightTotal = criterionScores.reduce((sum, item) => sum + item.weight, 0);
  const overallScore = clamp(Math.round(weightedSum / Math.max(weightTotal, 1)));

  const reviewerFlags = [];
  if (confidence < 68) reviewerFlags.push('low-confidence-evaluation');
  if (evidenceSignal < 60) reviewerFlags.push('low-evidence-signal');
  if (overallScore < 55) reviewerFlags.push('low-rubric-alignment');
  budget.warnings.forEach((warning) => reviewerFlags.push(`budget:${warning}`));

  return {
    overall_score: overallScore,
    scores_by_criterion: criterionScores,
    confidence,
    explanation: `Application scored ${overallScore}/100 with confidence ${confidence}/100.`,
    suggested_reviewer_flags: reviewerFlags,
    risk_score: clamp(
      Math.round(
        100 -
          average([
            overallScore,
            confidence,
            budget.sanityScore,
            evidenceSignal,
            completenessSignal,
          ])
      )
    ),
    diagnostics: {
      evidence_signal: evidenceSignal,
      completeness_signal: completenessSignal,
      budget_sanity_score: budget.sanityScore,
      budget_warnings: budget.warnings,
    },
  };
}

function evaluateEligibility(funder, application) {
  const geographies = toArray(funder?.geographies).map((value) => String(value).toLowerCase());
  const eligibilityRules = toArray(funder?.eligibility_rules);
  const geography = String(application?.metadata?.geography || application?.org_profile?.country || '').toLowerCase();
  const organizationType = String(application?.org_profile?.organization_type || '').toLowerCase();

  const checks = [];
  if (geographies.length) {
    const geographyPass = geographies.includes(geography);
    checks.push({
      check: 'geography',
      pass: geographyPass,
      details: geographyPass ? 'Application geography is eligible.' : `Geography "${geography || 'unknown'}" is outside allowed regions.`,
    });
  }

  eligibilityRules.forEach((rule, index) => {
    if (!rule || typeof rule !== 'object') {
      return;
    }
    if (rule.type === 'organization_type') {
      const allowed = toArray(rule.allowed).map((value) => String(value).toLowerCase());
      const pass = !allowed.length || allowed.includes(organizationType);
      checks.push({
        check: `eligibility_rule_${index + 1}`,
        pass,
        details: pass ? 'Organization type is eligible.' : `Organization type "${organizationType || 'unknown'}" is not allowed.`,
      });
    }
  });

  const pass = checks.every((item) => item.pass);
  return { pass, checks };
}

function computeFunderFit(funder, application) {
  const applicationText = collectApplicationText(application);
  const priorities = toArray(funder?.priority_areas);
  const priorityCoverage = priorities.length
    ? average(priorities.map((priority) => keywordCoverage(priority, applicationText)))
    : 0.5;
  const eligibility = evaluateEligibility(funder, application);

  const geoBonus = eligibility.checks.find((item) => item.check === 'geography' && item.pass) ? 0.2 : 0;
  const fitBase = 46 + priorityCoverage * 40 + geoBonus * 20;
  const fitScore = clamp(Math.round(eligibility.pass ? fitBase : Math.min(fitBase, 38)));
  const recommendedBand = fitScore >= 78 ? 'fast-track' : fitScore >= 50 ? 'review' : 'reject';

  const why = [];
  const whyNot = [];
  if (priorityCoverage >= 0.55) {
    why.push('Application themes match priority areas.');
  } else {
    whyNot.push('Narrative has weak overlap with declared priority areas.');
  }
  eligibility.checks.forEach((check) => {
    if (check.pass) why.push(check.details);
    else whyNot.push(check.details);
  });

  return {
    fit_score: fitScore,
    eligibility_pass: eligibility.pass,
    eligibility_checks: eligibility.checks,
    why,
    why_not: whyNot,
    recommended_band: recommendedBand,
    suggested_next_step: recommendedBand === 'fast-track'
      ? 'move_to_committee_review'
      : recommendedBand === 'review'
        ? 'needs_program_officer_review'
        : 'auto_reject_or_request_revision',
    rationale: eligibility.pass
      ? `Fit score ${fitScore}/100 with eligibility passed.`
      : `Fit score constrained to ${fitScore}/100 because eligibility checks failed.`,
  };
}

function scoreDistribution(values) {
  return {
    '0-49': values.filter((value) => value < 50).length,
    '50-69': values.filter((value) => value >= 50 && value < 70).length,
    '70-84': values.filter((value) => value >= 70 && value < 85).length,
    '85-100': values.filter((value) => value >= 85).length,
  };
}

function summarizeBatch(funder, applications) {
  const scoredApplications = applications.map((application, index) => {
    const scoring = computeScoring(funder, application);
    const fit = computeFunderFit(funder, application);
    const composite = clamp(Math.round(0.65 * scoring.overall_score + 0.35 * fit.fit_score));
    return {
      application_id: application?.id || `app_${index + 1}`,
      application_geography: String(application?.metadata?.geography || application?.org_profile?.country || 'unknown').toLowerCase(),
      scoring,
      fit,
      composite_score: composite,
      recommended_status: fit.suggested_next_step,
    };
  });

  const composites = scoredApplications.map((entry) => entry.composite_score);
  const sorted = [...scoredApplications].sort((a, b) => b.composite_score - a.composite_score);
  const shortlistCount = Math.max(1, Math.ceil(sorted.length * 0.2));
  const shortlist = sorted.slice(0, shortlistCount);
  const outliers = scoredApplications.filter(
    (entry) => entry.scoring.confidence < 70 || entry.scoring.risk_score > 55
  );

  const riskClusterMap = {};
  scoredApplications.forEach((entry) => {
    entry.scoring.suggested_reviewer_flags.forEach((flag) => {
      riskClusterMap[flag] = (riskClusterMap[flag] || 0) + 1;
    });
  });

  const alignmentClusters = {
    high_fit_high_score: scoredApplications.filter((entry) => entry.fit.fit_score >= 75 && entry.scoring.overall_score >= 75).length,
    high_fit_low_score: scoredApplications.filter((entry) => entry.fit.fit_score >= 75 && entry.scoring.overall_score < 75).length,
    low_fit_high_score: scoredApplications.filter((entry) => entry.fit.fit_score < 75 && entry.scoring.overall_score >= 75).length,
    low_fit_low_score: scoredApplications.filter((entry) => entry.fit.fit_score < 75 && entry.scoring.overall_score < 75).length,
  };

  const recommendedCounts = scoredApplications.reduce((acc, entry) => {
    acc[entry.fit.recommended_band] = (acc[entry.fit.recommended_band] || 0) + 1;
    return acc;
  }, {});

  const geographies = scoredApplications.map((entry) => entry.application_geography || 'unknown');
  const geoCounter = geographies.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const largestGeoShare = Object.values(geoCounter).length ? Math.max(...Object.values(geoCounter)) / geographies.length : 0;

  return {
    results: scoredApplications,
    analytics: {
      count: scoredApplications.length,
      score_distribution: scoreDistribution(composites),
      average_composite_score: Math.round(average(composites)),
      shortlist: shortlist.map((entry) => ({
        application_id: entry.application_id,
        composite_score: entry.composite_score,
        recommended_status: entry.recommended_status,
      })),
      outliers: outliers.map((entry) => ({
        application_id: entry.application_id,
        confidence: entry.scoring.confidence,
        risk_score: entry.scoring.risk_score,
      })),
      risk_clusters: riskClusterMap,
      alignment_clusters: alignmentClusters,
      recommended_band_distribution: recommendedCounts,
      bias_detection_signals: {
        geography_concentration_warning: largestGeoShare > 0.7,
        confidence_spread: {
          min: Math.min(...scoredApplications.map((entry) => entry.scoring.confidence)),
          max: Math.max(...scoredApplications.map((entry) => entry.scoring.confidence)),
        },
      },
    },
  };
}

function cycleIntelligenceFromBatch(funder, batchResult) {
  const priorities = toArray(funder?.priority_areas);
  const priorityHeatmap = priorities.map((priority) => {
    const fits = batchResult.results.map((entry) => {
      const text = [
        entry.scoring?.explanation || '',
        toArray(entry.fit?.why).join(' '),
        toArray(entry.fit?.why_not).join(' '),
      ].join(' ');
      return keywordCoverage(priority, text);
    });
    return {
      priority,
      average_match: Math.round(average(fits) * 100),
    };
  });

  const underFundedSignals = batchResult.results.filter((entry) => entry.fit.recommended_band === 'review' && entry.scoring.overall_score >= 72);
  const overFundedSignals = batchResult.results.filter((entry) => entry.fit.recommended_band === 'fast-track' && entry.scoring.risk_score > 48);

  return {
    shortlist_suggestions: batchResult.analytics.shortlist,
    risk_clusters: batchResult.analytics.risk_clusters,
    alignment_heatmap: priorityHeatmap,
    funding_signals: {
      over_funding_risk: overFundedSignals.map((entry) => entry.application_id),
      under_funding_opportunity: underFundedSignals.map((entry) => entry.application_id),
    },
  };
}

module.exports = {
  computeFunderFit,
  computeScoring,
  cycleIntelligenceFromBatch,
  summarizeBatch,
};
