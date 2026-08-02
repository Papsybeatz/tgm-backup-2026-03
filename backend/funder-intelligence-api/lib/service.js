const { computeFunderFit, computeScoring, cycleIntelligenceFromBatch, summarizeBatch } = require('./engines');
const { readDatabase, withDatabase } = require('./datastore');
const { average, createApiKey, createId, toArray } = require('./utils');

function normalizeRubricCriteria(criteriaInput = []) {
  return toArray(criteriaInput).map((criterion, index) => {
    const fallbackName = `Criterion ${index + 1}`;
    const parsedWeight = Number(criterion?.weight);
    return {
      criterion_id: criterion?.criterion_id || createId('crit'),
      name: String(criterion?.name || fallbackName),
      weight: Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 0,
      description: String(criterion?.description || ''),
      scoring_scale: criterion?.scoring_scale || criterion?.scale || '0-100',
    };
  });
}

function buildValidationReport(criteria) {
  const missingWeights = criteria.filter((item) => !item.weight).map((item) => item.name);
  const ambiguousCriteria = criteria
    .filter((item) => item.description.trim().length < 20)
    .map((item) => item.name);

  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
  return {
    valid: !missingWeights.length,
    total_weight: totalWeight,
    missing_weights: missingWeights,
    ambiguous_criteria: ambiguousCriteria,
    notes: [
      missingWeights.length ? 'Some criteria are missing numeric weights.' : 'Rubric weights are complete.',
      ambiguousCriteria.length ? 'Some criteria descriptions are short and may reduce scoring precision.' : 'Criteria descriptions are sufficiently detailed.',
    ],
  };
}

function nowIso() {
  return new Date().toISOString();
}

function getDefaultEnterpriseRubric() {
  return {
    criteria: [
      {
        criterion_id: createId('crit'),
        name: 'Strategic Alignment',
        weight: 30,
        description: 'How strongly the application aligns to strategic priorities and portfolio goals.',
        scoring_scale: '0-100',
      },
      {
        criterion_id: createId('crit'),
        name: 'Execution Capacity',
        weight: 25,
        description: 'Operational delivery confidence, milestones, staffing model, and implementation feasibility.',
        scoring_scale: '0-100',
      },
      {
        criterion_id: createId('crit'),
        name: 'Impact Evidence',
        weight: 20,
        description: 'Use of outcomes, baselines, and measurable impact indicators.',
        scoring_scale: '0-100',
      },
      {
        criterion_id: createId('crit'),
        name: 'Budget Integrity',
        weight: 15,
        description: 'Budget realism, reasonableness, and direct linkage to outcomes.',
        scoring_scale: '0-100',
      },
      {
        criterion_id: createId('crit'),
        name: 'Risk and Compliance',
        weight: 10,
        description: 'Regulatory readiness, risk controls, and compliance posture.',
        scoring_scale: '0-100',
      },
    ],
    examples: [],
    risk_flags: [
      'insufficient_outcomes_evidence',
      'budget_allocation_imbalance',
      'eligibility_conflict',
    ],
  };
}

function getDefaultRetentionPolicy() {
  return {
    policy_id: createId('retention'),
    application_data_days: 365,
    audit_log_days: 730,
    pii_redaction_days: 30,
    auto_purge_enabled: true,
  };
}

function getDefaultSlaProfile() {
  return {
    profile_id: createId('sla'),
    uptime_target_percent: 99.9,
    p95_latency_ms_target: 500,
    error_rate_percent_threshold: 0.5,
    batch_score_seconds_threshold: 10,
  };
}

function generateSsoMetadata(funderId, orgSlug) {
  const tenantBase = `https://tgm-funder-intelligence.local/${orgSlug}`;
  return {
    provider: 'saml',
    entity_id: `${tenantBase}/sso/entity/${funderId}`,
    acs_url: `${tenantBase}/sso/acs`,
    login_url: `${tenantBase}/sso/login`,
    logout_url: `${tenantBase}/sso/logout`,
    cert_fingerprint: createId('cert'),
  };
}

function normalizeRubricFromInput(input) {
  const criteria = normalizeRubricCriteria(input?.criteria || input || []);
  if (!criteria.length) {
    throw new Error('Unable to parse rubric criteria from provided input.');
  }
  return { criteria };
}

