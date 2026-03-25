// /backend/routes/invite.js
// POST /request-invite route for invite requests
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Simple file-based storage for demo (replace with DB in production)
const INVITE_REQUESTS_PATH = path.join(__dirname, '../data/inviteRequests.json');

function sanitize(str) {
  return String(str).replace(/[^\w@.\-\s]/g, '').trim();
}

function loadRequests() {
  if (!fs.existsSync(INVITE_REQUESTS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(INVITE_REQUESTS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveRequests(requests) {
  fs.writeFileSync(INVITE_REQUESTS_PATH, JSON.stringify(requests, null, 2));
}

router.post('/request-invite', (req, res) => {
  // CORS: allow public access
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  const { name, email, organization = '', reason = '' } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }
  const sanitized = {
    name: sanitize(name),
    email: sanitize(email),
    organization: sanitize(organization),
    reason: sanitize(reason),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  try {
    const requests = loadRequests();
    requests.push(sanitized);
    saveRequests(requests);
    return res.json({ success: true, message: 'Invite request received.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to save invite request.' });
  }
});

module.exports = router;
