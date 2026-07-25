const express = require('express');
require('dotenv').config(); // Railway injects env vars directly; dotenv is a no-op there
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { validateUpload } = require('./utils/uploadValidation');
const https = require('https');
const app = express();

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
const { agentLimiter, uploadLimiter } = require('./middleware/rateLimit');
const requireAuth = require('./middleware/auth');
const { requireFeature } = require('./middleware/tierAuth');

// Health check endpoint — used by Railway and monitoring systems
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

// MongoDB support removed — using Prisma for persistence where applicable

const founderAuditRoutes = require('./routes/founderAudit');
const adminRoutes = require('./routes/admin');
const billingRoutes = require('./routes/billing');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
app.use('/api/funder-api', funderApiRequestRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/team', teamInvitesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/assistant', assistantRoutes);
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);
const documentsRoutes = require('./routes/documents');
app.use('/api/documents', documentsRoutes);
app.use('/api/drafts', draftsRoutes);
const clientsRoutes = require('./routes/clients');
app.use('/api/clients', clientsRoutes);
app.use('/api/founder', founderAuditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);

const upload = multer();
app.post('/api/upload', uploadLimiter, upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const result = validateUpload(file);
  if (!result.valid) return res.status(400).json({ success: false, message: result.reason });
  res.json({ success: true, message: 'File uploaded and validated.' });
});

// Tier-gated AI agent endpoint — requires ai_rewrite (starter+)
app.post('/api/agent/call', agentLimiter, requireAuth, requireFeature('ai_rewrite'), (req, res) => {
  res.json({ success: true, message: 'Agent call processed.' });
});

// Tier-gated matching endpoint — requires matching_engine (pro+)
app.post('/api/match', requireAuth, requireFeature('matching_engine'), (req, res) => {
  res.json({ success: true, message: 'Matching engine processed.' });
});

// Tier-gated scoring endpoint — requires scoring_basic (starter+)
app.post('/api/score', requireAuth, requireFeature('scoring_basic'), (req, res) => {
  const content = String(req.body?.content || '');
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const headings = (content.match(/<h2[^>]*>/gi) || []).length;
  const bullets = (content.match(/<li[^>]*>/gi) || []).length;
  const numbers = (text.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const sections = Math.max(headings, 1);

  let score = 58;
  score += Math.min(14, Math.floor(words / 120));
  score += Math.min(10, headings * 2);
  score += Math.min(8, bullets * 2);
  score += Math.min(8, numbers * 2);
  score += sections >= 6 ? 8 : sections >= 4 ? 5 : sections >= 2 ? 3 : 0;
  score = Math.max(1, Math.min(100, score));

  const label = score >= 85 ? 'Strong' : score >= 70 ? 'Ready' : score >= 55 ? 'In Progress' : 'Needs Work';
  res.json({ success: true, score, label, words, sections, headings, bullets, numbers });
});

// Tier-gated analytics endpoint — requires analytics_advanced (pro+)
app.get('/api/analytics', requireAuth, requireFeature('analytics_advanced'), (req, res) => {
  res.json({ success: true, message: 'Analytics data.' });
});

// Tier-gated agency endpoints — requires client_folders (agency+)
app.use('/api/agency', requireAuth, requireFeature('client_folders'));

// Health check for Railway
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`[BREVO] API key:         ${process.env.BREVO_API_KEY ? 'PRESENT ✓' : 'MISSING ✗'}`);
  console.log(`[BREVO] From email:      ${process.env.BREVO_FROM_EMAIL || 'MISSING ✗'}`);
  console.log(`[BREVO] From name:       ${process.env.BREVO_FROM_NAME || 'MISSING ✗'}`);
  console.log(`[BREVO] Funder list:     ${process.env.BREVO_FUNDER_LIST_ID || 'MISSING ✗'}`);
  console.log(`[BREVO] Fallback list:   ${process.env.BREVO_LIST_ID || 'MISSING ✗'}`);
  console.log(`[STRIPE] Secret key:      ${process.env.STRIPE_SECRET_KEY      ? 'PRESENT ✓' : 'MISSING ✗'}`);
  console.log(`[STRIPE] Webhook secret:  ${process.env.STRIPE_WEBHOOK_SECRET  ? 'PRESENT ✓' : 'MISSING ✗'}`);
  console.log(`[STRIPE] Starter price:   ${process.env.STRIPE_STARTER_PRICE_ID          || 'MISSING ✗'}`);
  console.log(`[STRIPE] Pro price:       ${process.env.STRIPE_PRO_PRICE_ID               || 'MISSING ✗'}`);
  console.log(`[STRIPE] Agency Starter:  ${process.env.STRIPE_AGENCY_STARTER_PRICE_ID   || 'MISSING ✗'}`);
  console.log(`[STRIPE] Agency Unlim:    ${process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID || 'MISSING ✗'}`);
  console.log(`[STRIPE] Lifetime price:  ${process.env.STRIPE_LIFETIME_PRICE_ID         || 'MISSING ✗'}`);
});