function parseCsvRubric(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV rubric must include header and at least one criterion row.');
  }
  const headers = lines[0].split(',').map((item) => item.trim().toLowerCase());
  const nameIdx = headers.findIndex((item) => item === 'name' || item === 'criterion');
  const weightIdx = headers.findIndex((item) => item === 'weight');
  const descriptionIdx = headers.findIndex((item) => item === 'description');
  const scaleIdx = headers.findIndex((item) => item === 'scoring_scale' || item === 'scale');
  if (nameIdx < 0) {
    throw new Error('CSV rubric header must include "name" or "criterion".');
  }

  return lines.slice(1).map((line) => {
    const parts = line.split(',').map((item) => item.trim());
    return {
      name: parts[nameIdx] || 'Unnamed criterion',
      weight: weightIdx >= 0 ? Number(parts[weightIdx]) || 0 : 0,
      description: descriptionIdx >= 0 ? parts[descriptionIdx] || '' : '',
      scoring_scale: scaleIdx >= 0 ? parts[scaleIdx] || '0-100' : '0-100',
    };
  });
}

function parsePdfLikeRubric(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = lines.map((line) => {
    const match = line.match(/^(.+?)(?:\s*[-:|]\s*)(\d{1,3})(?:\s*[-:|]\s*)(.+)$/);
    if (match) {
      return {
        name: match[1].trim(),
        weight: Number(match[2]),
        description: match[3].trim(),
        scoring_scale: '0-100',
      };
    }
    return null;
  }).filter(Boolean);

  if (!parsed.length) {
    throw new Error('PDF rubric parser could not detect criteria lines. Use JSON or CSV format.');
  }
  return parsed;
}

function parseRubricInput({ format, content }) {
  const normalizedFormat = String(format || '').toLowerCase();
  if (!normalizedFormat) throw new Error('Rubric format is required (json, csv, or pdf).');
  if (!String(content || '').trim()) throw new Error('Rubric content is required.');

  if (normalizedFormat === 'json') {
    const parsed = JSON.parse(String(content));
    return normalizeRubricFromInput(parsed);
  }
  if (normalizedFormat === 'csv') {
    return normalizeRubricFromInput(parseCsvRubric(content));
  }
  if (normalizedFormat === 'pdf') {
    return normalizeRubricFromInput(parsePdfLikeRubric(content));
  }
  throw new Error('Unsupported rubric format. Use json, csv, or pdf.');
}

function buildFunderRecord({
  funderId,
  name,
  payload,
  criteria,
  now,
  tier = 'scale',
}) {
  return {
    id: funderId,
    name,
    mission: String(payload?.mission || ''),
    priority_areas: toArray(payload?.priority_areas).map(String),
    geographies: toArray(payload?.geographies).map(String),
    eligibility_rules: toArray(payload?.eligibility_rules),
    rubric_definition: {
      criteria,
      examples: toArray(payload?.rubric_definition?.examples),
      risk_flags: toArray(payload?.rubric_definition?.risk_flags),
    },
    cycle_configs: toArray(payload?.cycle_configs),
    plan_tier: tier,
    created_at: now,
    updated_at: now,
  };
}

async function registerFunder(payload) {
  const tier = String(payload?.plan_tier || payload?.tier || 'scale').toLowerCase();
  if (tier === 'enterprise') {
    return createEnterpriseFunder(payload);
  }

  const name = String(payload?.name || '').trim();
  if (!name) {
    throw new Error('Funder name is required.');
  }
  const criteria = normalizeRubricCriteria(payload?.rubric_definition?.criteria || payload?.rubric?.criteria || []);
  if (!criteria.length) {
    throw new Error('At least one rubric criterion is required.');
  }

  const validation = buildValidationReport(criteria);
  if (validation.missing_weights.length) {
    const equalWeight = Math.max(1, Math.round(100 / criteria.length));
    criteria.forEach((criterion) => {
      if (!criterion.weight) criterion.weight = equalWeight;
    });
    validation.valid = true;
    validation.notes.push('Missing weights were auto-filled with equal defaults.');
  }

  const funderId = createId('funder');
  const apiKey = createApiKey();
  const now = new Date().toISOString();

  const funderRecord = buildFunderRecord({
    funderId,
    name,
    payload,
    criteria,
    now,
    tier: 'scale',
  });

  await withDatabase((db) => {
    db.funders[funderId] = funderRecord;
    db.apiKeys[apiKey] = {
      funder_id: funderId,
      created_at: now,
      label: String(payload?.api_key_label || 'primary'),
      last_used_at: null,
    };
    db.auditLogs.push({
      id: createId('log'),
      type: 'funder_registered',
      funder_id: funderId,
      created_at: now,
    });
    return db;
  });

  return {
    funder_id: funderId,
    api_key: apiKey,
    plan_tier: funderRecord.plan_tier,
    validation_report: validation,
  };
}

