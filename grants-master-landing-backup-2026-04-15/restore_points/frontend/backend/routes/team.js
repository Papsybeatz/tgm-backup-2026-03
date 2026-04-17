const express = require('express');
const router = express.Router();

// In-memory demo data (replace with DB in production)
let team = {
  used: 2,
  total: 10,
  pendingInvites: [
    { email: 'pending1@email.com', status: 'pending' },
    { email: 'pending2@email.com', status: 'pending' }
  ]
};

router.get('/status', (req, res) => {
  res.json(team);
});

router.post('/add', (req, res) => {
  const { sanitizeInput } = require('../utils/sanitize');
  const email = sanitizeInput(req.body.email);
  if (!email) return res.json({ success: false, message: 'Email required.' });
  team.pendingInvites.push({ email, status: 'pending' });
  // TODO: send invite email
  res.json({ success: true });
});

router.post('/remove', (req, res) => {
  const { sanitizeInput } = require('../utils/sanitize');
  const email = sanitizeInput(req.body.email);
  if (!email) return res.json({ success: false, message: 'Email required.' });
  // TODO: remove from team
  res.json({ success: true });
});

router.post('/resend-invite', (req, res) => {
  const { sanitizeInput } = require('../utils/sanitize');
  const email = sanitizeInput(req.body.email);
  // TODO: resend invite email
  res.json({ success: true });
});

router.post('/cancel-invite', (req, res) => {
  const { sanitizeInput } = require('../utils/sanitize');
  const email = sanitizeInput(req.body.email);
  team.pendingInvites = team.pendingInvites.filter(i => i.email !== email);
  res.json({ success: true });
});

module.exports = router;
