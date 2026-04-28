const express = require('express');
require('dotenv').config();
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { validateUpload } = require('./utils/uploadValidation');
const https = require('https');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const lemonWebhook = require('./routes/lemonWebhook');
const stripeWebhook = require('./routes/stripeWebhook');
const stripeWebhooksRouter = require('./routes/webhooks/stripe');
const checkoutRoutes = require('./routes/checkout');
const teamRoutes = require('./routes/team');
const teamInvitesRoutes = require('./routes/teamInvites');
const authRoutes = require('./routes/auth');
const draftsRoutes = require('./routes/drafts');
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
let prisma;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log('[DB] Prisma client loaded');
} catch (e) {
  console.error('[DB] Prisma client failed to load:', e.message);
}

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

app.use('/api', stripeWebhook);
app.use('/api', lemonWebhook);
app.use('/api/webhooks', stripeWebhooksRouter);
app.use('/api/checkout', checkoutRoutes);
const contactRoutes = require('./routes/contact');
app.use('/api/contact', contactRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/team', teamInvitesRoutes);
app.use('/api/auth', authRoutes);
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);
const documentsRoutes = require('./routes/documents');
app.use('/api/documents', documentsRoutes);
app.use('/api/drafts', draftsRoutes);
app.use('/api/founder', founderAuditRoutes);
app.use('/api/admin', adminRoutes);

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
  res.json({ success: true, message: 'Scoring engine processed.' });
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
});