async function createEnterpriseFunder(payload) {
  const name = String(payload?.name || '').trim();
  if (!name) {
    throw new Error('Funder name is required.');
  }
  const now = nowIso();
  const funderId = createId('funder');
  const orgId = createId('org');
  const orgApiKey = createApiKey();
  const sso = generateSsoMetadata(funderId, name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const retentionPolicy = payload?.retention_policy || getDefaultRetentionPolicy();
  const slaProfile = payload?.sla_profile || getDefaultSlaProfile();
  const enterpriseRubric = getDefaultEnterpriseRubric();
  const criteria = normalizeRubricCriteria(payload?.rubric_definition?.criteria || enterpriseRubric.criteria);
  const validation = buildValidationReport(criteria);

  const funderRecord = buildFunderRecord({
    funderId,
    name,
    payload,
    criteria,
    now,
    tier: 'enterprise',
  });

  const accountManagerId = `va_${createId('manager')}`;
  const accountManager = {
    id: accountManagerId,
    type: 'virtual_account_manager',
    label: payload?.account_manager_label || 'TGM Enterprise Concierge',
    contact_email: payload?.account_manager_email || 'enterprise@thegrantsmaster.com',
    escalation_channel: payload?.escalation_channel || 'priority-inbox',
  };

  await withDatabase((db) => {
    db.funders[funderId] = funderRecord;
    db.apiKeys[orgApiKey] = {
      funder_id: funderId,
      created_at: now,
      label: 'enterprise-org',
      scope: 'org',
      last_used_at: null,
    };
    db.enterpriseOrgs[orgId] = {
      id: orgId,
      funder_id: funderId,
      org_name: name,
      org_bucket: `enterprise_${orgId}`,
      sso,
      retention_policy: retentionPolicy,
      sla_profile: slaProfile,
      account_manager: accountManager,
      support_profile: {
        priority_queue: 'enterprise-priority',
        ticket_sla_minutes: 30,
      },
      created_at: now,
      updated_at: now,
    };
    db.auditLogs.push({
      id: createId('log'),
      type: 'enterprise_funder_registered',
      funder_id: funderId,
      org_id: orgId,
      created_at: now,
    });
    return db;
  });

  return {
    funder_id: funderId,
    org_id: orgId,
    org_api_key: orgApiKey,
    plan_tier: 'enterprise',
    validation_report: validation,
    enterprise_config: {
      org_bucket: `enterprise_${orgId}`,
      sso_metadata: sso,
      default_rubric_template: { criteria },
      retention_policy: retentionPolicy,
      sla_profile: slaProfile,
      account_manager: accountManager,
    },
    onboarding_packet: {
      steps: [
        'Configure SSO metadata in your identity provider.',
        'Use org_api_key for enterprise API calls.',
        'Upload custom rubric via /enterprise/rubric/parse then confirm via /enterprise/rubric/confirm.',
        'Configure alert webhook in enterprise config for SLA notifications.',
      ],
    },
  };
}

async function getFunderById(funderId) {
  const db = await readDatabase();
  return db.funders[funderId] || null;
}

function validateAndResolveFunder(auth, body, options = {}) {
  const funderId = String(body?.funder_id || auth?.funder_id || '').trim();
  if (!funderId) {
    throw new Error('funder_id is required.');
  }
  if (auth?.funder_id && funderId !== auth.funder_id) {
    throw new Error('API key does not have access to this funder.');
  }
  const funder = auth?.funder || null;
  if (!funder) {
    throw new Error('Funder context missing.');
  }

  const application = body?.application || body;
  const applications = toArray(body?.applications);
  if (!options.allowMissingApplications && !application && !applications.length) {
    throw new Error('application or applications payload is required.');
  }

  return {
    funder,
    body,
    application,
    applicationList: applications,
  };
}

function scoreApplication(funder, application) {
  const scoring = computeScoring(funder, application);
  return {
    application_id: application?.id || null,
    funder_id: funder.id,
    ...scoring,
    suggested_next_step: scoring.overall_score >= 80
      ? 'move_to_committee_review'
      : scoring.overall_score >= 60
        ? 'needs_program_officer_review'
        : 'needs_clarification',
  };
}

function evaluateFunderFit(funder, application) {
  return {
    application_id: application?.id || null,
    funder_id: funder.id,
    ...computeFunderFit(funder, application),
  };
}

async function scoreBatch(funder, body, inputApplications) {
  const applications = inputApplications.length ? inputApplications : toArray(body?.applications);
  if (!applications.length) {
    throw new Error('applications array is required for batch scoring.');
  }
  const batchResult = summarizeBatch(funder, applications);
  const batchId = createId('batch');
  const cycleId = body?.cycle_id ? String(body.cycle_id) : createId('cycle');
  const now = new Date().toISOString();

  await withDatabase((db) => {
    db.batches[batchId] = {
      id: batchId,
      funder_id: funder.id,
      cycle_id: cycleId,
      created_at: now,
      results: batchResult.results,
      analytics: batchResult.analytics,
    };
    db.cycles[cycleId] = {
      id: cycleId,
      funder_id: funder.id,
      batch_id: batchId,
      created_at: now,
      analytics: batchResult.analytics,
    };
    db.auditLogs.push({
      id: createId('log'),
      type: 'batch_scored',
      funder_id: funder.id,
      batch_id: batchId,
      cycle_id: cycleId,
      created_at: now,
    });
    return db;
  });

  return {
    funder_id: funder.id,
    batch_id: batchId,
    cycle_id: cycleId,
    applications: batchResult.results,
    cohort_analytics: batchResult.analytics,
  };
}

async function buildCycleIntelligence(funder, body, inputApplications) {
  const db = await readDatabase();
  let batchResult = null;
  const batchId = body?.batch_id ? String(body.batch_id) : null;
  const cycleId = body?.cycle_id ? String(body.cycle_id) : null;

  if (batchId && db.batches[batchId]) {
    const batch = db.batches[batchId];
    if (batch.funder_id !== funder.id) {
      throw new Error('Batch does not belong to this funder.');
    }
    batchResult = { results: batch.results, analytics: batch.analytics };
  } else if (cycleId && db.cycles[cycleId]) {
    const cycle = db.cycles[cycleId];
    if (cycle.funder_id !== funder.id) {
      throw new Error('Cycle does not belong to this funder.');
    }
    const cycleBatch = db.batches[cycle.batch_id];
    if (!cycleBatch) {
      throw new Error('Cycle batch reference is missing.');
    }
    batchResult = { results: cycleBatch.results, analytics: cycleBatch.analytics };
  } else {
    const applications = inputApplications.length ? inputApplications : toArray(body?.applications);
    if (!applications.length) {
      throw new Error('Provide cycle_id, batch_id, or applications.');
    }
    batchResult = summarizeBatch(funder, applications);
  }

  return {
    funder_id: funder.id,
    cycle_id: cycleId,
    batch_id: batchId,
    intelligence: cycleIntelligenceFromBatch(funder, batchResult),
  };
}

async function upsertWebhookConfig(funder, body) {
  const url = String(body?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('A valid webhook url is required.');
  }
  const mapping = body?.mapping && typeof body.mapping === 'object' ? body.mapping : {};
  const auth = body?.auth && typeof body.auth === 'object' ? body.auth : {};
  const now = new Date().toISOString();

  await withDatabase((db) => {
    db.webhooks[funder.id] = {
      funder_id: funder.id,
      url,
      auth,
      mapping,
      updated_at: now,
    };
    db.auditLogs.push({
      id: createId('log'),
      type: 'webhook_updated',
      funder_id: funder.id,
      created_at: now,
    });
    return db;
  });

  return {
    funder_id: funder.id,
    webhook: {
      url,
      mapping,
      updated_at: now,
    },
    test_event: {
      event: 'tgm.funder-intelligence.test',
      suggested_next_step: 'needs_program_officer_review',
      mapped_stage: mapping.needs_program_officer_review || null,
      timestamp: now,
    },
  };
}

async function updateEnterpriseConfig(funder, updates) {
  const now = nowIso();
  const db = await readDatabase();
  const enterpriseOrg = Object.values(db.enterpriseOrgs).find((org) => org.funder_id === funder.id);
  if (!enterpriseOrg) {
    throw new Error('Enterprise organization not found for this funder.');
  }

  await withDatabase((nextDb) => {
    const current = nextDb.enterpriseOrgs[enterpriseOrg.id];
    nextDb.enterpriseOrgs[enterpriseOrg.id] = {
      ...current,
      ...updates,
      updated_at: now,
    };
    nextDb.auditLogs.push({
      id: createId('log'),
      type: 'enterprise_config_updated',
      funder_id: funder.id,
      org_id: enterpriseOrg.id,
      created_at: now,
    });
    return nextDb;
  });
}

async function parseEnterpriseRubric(funder, payload) {
  const parsed = parseRubricInput(payload || {});
  const normalizedCriteria = normalizeRubricCriteria(parsed.criteria);
  const validation = buildValidationReport(normalizedCriteria);
  const draftId = createId('rubric_draft');
  const now = nowIso();

  await withDatabase((db) => {
    db.rubricDrafts[draftId] = {
      id: draftId,
      funder_id: funder.id,
      criteria: normalizedCriteria,
      validation_report: validation,
      created_at: now,
      confirmed: false,
    };
    db.auditLogs.push({
      id: createId('log'),
      type: 'enterprise_rubric_parsed',
      funder_id: funder.id,
      rubric_draft_id: draftId,
      created_at: now,
    });
    return db;
  });

  return {
    rubric_draft_id: draftId,
    rubric_json: { criteria: normalizedCriteria },
    validation_report: validation,
    requires_manual_review: validation.ambiguous_criteria.length > 0,
  };
}

async function confirmEnterpriseRubricDeployment(funder, payload) {
  const draftId = String(payload?.rubric_draft_id || '').trim();
  if (!draftId) throw new Error('rubric_draft_id is required.');
  const now = nowIso();

  const db = await readDatabase();
  const draft = db.rubricDrafts[draftId];
  if (!draft || draft.funder_id !== funder.id) {
    throw new Error('Rubric draft not found for this funder.');
  }

  await withDatabase((nextDb) => {
    nextDb.rubricDrafts[draftId] = {
      ...nextDb.rubricDrafts[draftId],
      confirmed: true,
      confirmed_at: now,
    };
    nextDb.funders[funder.id] = {
      ...nextDb.funders[funder.id],
      rubric_definition: {
        ...(nextDb.funders[funder.id].rubric_definition || {}),
        criteria: draft.criteria,
      },
      updated_at: now,
    };
    nextDb.auditLogs.push({
      id: createId('log'),
      type: 'enterprise_rubric_deployed',
      funder_id: funder.id,
      rubric_draft_id: draftId,
      created_at: now,
    });
    return nextDb;
  });

  return {
    deployed: true,
    rubric_draft_id: draftId,
    criteria_count: draft.criteria.length,
  };
}

function isEnterpriseFunder(funder) {
  return String(funder?.plan_tier || '').toLowerCase() === 'enterprise';
}

async function getEnterpriseOrgByFunderId(funderId) {
  const db = await readDatabase();
  const org = Object.values(db.enterpriseOrgs).find((entry) => entry.funder_id === funderId);
  return org || null;
}

async function emitEnterpriseSlaAlert(funder, alertPayload) {
  const org = await getEnterpriseOrgByFunderId(funder.id);
  if (!org) return;
  const alertWebhook = org?.sla_profile?.alert_webhook_url;
  const timestamp = nowIso();

  await withDatabase((db) => {
    db.metrics.alerts.push({
      id: createId('sla_alert'),
      funder_id: funder.id,
      org_id: org.id,
      ...alertPayload,
      created_at: timestamp,
    });
    return db;
  });

  if (!alertWebhook) return;
  try {
    await fetch(alertWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'tgm.enterprise.sla.alert',
        funder_id: funder.id,
        org_id: org.id,
        timestamp,
        alert: alertPayload,
      }),
    });
  } catch (_error) {
    await withDatabase((db) => {
      db.auditLogs.push({
        id: createId('log'),
        type: 'enterprise_sla_alert_delivery_failed',
        funder_id: funder.id,
        created_at: timestamp,
      });
      return db;
    });
  }
}

