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

router.post('/add', async (req, res) => {
  const { sanitizeInput } = require('../utils/sanitize');
  const sendInviteEmail = require('../utils/sendInviteEmail');
  const email = sanitizeInput(req.body.email);
  const inviterName = req.body.inviterName || 'A GrantsMaster user';
  if (!email) return res.json({ success: false, message: 'Email required.' });

  team.pendingInvites.push({ email, status: 'pending' });

  const inviteLink = `${process.env.APP_URL || 'https://grantsmaster.com'}/signup?invite=${encodeURIComponent(email)}`;
  try {
    await sendInviteEmail(email, inviterName, inviteLink);
    res.json({ success: true, message: `Invite sent to ${email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
