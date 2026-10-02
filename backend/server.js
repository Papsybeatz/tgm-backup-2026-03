const express = require('express');
require('dotenv').config(); // Railway injects env vars directly; dotenv is a no-op there
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { validateUpload } = require('./utils/uploadValidation');
const https = require('https');
const { errorDetail } = require('./utils/errorDetail');
const { ensureSchema } = require('./utils/ensureSchema');
const { baselineMigrations } = require('./utils/baselineMigrations');
const app = express();

const CANONICAL_HOST = 'www.thegrantsmaster.com';
const ROOT_HOST      = 'thegrantsmaster.com';


// CORS — allows production frontend and localhost dev; override via CORS_ALLOWED_ORIGINS env var
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',').map(function(o) { return o.trim(); }).filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // same-origin, curl, health checks
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: origin ' + origin + ' not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
}));

// Canonical host redirect (non-www -> www) in production.
app.use(function(req, res, next) {
  const hostHeader = (req.headers.host || '').toLowerCase();
  const host = hostHeader.split(':')[0];
  if (process.env.NODE_ENV === 'production' && host === ROOT_HOST) {
    const target = `https://${CANONICAL_HOST}${req.originalUrl || '/'}`;
    return res.redirect(301, target);
  }
  return next();
});
// Trust Railway's reverse proxy so rate limiters use real client IPs
app.set('trust proxy', 1);
const stripeWebhooksRouter = require('./routes/webhooks/stripe');

// Request id + request-scoped context, mounted before anything else, so every
// captured failure can be tied back to the request that caused it.
const { requestContext } = require('./middleware/requestContext');
app.use(requestContext);