async function recordRequestMetric(funder, eventType, statusCode, durationMs) {
  if (!funder || !isEnterpriseFunder(funder)) return;
  const now = nowIso();
  const entry = {
    id: createId('metric'),
    funder_id: funder.id,
    event_type: eventType,
    status_code: statusCode,
    duration_ms: durationMs,
    created_at: now,
  };

  const db = await withDatabase((nextDb) => {
    nextDb.metrics.requests.push(entry);
    const cutoff = Date.now() - (31 * 24 * 60 * 60 * 1000);
    nextDb.metrics.requests = nextDb.metrics.requests.filter((metric) => {
      const createdAt = Date.parse(metric.created_at || '');
      return Number.isFinite(createdAt) && createdAt >= cutoff;
    });
    return nextDb;
  });

  const recent = db.metrics.requests
    .filter((metric) => metric.funder_id === funder.id)
    .slice(-200);
  const errorRate = recent.length
    ? (recent.filter((metric) => metric.status_code >= 500).length / recent.length) * 100
    : 0;

  if (durationMs > 500) {
    await emitEnterpriseSlaAlert(funder, {
      type: 'latency_threshold_exceeded',
      threshold_ms: 500,
      observed_ms: durationMs,
      event_type: eventType,
    });
  }
  if (errorRate > 0.5) {
    await emitEnterpriseSlaAlert(funder, {
      type: 'error_rate_threshold_exceeded',
      threshold_percent: 0.5,
      observed_percent: Number(errorRate.toFixed(3)),
      sample_size: recent.length,
    });
  }
  if (eventType === 'batch.score' && durationMs > 10000) {
    await emitEnterpriseSlaAlert(funder, {
      type: 'batch_latency_threshold_exceeded',
      threshold_ms: 10000,
      observed_ms: durationMs,
    });
  }
}

