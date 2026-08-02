const express = require('express');
const {
  buildEnterpriseMonthlyReport,
  confirmEnterpriseRubricDeployment,
  createEnterpriseSupportTicket,
  registerFunder,
  getFunderById,
  getEnterpriseHeartbeat,
  parseEnterpriseRubric,
  recordRequestMetric,
  validateAndResolveFunder,
  scoreApplication,
  evaluateFunderFit,
  emitWorkflowWebhook,
  scoreBatch,
  buildCycleIntelligence,
  upsertWebhookConfig,
  updateEnterpriseConfig,
  provisionInternalFunder,
  activateCycleEntitlement,
} = require('./lib/service');
const { requireApiKey } = require('./lib/auth');

const app = express();
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Internal secret middleware — protects provisioning routes from public access
// ---------------------------------------------------------------------------
function requireInternalSecret(req, res, next) {
  const secret = process.env.FUNDER_INTELLIGENCE_INTERNAL_SECRET;
  if (!secret) {
    return res.status(503).json({ message: 'Internal provisioning is not configured on this service.' });
  }
  const provided = String(req.header('x-internal-secret') || '').trim();
  if (!provided || provided !== secret) {
    return res.status(401).json({ message: 'Invalid or missing internal secret.' });
  }
  return next();
}

app.get('/health', (_req, res) => {
  res.status(200).json({
    service: 'funder-intelligence-api',
    status: 'ok',
    timestamp: Date.now(),
  });
});

// POST /funder/register is now internal-only — public registration is disabled
app.post('/funder/register', requireInternalSecret, async (req, res) => {
  try {
    const result = await registerFunder(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Funder registration failed.' });
  }
});

// Internal: provision a funder (idempotent by orgName+email)
app.post('/internal/funders/provision', requireInternalSecret, async (req, res) => {
  try {
    const result = await provisionInternalFunder(req.body || {});
    return res.status(result.already_existed ? 200 : 201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Provisioning failed.' });
  }
});

// Internal: activate a paid cycle entitlement for a funder
app.post('/internal/cycles/activate', requireInternalSecret, async (req, res) => {
  try {
    const result = await activateCycleEntitlement(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Cycle activation failed.' });
  }
});

app.use(requireApiKey);

function requireEnterprise(req, res, next) {
  if (String(req.auth?.funder?.plan_tier || '').toLowerCase() !== 'enterprise') {
    return res.status(403).json({ message: 'Enterprise tier required for this endpoint.' });
  }
  return next();
}

async function monitorRequest(funder, eventType, statusCode, startMs) {
  if (!funder) return;
  const duration = Date.now() - startMs;
  try {
    await recordRequestMetric(funder, eventType, statusCode, duration);
  } catch (error) {
    console.error('[ENTERPRISE METRICS] failed to record metric', error?.message || error);
  }
}

app.post('/application/score', async (req, res) => {
  const startedAt = Date.now();
  let funder = null;
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {});
    funder = payload.funder;
    const score = scoreApplication(payload.funder, payload.application);
    const webhookDelivery = await emitWorkflowWebhook(payload.funder, 'application.score', score);
    const response = { ...score, webhook_delivery: webhookDelivery };
    await monitorRequest(payload.funder, 'application.score', 200, startedAt);
    return res.status(200).json(response);
  } catch (error) {
    await monitorRequest(funder || req.auth?.funder, 'application.score', 400, startedAt);
    return res.status(400).json({ message: error.message || 'Application scoring failed.' });
  }
});

app.post('/application/funder-fit', async (req, res) => {
  const startedAt = Date.now();
  let funder = null;
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {});
    funder = payload.funder;
    const fit = evaluateFunderFit(payload.funder, payload.application);
    const webhookDelivery = await emitWorkflowWebhook(payload.funder, 'application.funder-fit', fit);
    const response = { ...fit, webhook_delivery: webhookDelivery };
    await monitorRequest(payload.funder, 'application.funder-fit', 200, startedAt);
    return res.status(200).json(response);
  } catch (error) {
    await monitorRequest(funder || req.auth?.funder, 'application.funder-fit', 400, startedAt);
    return res.status(400).json({ message: error.message || 'Funder-fit evaluation failed.' });
  }
});

app.post('/batch/score', async (req, res) => {
  const startedAt = Date.now();
  let funder = null;
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {});
    funder = payload.funder;
    const result = await scoreBatch(payload.funder, payload.body, payload.applicationList);
    const webhookDelivery = await emitWorkflowWebhook(payload.funder, 'batch.score', result);
    const response = { ...result, webhook_delivery: webhookDelivery };
    await monitorRequest(payload.funder, 'batch.score', 200, startedAt);
    return res.status(200).json(response);
  } catch (error) {
    await monitorRequest(funder || req.auth?.funder, 'batch.score', 400, startedAt);
    return res.status(400).json({ message: error.message || 'Batch scoring failed.' });
  }
});

app.post('/cycle/intelligence', async (req, res) => {
  const startedAt = Date.now();
  let funder = null;
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {});
    funder = payload.funder;
    const result = await buildCycleIntelligence(payload.funder, payload.body, payload.applicationList);
    const webhookDelivery = await emitWorkflowWebhook(payload.funder, 'cycle.intelligence', result);
    const response = { ...result, webhook_delivery: webhookDelivery };
    await monitorRequest(payload.funder, 'cycle.intelligence', 200, startedAt);
    return res.status(200).json(response);
  } catch (error) {
    await monitorRequest(funder || req.auth?.funder, 'cycle.intelligence', 400, startedAt);
    return res.status(400).json({ message: error.message || 'Cycle intelligence failed.' });
  }
});

app.post('/webhook/config', async (req, res) => {
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {}, { allowMissingApplications: true });
    const result = await upsertWebhookConfig(payload.funder, payload.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Webhook configuration failed.' });
  }
});

app.get('/funder/:funderId', async (req, res) => {
  try {
    const funder = await getFunderById(req.params.funderId);
    if (!funder) {
      return res.status(404).json({ message: 'Funder not found.' });
    }
    return res.status(200).json({ funder });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to fetch funder.' });
  }
});

app.post('/enterprise/config', requireEnterprise, async (req, res) => {
  try {
    await updateEnterpriseConfig(req.auth.funder, req.body || {});
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Enterprise config update failed.' });
  }
});

app.post('/enterprise/rubric/parse', requireEnterprise, async (req, res) => {
  try {
    const result = await parseEnterpriseRubric(req.auth.funder, req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Rubric parse failed.' });
  }
});

app.post('/enterprise/rubric/confirm', requireEnterprise, async (req, res) => {
  try {
    const result = await confirmEnterpriseRubricDeployment(req.auth.funder, req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Rubric deployment failed.' });
  }
});

app.get('/enterprise/sla/heartbeat', requireEnterprise, async (req, res) => {
  try {
    const result = await getEnterpriseHeartbeat(req.auth.funder);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'SLA heartbeat failed.' });
  }
});

app.post('/enterprise/support/ticket', requireEnterprise, async (req, res) => {
  try {
    const ticket = await createEnterpriseSupportTicket(req.auth.funder, req.body || {});
    return res.status(201).json({ ticket });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Support ticket creation failed.' });
  }
});

app.post('/enterprise/reports/monthly', requireEnterprise, async (req, res) => {
  try {
    const report = await buildEnterpriseMonthlyReport(req.auth.funder, req.body || {});
    return res.status(200).json({ report });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Monthly report generation failed.' });
  }
});

module.exports = app;