// Mount webhook routes BEFORE express.json() so raw body is preserved for HMAC signature verification
app.use('/api/webhooks', stripeWebhooksRouter);
app.use('/api/stripe', stripeWebhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const checkoutRoutes = require('./routes/checkout');
const teamInvitesRoutes = require('./routes/teamInvites');
const authRoutes = require('./routes/auth');
const draftsRoutes = require('./routes/drafts');
const assistantRoutes = require('./routes/assistant');
const { agentLimiter, uploadLimiter, funderIntakeLimiter, steveLimiter, steveHourlyLimiter } = require('./middleware/rateLimit');
const requireAuth = require('./middleware/auth');
const { requireFeature, TIERS } = require('./middleware/tierAuth');

// Health check endpoint â€” used by Railway and monitoring systems
// Cached readiness probe. Deliberately never changes the health status code:
// a database hiccup must not make Railway consider the service unhealthy.
let errorCaptureProbe = { ok: null, reason: null, checkedAt: 0 };

app.get('/health', async (req, res) => {
  const now = Date.now();
  if (errorCaptureProbe.ok === null || now - errorCaptureProbe.checkedAt > 60000) {
    const { verifyErrorCapture } = require('./utils/ensureSchema');
    const result = await verifyErrorCapture();
    errorCaptureProbe = { ok: result.ok, reason: result.reason || null, checkedAt: now };
  }

  res.status(200).json({
    status: 'ok',
    errorCapture: errorCaptureProbe.ok === true,
    ...(errorCaptureProbe.ok === false ? { errorCaptureReason: errorCaptureProbe.reason } : {}),
    timestamp: new Date().toISOString(),
  });
});

// Test AI endpoint using Groq API
app.get('/api/test-ai', async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    console.log('Testing Groq with key starting:', apiKey?.substring(0, 15));
    
    const postData = JSON.stringify({
      messages: [{ role: "user", content: "Hello" }],
      model: "llama-3.1-8b-instant",
      max_tokens: 50
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    const result = await new Promise((resolve, reject) => {
      const httpReq = https.request(options, (httpRes) => {
        let data = '';
        httpRes.on('data', chunk => data += chunk);
        httpRes.on('end', () => resolve(data));
      });
      httpReq.on('error', reject);
      httpReq.write(postData);
      httpReq.end();
    });

    const parsed = JSON.parse(result);
    console.log('Groq response:', JSON.stringify(parsed, null, 2));
    const response = parsed.choices?.[0]?.message?.content || 'No response';
    res.json({ success: true, response });
  } catch (error) {
    console.error('Groq error:', error.message);
    res.json({
      detail: errorDetail(error), success: false, error: error.message });
  }
});

// MongoDB support removed â€” using Prisma for persistence where applicable

const founderAuditRoutes = require('./routes/founderAudit');
const adminRoutes = require('./routes/admin');
const billingRoutes = require('./routes/billing');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { scoreDraft } = require('./agents/steve/scoring');
const { checkScoreQuota, applyScoreGate, FREE_SCORE_LIMIT, SCORE_ACTION } = require('./utils/scoreGate');
const { logAiAction } = require('./utils/logging');

app.post('/api/agency/request', async (req, res) => {
  const { name, org, email, teamSize } = req.body;
  if (!name || !org || !email || !teamSize) {
    return res.status(400).send('Missing required fields');
  }
  try {
    // Persisting agency requests in Mongo was removed; log and acknowledge.
    console.log('[AGENCY REQUEST] received', { name, org, email, teamSize });
    // Optionally, record to a mailbox or analytics pipeline here.
    res.status(200).send('Request received');
    // Simulate async approval task for demo purposes (no DB write)
    setTimeout(() => {
      console.log(`Agency request auto-approved for ${email} (no DB persistence)`);
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error('Agency request error:', err);
    res.status(500).send('Error processing request');
  }
});

app.use('/api/checkout', checkoutRoutes);
const contactRoutes = require('./routes/contact');
app.use('/api/contact', contactRoutes);
const leadMagnetRoutes = require('./routes/leadMagnet');
app.use('/api/lead-magnet', leadMagnetRoutes);
const funderApiRequestRoutes = require('./routes/funderApiRequest');
app.use('/api/funder-api', funderIntakeLimiter, funderApiRequestRoutes);
// routes/team.js (the in-memory stub) is deleted. It was mounted here FIRST,
// so it shadowed every DB-backed handler below and served hardcoded fake
// invite data. One router owns /api/team now.
app.use('/api/team', teamInvitesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/assistant', steveLimiter, steveHourlyLimiter, assistantRoutes);
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);
const documentsRoutes = require('./routes/documents');
app.use('/api/documents', documentsRoutes);
app.use('/api/drafts', draftsRoutes);
const clientsRoutes = require('./routes/clients');
app.use('/api/clients', clientsRoutes);
app.use('/api/founder', founderAuditRoutes);
app.use('/api/admin', adminRoutes);
const adminFundersRoutes = require('./routes/adminFunders');
app.use('/api/admin/funders', adminFundersRoutes);
app.use('/api/billing', billingRoutes);
const inviteRoutes = require('./routes/invite');
app.use('/api/invite', inviteRoutes);
app.use('/api/testimonials', require('./routes/testimonials'));
const funderReviewerRoutes = require('./routes/funderReviewer');
app.use('/api/funder', funderReviewerRoutes);

const upload = multer();
app.post('/api/upload', uploadLimiter, upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const result = validateUpload(file);
  if (!result.valid) return res.status(400).json({ success: false, message: result.reason });
  res.json({ success: true, message: 'File uploaded and validated.' });
});

// Tier-gated AI agent endpoint â€” requires ai_rewrite (starter+)
// Retirement notice: this returned { success: true, message: 'Agent call
// processed.' } without doing anything. Steve owns drafting and rewrites now.
app.post('/api/agent/call', agentLimiter, requireAuth, requireFeature('ai_rewrite'), (req, res) => {
  res.status(410).json({
    success: false,
    error: 'gone',
    message: 'This legacy agent endpoint has been retired. Steve, the grant concierge, handles drafting and rewrites on every plan.',
    useInstead: '/api/assistant',
  });
});

// Tier-gated matching endpoint â€” requires matching_engine (pro+)
// NOT IMPLEMENTED. This returned { success: true, message: 'Matching engine
// processed.' } — a paying customer was told matching ran when it never did.
// Funder matching is not built; advertising it on a paid tier is the real
// problem, so this fails honestly until it exists.
app.post('/api/match', requireAuth, requireFeature('matching_engine'), (req, res) => {
  res.status(501).json({
    success: false,
    error: 'not_implemented',
    message: 'Funder matching is not available yet. Checkmate scoring and funder alignment are available now.',
  });
});

// Scoring endpoint — Checkmate, the single scoring engine for the whole product.
//
// This used to be a word-count heuristic (words/120 + headings*2 + ...), which
// meant the editor and Steve scored the same document differently. It now runs
// the same rubric Steve uses, pulling the order ticket off the draft when a
// draftId is supplied.
app.post('/api/score', requireAuth, requireFeature('scoring_basic'), async (req, res) => {
  const content = String(req.body?.content || '');
  const draftId = req.body?.draftId ? String(req.body.draftId) : null;

  // Model A: Free is metered. Count prior scores from the usage ledger before
  // doing any work, so a rejected request never costs an LLM call.
  let priorScores = 0;
  if ((TIERS[req.user.tier] ? req.user.tier : 'free') === 'free') {
    try {
      priorScores = await prisma.aiLog.count({
        where: { userId: req.user.id, action: SCORE_ACTION },
      });
    } catch (e) {
      // Fail OPEN: a metering outage must not block a real user from scoring.
      console.warn('[SCORE] could not read score usage:', e?.message || e);
    }
  }
  const quota = checkScoreQuota(req.user.tier, priorScores);
  if (!quota.allowed) {
    return res.status(402).json({
      success: false,
      error: quota.reason,
      message: `You've used all ${FREE_SCORE_LIMIT} free Checkmate scores. Upgrade to Starter for unlimited scoring and the recommended fixes.`,
      limit: quota.limit,
      used: quota.used,
      remaining: 0,
      upgradeUrl: '/pricing',
    });
  }

  // Structural stats are cheap and the Fit insights panel shows them, so they
  // must not cost an LLM call.
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const stats = {
    words: text ? text.split(/\s+/).length : 0,
    headings: (content.match(/<h2[^>]*>/gi) || []).length,
    bullets: (content.match(/<li[^>]*>/gi) || []).length,
    numbers: (text.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length,
  };
  stats.sections = Math.max(stats.headings, 1);

  let order = {};
  if (draftId) {
    try {
      const draft = await prisma.draft.findFirst({ where: { id: draftId, userId: req.user.id } });
      if (draft?.order && typeof draft.order === 'object') order = draft.order;
    } catch (e) {
      // Fall through to an order-less score rather than failing the request.
      console.warn('[SCORE] could not load draft order:', e?.message || e);
    }
  }

  try {
    const report = await scoreDraft(order, content, { style: order?.style });

    // Record the score in the usage ledger the quota reads back. Awaited so the
    // next request counts it, but a ledger failure must not fail the score.
    try {
      await logAiAction(req.user.id, SCORE_ACTION);
    } catch (e) {
      console.warn('[SCORE] could not record score usage:', e?.message || e);
    }

    // Model A: Free keeps the diagnosis and loses the fixes.
    const gated = applyScoreGate(req.user.tier, report);

    return res.json({
      success: true,
      score: gated.score,
      label: gated.label,
      criteria: gated.criteria,
      criteriaDefs: gated.criteriaDefs,
      strengths: gated.strengths || [],
      weaknesses: gated.weaknesses || [],
      missingComponents: gated.missingComponents || [],
      fixes: gated.fixes || [],
      fixesLocked: gated.fixesLocked,
      style: gated.style,
      scoreQuota: { used: quota.used + 1, remaining: quota.remaining - 1, limit: FREE_SCORE_LIMIT },
      ...stats,
    });
  } catch (error) {
    console.error('[SCORE] failed:', error?.message || error);
    return res.status(500).json({
      detail: errorDetail(error), success: false, message: 'Scoring failed. Please try again.' });
  }
});

// Tier-gated analytics endpoint â€” requires analytics_advanced (pro+)
// NOT IMPLEMENTED. Same defect as /api/match: it claimed success and returned a
// placeholder string. Pro and Agency list advanced analytics, so this needs
// either building or removing from the plan copy.
app.get('/api/analytics', requireAuth, requireFeature('analytics_advanced'), (req, res) => {
  res.status(501).json({
    success: false,
    error: 'not_implemented',
    message: 'Advanced analytics is not available yet.',
  });
});

// Tier-gated agency endpoints â€” requires client_folders (agency+)
app.use('/api/agency', requireAuth, requireFeature('client_folders'));

// Health check for Railway
// The readiness probe lives on the health route above — the one that actually
// matches. This duplicate was unreachable dead code.


// Global error handler.
//
// Every unhandled error is captured with full context — account, tier,
// endpoint, request id — before a response goes out, so a real user's failure
// is something you can act on rather than a console line that scrolls away.
// It also stops leaking raw internal messages to the client on a 5xx.
app.use(async function(err, req, res, next) {
  try {
    const status = Number.isInteger(err?.status || err?.statusCode)
      ? (err.status || err.statusCode)
      : 500;

    const { captureError } = require('./utils/logging');
    await captureError({
      error: err,
      source: 'http',
      severity: status >= 500 ? 'error' : 'warning',
      status,
      method: req.method,
      path: String(req.originalUrl || req.path || '').split('?')[0],
      requestId: req.requestId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      tier: req.user?.tier,
      meta: { query: req.query },
    });

    if (res.headersSent) return next(err);
    return res.status(status).json({
      success: false,
      message: status >= 500 ? 'Something went wrong on our end.' : (err.message || 'Request failed'),
      requestId: req.requestId,
    });
  } catch (handlerError) {
    console.error('[SERVER ERROR] handler failed:', handlerError?.message || handlerError);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    return next(err);
  }
});

// Failures that never reach Express: an unawaited promise, or a throw outside
// any request. These used to vanish silently or take the process down.
process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  require('./utils/logging').captureError({
    error,
    source: 'process',
    severity: 'critical',
    message: `Unhandled rejection: ${error.message}`,
  }).catch(() => {});
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] uncaught exception:', error);
  require('./utils/logging').captureError({
    error,
    source: 'process',
    severity: 'critical',
    message: `Uncaught exception: ${error?.message || error}`,
  }).catch(() => {});
});