async function getEnterpriseHeartbeat(funder) {
  const org = await getEnterpriseOrgByFunderId(funder.id);
  if (!org) throw new Error('Enterprise organization not found for this funder.');
  const db = await readDatabase();
  const metrics = db.metrics.requests.filter((entry) => entry.funder_id === funder.id).slice(-200);
  const p95 = metrics.length
    ? (() => {
      const sorted = metrics.map((entry) => entry.duration_ms).sort((a, b) => a - b);
      const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      return sorted[idx];
    })()
    : 0;
  const errorRate = metrics.length
    ? (metrics.filter((entry) => entry.status_code >= 500).length / metrics.length) * 100
    : 0;

  return {
    status: 'ok',
    funder_id: funder.id,
    org_id: org.id,
    sla_profile: org.sla_profile,
    monitoring: {
      sample_size: metrics.length,
      p95_latency_ms: Math.round(p95),
      error_rate_percent: Number(errorRate.toFixed(3)),
      last_event_at: metrics.length ? metrics[metrics.length - 1].created_at : null,
    },
  };
}

async function createEnterpriseSupportTicket(funder, payload) {
  const subject = String(payload?.subject || '').trim();
  if (!subject) throw new Error('Ticket subject is required.');
  const now = nowIso();
  const ticketId = createId('ticket');
  const org = await getEnterpriseOrgByFunderId(funder.id);
  if (!org) throw new Error('Enterprise organization not found for this funder.');

  const ticket = {
    id: ticketId,
    funder_id: funder.id,
    org_id: org.id,
    subject,
    description: String(payload?.description || ''),
    priority: 'enterprise',
    assigned_to: org.account_manager,
    queue: org.support_profile?.priority_queue || 'enterprise-priority',
    status: 'open',
    created_at: now,
  };

  await withDatabase((db) => {
    db.supportTickets[ticketId] = ticket;
    db.auditLogs.push({
      id: createId('log'),
      type: 'enterprise_support_ticket_created',
      funder_id: funder.id,
      ticket_id: ticketId,
      created_at: now,
    });
    return db;
  });

  return ticket;
}

