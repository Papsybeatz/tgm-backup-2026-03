const express = require('express');
const {
  registerFunder,
  getFunderById,
  validateAndResolveFunder,
  scoreApplication,
  evaluateFunderFit,
  scoreBatch,
  buildCycleIntelligence,
  upsertWebhookConfig,
} = require('./lib/service');
const { requireApiKey } = require('./lib/auth');

const app = express();
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    service: 'funder-intelligence-api',
    status: 'ok',
    timestamp: Date.now(),
  });
});

app.post('/funder/register', async (req, res) => {
  try {
    const result = await registerFunder(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Funder registration failed.' });
  }
});

app.use(requireApiKey);

app.post('/application/score', async (req, res) => {
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {});
    const score = scoreApplication(payload.funder, payload.application);
    return res.status(200).json(score);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Application scoring failed.' });
  }
});

app.post('/application/funder-fit', async (req, res) => {
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {});
    const fit = evaluateFunderFit(payload.funder, payload.application);
    return res.status(200).json(fit);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Funder-fit evaluation failed.' });
  }
});

app.post('/batch/score', async (req, res) => {
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {});
    const result = await scoreBatch(payload.funder, payload.body, payload.applicationList);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Batch scoring failed.' });
  }
});

app.post('/cycle/intelligence', async (req, res) => {
  try {
    const payload = validateAndResolveFunder(req.auth, req.body || {});
    const result = await buildCycleIntelligence(payload.funder, payload.body, payload.applicationList);
    return res.status(200).json(result);
  } catch (error) {
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

module.exports = app;