const PORT = process.env.PORT || 4000;

// Print the provider environment at boot, at the top of the application logs.
// Names and presence only — never a key value.
//
// This exists because "is the container actually configured?" kept being
// answered from the Variables tab rather than from the process. That tab shows
// what is DESIRED; this line shows what the container HAS, and it is readable
// without making any HTTP call.
console.log(
  `[LLM] provider env -> LLM_PROVIDER=${process.env.LLM_PROVIDER || '(unset)'}` +
  ` | OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? 'present' : 'ABSENT'}` +
  ` | GROQ_API_KEY=${process.env.GROQ_API_KEY ? 'present' : 'ABSENT'}`,
);

ensureSchema()
  .catch((e) => console.error('[SCHEMA] unexpected error:', e?.message || e))
  .then(() => baselineMigrations())
  .catch((e) => console.error('[BASELINE] unexpected error:', e?.message || e))
  .finally(() => {
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`[BREVO] API key:         ${process.env.BREVO_API_KEY ? 'PRESENT âœ“' : 'MISSING âœ—'}`);
  console.log(`[BREVO] From email:      ${process.env.BREVO_FROM_EMAIL || 'MISSING âœ—'}`);
  console.log(`[BREVO] From name:       ${process.env.BREVO_FROM_NAME || 'MISSING âœ—'}`);
  console.log(`[BREVO] Funder list:     ${process.env.BREVO_FUNDER_LIST_ID || 'MISSING âœ—'}`);
  console.log(`[BREVO] Fallback list:   ${process.env.BREVO_LIST_ID || 'MISSING âœ—'}`);
  console.log(`[STRIPE] Secret key:      ${process.env.STRIPE_SECRET_KEY      ? 'PRESENT âœ“' : 'MISSING âœ—'}`);
  console.log(`[STRIPE] Webhook secret:  ${process.env.STRIPE_WEBHOOK_SECRET  ? 'PRESENT âœ“' : 'MISSING âœ—'}`);
  console.log(`[STRIPE] Starter price:   ${process.env.STRIPE_STARTER_PRICE_ID          || 'MISSING âœ—'}`);
  console.log(`[STRIPE] Pro price:       ${process.env.STRIPE_PRO_PRICE_ID               || 'MISSING âœ—'}`);
  console.log(`[STRIPE] Agency Starter:  ${process.env.STRIPE_AGENCY_STARTER_PRICE_ID   || 'MISSING âœ—'}`);
  console.log(`[STRIPE] Agency Unlim:    ${process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID || 'MISSING âœ—'}`);
  console.log(`[STRIPE] Lifetime price:  ${process.env.STRIPE_LIFETIME_PRICE_ID         || 'MISSING âœ—'}`);
  console.log(`[STRIPE] Funder Pilot:    ${process.env.STRIPE_FUNDER_PILOT_PRICE_ID     || 'MISSING âœ—'}`);
  console.log(`[STRIPE] Funder Scale:    ${process.env.STRIPE_FUNDER_SCALE_PRICE_ID     || 'MISSING âœ—'}`);
  console.log(`[STRIPE] Funder Ent:      ${process.env.STRIPE_FUNDER_ENTERPRISE_PRICE_ID || 'MISSING âœ—'}`);
});
});