async function buildEnterpriseMonthlyReport(funder, payload) {
  const month = String(payload?.month || '').trim() || new Date().toISOString().slice(0, 7);
  const db = await readDatabase();
  const org = await getEnterpriseOrgByFunderId(funder.id);
  if (!org) throw new Error('Enterprise organization not found for this funder.');

  const monthPrefix = `${month}-`;
  const requestMetrics = db.metrics.requests.filter((entry) => entry.funder_id === funder.id && String(entry.created_at || '').startsWith(monthPrefix));
  const monthBatches = Object.values(db.batches).filter((batch) => batch.funder_id === funder.id && String(batch.created_at || '').startsWith(monthPrefix));
  const scores = monthBatches.flatMap((batch) => toArray(batch.results).map((row) => row?.scoring?.overall_score).filter((value) => typeof value === 'number'));
  const fits = monthBatches.flatMap((batch) => toArray(batch.results).map((row) => row?.fit?.fit_score).filter((value) => typeof value === 'number'));

  const avgScore = scores.length ? Math.round(average(scores)) : 0;
  const avgFit = fits.length ? Math.round(average(fits)) : 0;
  const errorRate = requestMetrics.length
    ? (requestMetrics.filter((entry) => entry.status_code >= 500).length / requestMetrics.length) * 100
    : 0;
  const p95Latency = requestMetrics.length
    ? (() => {
      const sorted = requestMetrics.map((entry) => entry.duration_ms).sort((a, b) => a - b);
      return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    })()
    : 0;

  const report = {
    id: createId('report'),
    month,
    funder_id: funder.id,
    org_id: org.id,
    usage: {
      total_requests: requestMetrics.length,
      total_batches: monthBatches.length,
    },
    score_distribution: {
      average_score: avgScore,
      samples: scores.length,
    },
    fit_distribution: {
      average_fit: avgFit,
      samples: fits.length,
    },
    cycle_analytics: {
      cycles_seen: new Set(monthBatches.map((batch) => batch.cycle_id)).size,
      shortlist_candidates: monthBatches.reduce((acc, batch) => acc + toArray(batch.analytics?.shortlist).length, 0),
    },
    sla_compliance: {
      uptime_target_percent: org.sla_profile?.uptime_target_percent || 99.9,
      p95_latency_ms_target: org.sla_profile?.p95_latency_ms_target || 500,
      observed_p95_latency_ms: Math.round(p95Latency),
      error_rate_percent_threshold: org.sla_profile?.error_rate_percent_threshold || 0.5,
      observed_error_rate_percent: Number(errorRate.toFixed(3)),
      compliant:
        Math.round(p95Latency) <= (org.sla_profile?.p95_latency_ms_target || 500) &&
        errorRate <= (org.sla_profile?.error_rate_percent_threshold || 0.5),
    },
    generated_at: nowIso(),
  };

  await withDatabase((nextDb) => {
    nextDb.monthlyReports[report.id] = report;
    nextDb.auditLogs.push({
      id: createId('log'),
      type: 'enterprise_monthly_report_generated',
      funder_id: funder.id,
      report_id: report.id,
      created_at: report.generated_at,
    });
    return nextDb;
  });

  return report;
}

