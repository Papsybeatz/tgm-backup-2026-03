const { computeFunderFit, computeScoring, cycleIntelligenceFromBatch, summarizeBatch } = require('./engines');
const { readDatabase, withDatabase } = require('./datastore');
const { createApiKey, createId, toArray } = require('./utils');

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

async function registerFunder(payload) {
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

  const funderRecord = {
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
    created_at: now,
    updated_at: now,
  };

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
    validation_report: validation,
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

module.exports = {
  buildCycleIntelligence,
  emitWorkflowWebhook,
  evaluateFunderFit,
  getFunderById,
  registerFunder,
  scoreApplication,
  scoreBatch,
  upsertWebhookConfig,
  validateAndResolveFunder,
};
