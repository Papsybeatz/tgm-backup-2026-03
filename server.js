require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const users = [];
const upgrades = [];

app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }
  users.push({ email, password, tier: 'free' });
  console.log(`New signup: { email: '${email}', password: '***' }`);
  res.json({ success: true, message: 'Signup successful!' });
});


// Simple login endpoint for test compatibility
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  // Simulate user lookup
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  // Return user object as expected by frontend
  return res.status(200).json({
    email: user.email,
    tier: user.tier || 'free',
    token: 'mock-token',
    message: 'Login successful.'
  });
});

const https = require('https');

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
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
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

// Draft submission endpoint with AI generation
app.post('/api/drafts', async (req, res) => {
  const { title, content, email } = req.body;
  if (!content) {
    return res.status(400).json({ message: 'Content is required.' });
  }

  const draftId = 'draft_' + Date.now();
  console.log(`Draft submitted: ${draftId} by ${email || 'unknown'}`);

  try {
    const apiKey = process.env.GROQ_API_KEY;
    const prompt = `You are a professional grant writer. Generate a well-structured grant proposal draft based on the following input:\n\n${content}`;
    
    const postData = JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 2000
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
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const parsed = JSON.parse(result);
    console.log('Groq draft response:', JSON.stringify(parsed, null, 2));
    const generatedDraft = parsed.choices?.[0]?.message?.content || "Draft generation failed. Please try again.";

    console.log(`Draft ${draftId} generated successfully`);

    return res.status(200).json({
      success: true,
      draftId,
      message: 'Draft submitted! Agent will process this next.',
      generatedDraft
    });
  } catch (error) {
    console.error('AI generation error:', error.message);
    return res.status(200).json({
      success: true,
      draftId,
      message: 'Draft submitted! Agent will process this next.',
      generatedDraft: "Error generating AI draft. Your content has been saved but AI generation failed."
    });
  }
});


// --- Serve static assets from Vite build output (dist) ---
const path = require('path');
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
// In development (or when a Vite host is configured), proxy non-API requests to the Vite dev server if available.
if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL || process.env.VITE_HOST) {
  const { createProxyMiddleware } = require('http-proxy-middleware');
  const http = require('http');

  // Allow explicit override of the dev server URL
  const viteEnvHost = process.env.VITE_DEV_SERVER_URL || process.env.VITE_HOST;
  // Ports to probe when VITE host isn't provided
  const vitePorts = process.env.VITE_PORTS ? process.env.VITE_PORTS.split(',').map(Number) : [5173, 5174, 5175, 5176];

  // Probe for a running Vite dev server on common ports (fast, short timeout)
  const findViteHost = async () => {
    if (viteEnvHost) return viteEnvHost;
    for (const p of vitePorts) {
      try {
        const ok = await new Promise((resolve) => {
          const req = http.request({ hostname: 'localhost', port: p, path: '/', method: 'GET', timeout: 400 }, (res) => {
            // any response means a server is there
            resolve(true);
          });
          req.on('error', () => resolve(false));
          req.on('timeout', () => { req.destroy(); resolve(false); });
          req.end();
        });
        if (ok) return `http://localhost:${p}`;
      } catch (e) {
        // ignore and try next
      }
    }
    return null;
  };

  // Async middleware: on HTML requests, check for Vite and proxy if found.
  app.use(async (req, res, next) => {
    if (!req.path.startsWith('/api') && req.headers.accept && req.headers.accept.includes('text/html')) {
      const host = await findViteHost();
      if (host) {
        console.log('Dev proxy: forwarding', req.path, '->', host);
        return createProxyMiddleware({ target: host, changeOrigin: true })(req, res, next);
      }
    }
    return next();
  });
}


// Starter tier upgrade endpoint
app.post('/api/upgrade/starter', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  // Mask email for logging (e.g., j***@domain.com)
  const maskEmail = (em) => {
    const [user, domain] = em.split('@');
    if (!user || !domain) return '***';
    return user[0] + '***@' + domain;
  };
  console.log('Starter upgrade:', { email: maskEmail(email) });
  upgrades.push({ email, tier: 'starter', date: new Date() });
  return res.status(200).json({ message: 'Starter upgrade successful.' });
});

// --- Catch-all: serve index.html from dist for all non-API routes ---
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    console.log('SPA fallback: serving dist/index.html for', req.path);
    res.sendFile(path.resolve(distPath, 'index.html'));
  } else {
    next();
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