function buildWebhookHeaders(config) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = config?.auth || {};
  const type = String(auth.type || '').toLowerCase();

  if (type === 'bearer' && auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  } else if (type === 'header' && auth.key && auth.value) {
    headers[String(auth.key)] = String(auth.value);
  } else if (type === 'basic' && auth.username && auth.password) {
    const token = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  return headers;
}

function mapSuggestedStage(mapping, payload) {
  const mappingObj = mapping && typeof mapping === 'object' ? mapping : {};
  const suggested = String(payload?.suggested_next_step || '').trim();
  if (!suggested) return null;
  return mappingObj[suggested] || null;
}

async function emitWorkflowWebhook(funder, eventType, payload) {
  const db = await readDatabase();
  const config = db.webhooks[funder.id];
  const timestamp = new Date().toISOString();

  if (!config?.url) {
    return {
      configured: false,
      delivered: false,
      skipped_reason: 'no_webhook_config',
      timestamp,
    };
  }

  const envelope = {
    event: `tgm.funder-intelligence.${eventType}`,
    funder_id: funder.id,
    timestamp,
    payload: {
      ...payload,
      mapped_stage: mapSuggestedStage(config.mapping, payload),
    },
  };

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: buildWebhookHeaders(config),
      body: JSON.stringify(envelope),
    });

    const responseText = await response.text();
    const delivered = response.status >= 200 && response.status < 300;

    await withDatabase((nextDb) => {
      nextDb.auditLogs.push({
        id: createId('log'),
        type: delivered ? 'webhook_delivery_succeeded' : 'webhook_delivery_failed',
        funder_id: funder.id,
        event_type: eventType,
        status_code: response.status,
        created_at: timestamp,
      });
      return nextDb;
    });

    return {
      configured: true,
      delivered,
      status_code: response.status,
      response_preview: responseText.slice(0, 300),
      timestamp,
    };
  } catch (error) {
    await withDatabase((nextDb) => {
      nextDb.auditLogs.push({
        id: createId('log'),
        type: 'webhook_delivery_error',
        funder_id: funder.id,
        event_type: eventType,
        error_message: error.message || 'Unknown webhook error',
        created_at: timestamp,
      });
      return nextDb;
    });

    return {
      configured: true,
      delivered: false,
      error: error.message || 'Unknown webhook error',
      timestamp,
    };
  }
}

// ---------------------------------------------------------------------------
// Internal provisioning — called only via /internal/* routes (secret-gated)
// ---------------------------------------------------------------------------

async function provisionInternalFunder({ name, orgName, email, planTier = 'scale', keyScope = 'production', rubric } = {}) {
  const db = await readDatabase();

  // Idempotent: find existing funder by org_email or org_name match
  const existingKeyEntry = Object.entries(db.apiKeys)
    .find(([, v]) => v.org_email === email || v.org_name === orgName);
  if (existingKeyEntry) {
    const [existingKey, existingKeyRecord] = existingKeyEntry;
    const existingFunder = db.funders[existingKeyRecord.funder_id];
    if (existingFunder) {
      return { funder_id: existingFunder.id, api_key: existingKey, plan_tier: existingFunder.plan_tier, already_existed: true };
    }
  }

  const criteria = rubric?.criteria?.length
    ? normalizeRubricCriteria(rubric.criteria)
    : getDefaultEnterpriseRubric().criteria;

  const funderId = createId('funder');
  const apiKey = createApiKey(keyScope);
  const now = nowIso();

  const funderRecord = buildFunderRecord({ funderId, name: name || orgName, payload: {}, criteria, now, tier: planTier });
  funderRecord.account_status = 'active';
  funderRecord.org_email = email;
  funderRecord.org_name = orgName;

  await withDatabase((nextDb) => {
    nextDb.funders[funderId] = funderRecord;
    nextDb.apiKeys[apiKey] = {
      funder_id: funderId,
      created_at: now,
      label: 'primary',
      key_scope: keyScope,
      org_name: orgName,
      org_email: email,
      last_used_at: null,
      revoked_at: null,
      expires_at: null,
    };
    nextDb.auditLogs.push({ id: createId('log'), type: 'internal_funder_provisioned', funder_id: funderId, created_at: now });
    return nextDb;
  });

  return { funder_id: funderId, api_key: apiKey, plan_tier: planTier, already_existed: false };
}

