const express = require('express');
require('dotenv').config(); // Railway injects env vars directly; dotenv is a no-op there
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { validateUpload } = require('./utils/uploadValidation');
const https = require('https');
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

// Mount webhook routes BEFORE express.json() so raw body is preserved for HMAC signature verification
app.use('/api/webhooks', stripeWebhooksRouter);
app.use('/api/stripe', stripeWebhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const checkoutRoutes = require('./routes/checkout');
const teamRoutes = require('./routes/team');
const teamInvitesRoutes = require('./routes/teamInvites');
const authRoutes = require('./routes/auth');
const draftsRoutes = require('./routes/drafts');
const assistantRoutes = require('./routes/assistant');
const { agentLimiter, uploadLimiter, funderIntakeLimiter, steveLimiter } = require('./middleware/rateLimit');
const requireAuth = require('./middleware/auth');
const { requireFeature } = require('./middleware/tierAuth');

// Health check endpoint â€” used by Railway and monitoring systems
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
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
    res.json({ success: false, error: error.message });
  }
});

// MongoDB support removed â€” using Prisma for persistence where applicable

const founderAuditRoutes = require('./routes/founderAudit');
const adminRoutes = require('./routes/admin');
const billingRoutes = require('./routes/billing');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { scoreDraft } = require('./agents/steve/scoring');

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
app.use('/api/team', teamRoutes);
app.use('/api/team', teamInvitesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/assistant', steveLimiter, assistantRoutes);
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
    return res.json({
      success: true,
      score: report.score,
      label: report.label,
      criteria: report.criteria,
      criteriaDefs: report.criteriaDefs,
      strengths: report.strengths || [],
      weaknesses: report.weaknesses || [],
      missingComponents: report.missingComponents || [],
      fixes: report.fixes || [],
      style: report.style,
      ...stats,
    });
  } catch (error) {
    console.error('[SCORE] failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Scoring failed. Please try again.' });
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
app.get('/health', (req, res) => res.json({ status: 'ok' }));


// Global error handler — ensures every unhandled error returns JSON instead of dropping the connection
app.use(function(err, req, res, next) {
  console.error('[SERVER ERROR]', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
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


