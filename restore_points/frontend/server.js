
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
// Replace with your actual LemonSqueezy webhook signing secret
const LEMONSQUEEZY_SIGNING_SECRET = 'YOUR_LEMONSQUEEZY_SIGNING_SECRET';

const app = express();

// HMAC SHA256 signature verification
function verifySignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

// LemonSqueezy webhook endpoint
app.post('/api/lemon-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-signature'] || req.headers['X-Signature'];
  const rawBody = req.body;
  const payload = rawBody instanceof Buffer ? rawBody.toString('utf8') : rawBody;

  if (!signature || !verifySignature(payload, signature, LEMONSQUEEZY_SIGNING_SECRET)) {
    console.log('LemonSqueezy webhook signature verification failed.');
    return res.status(403).send('Invalid signature');
  }

  let data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    return res.status(400).send('Invalid JSON');
  }

  // Example LemonSqueezy payload structure:
  // {
  //   "meta": { ... },
  //   "event_name": "order_created",
  //   "data": {
  //     "id": 123,
  //     "customer_email": "user@example.com",
  //     ...
  //   }
  // }

  const event = data.event_name;
  const customerEmail = data.data && data.data.customer_email;
  const customerId = data.data && data.data.customer_id;

  if (event === 'order_created' || event === 'subscription_created') {
    // Find user by email (or LemonSqueezy customer ID if you store it)
    let user = users.find(u => u.email === customerEmail);
    if (user) {
      user.tier = 'starter';
      upgrades.push({ email: customerEmail, tier: 'starter', date: new Date(), source: 'lemon' });
      console.log(`User upgraded to Starter via LemonSqueezy: ${customerEmail}`);
      // Optionally: send welcome email, etc.
    } else {
      // Optionally: create user if not found, or log for manual review
      console.log(`LemonSqueezy webhook: No user found for email ${customerEmail}`);
    }
    return res.status(200).send('Webhook processed');
  }

  return res.status(200).send('Event ignored');
});

const PORT = 4000;

app.use(cors());
app.use(express.json());


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


// --- Serve static assets from Vite build output (dist) ---
const path = require('path');
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));


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