async function activateCycleEntitlement({ funderId, cycleId, planKey, applicationsAllowed, stripePaymentIntentId, expiresAt } = {}) {
  if (!funderId || !cycleId) throw new Error('funderId and cycleId are required.');
  const now = nowIso();

  await withDatabase((db) => {
    const existing = db.entitlements[cycleId];
    db.entitlements[cycleId] = {
      cycle_id: cycleId,
      funder_id: funderId,
      plan_key: planKey || 'scale',
      applications_allowed: Number(applicationsAllowed) || 50,
      applications_used: existing?.applications_used || 0,
      status: 'active',
      stripe_payment_intent_id: stripePaymentIntentId || null,
      activated_at: existing?.activated_at || now,
      expires_at: expiresAt || null,
    };
    if (!db.cycleUsage[cycleId]) db.cycleUsage[cycleId] = [];
    db.auditLogs.push({ id: createId('log'), type: 'cycle_entitlement_activated', funder_id: funderId, cycle_id: cycleId, created_at: now });
    return db;
  });

  return { cycle_id: cycleId, funder_id: funderId, status: 'active' };
}

/**
 * Validates that funderId has an active, non-expired, non-exhausted entitlement for cycleId.
 * Throws an error with a statusCode property if the check fails.
 * Must be called with a pre-read db snapshot to avoid extra I/O in hot paths.
 */
function assertCycleEntitlement(db, funderId, cycleId) {
  const entitlement = db.entitlements[cycleId];
  if (!entitlement) {
    const err = new Error(`No active cycle entitlement for cycle_id "${cycleId}". Complete checkout to activate this cycle.`);
    err.statusCode = 402;
    throw err;
  }
  if (entitlement.funder_id !== funderId) {
    const err = new Error('Cycle entitlement does not belong to this funder.');
    err.statusCode = 403;
    throw err;
  }
  if (entitlement.status !== 'active') {
    const err = new Error(`Cycle entitlement status is "${entitlement.status}". An active paid cycle is required.`);
    err.statusCode = 402;
    throw err;
  }
  if (entitlement.expires_at && new Date(entitlement.expires_at) < new Date()) {
    const err = new Error('Cycle entitlement has expired. Renew to continue scoring.');
    err.statusCode = 402;
    throw err;
  }
  if (entitlement.applications_used >= entitlement.applications_allowed) {
    const err = new Error(
      `Cycle quota reached (${entitlement.applications_used}/${entitlement.applications_allowed}). Contact TGM to increase your cycle limit.`
    );
    err.statusCode = 429;
    throw err;
  }
  return entitlement;
}

async function recordCycleUsage(cycleId, appId) {
  if (!cycleId || !appId) return;
  await withDatabase((db) => {
    if (!db.cycleUsage[cycleId]) db.cycleUsage[cycleId] = [];
    if (!db.cycleUsage[cycleId].includes(appId)) {
      db.cycleUsage[cycleId].push(appId);
      if (db.entitlements[cycleId]) {
        db.entitlements[cycleId].applications_used = db.cycleUsage[cycleId].length;
      }
    }
    return db;
  });
}

module.exports = {
  buildCycleIntelligence,
  buildEnterpriseMonthlyReport,
  confirmEnterpriseRubricDeployment,
  createEnterpriseFunder,
  createEnterpriseSupportTicket,
  emitWorkflowWebhook,
  getEnterpriseHeartbeat,
  evaluateFunderFit,
  getFunderById,
  parseEnterpriseRubric,
  recordRequestMetric,
  registerFunder,
  scoreApplication,
  scoreBatch,
  upsertWebhookConfig,
  updateEnterpriseConfig,
  validateAndResolveFunder,
  // Cycle entitlement & internal provisioning
  activateCycleEntitlement,
  assertCycleEntitlement,
  provisionInternalFunder,
  recordCycleUsage,
};
