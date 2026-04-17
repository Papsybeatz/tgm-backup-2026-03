// /backend/routes/adminInvite.js
// Admin endpoints for invite approval dashboard
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const INVITE_REQUESTS_PATH = path.join(__dirname, '../data/inviteRequests.json');
const USERS_PATH = path.join(__dirname, '../data/users.json');
const APPROVED_EMAILS_PATH = path.join(__dirname, '../data/approvedEmails.json');
function loadApprovedEmails() {
  if (!fs.existsSync(APPROVED_EMAILS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(APPROVED_EMAILS_PATH, 'utf8'));
  } catch {
    return {};
  }
}
function saveApprovedEmails(emails) {
  fs.writeFileSync(APPROVED_EMAILS_PATH, JSON.stringify(emails, null, 2));
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
function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
  } catch {
    return {};
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function isAdmin(req) {
  // Simple admin check (replace with real auth in production)
  return req.user && req.user.isAdmin === true;
}

const { requireAdmin } = require('../middleware/roleAuth');
// GET /admin/invite-requests
router.get('/admin/invite-requests', requireAdmin, (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Unauthorized' });
  try {
    let requests = loadRequests();
    // Add id field (index in array), sort by createdAt descending
    requests = requests.map((r, i) => ({ id: i, ...r }));
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // Only return required fields
    const result = requests.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      organization: r.organization,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt
    }));
    return res.json({ success: true, requests: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load invite requests.' });
  }
});

// POST /admin/approve-invite
router.post('/admin/approve-invite', requireAdmin, (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Unauthorized' });
  const { requestId } = req.body || {};
  if (typeof requestId === 'undefined') return res.status(400).json({ success: false, message: 'Missing requestId' });
  let requests = loadRequests();
  if (!requests[requestId]) return res.status(404).json({ success: false, message: 'Request not found' });
  requests[requestId].status = 'approved';
  saveRequests(requests);
  // Set user.betaAccess = 'invited' if user exists, else store approval for future signup
  let users = loadUsers();
  const email = requests[requestId].email;
  if (users[email]) {
    users[email].betaAccess = 'invited';
    saveUsers(users);
  } else {
    // Store approval for future signup
    let approvedEmails = loadApprovedEmails();
    approvedEmails[email] = { approvedAt: new Date().toISOString() };
    saveApprovedEmails(approvedEmails);
  }
  return res.json({ success: true, message: 'Invite approved.' });
});

// POST /admin/deny-invite
router.post('/admin/deny-invite', requireAdmin, (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Unauthorized' });
  const { requestId } = req.body || {};
  if (typeof requestId === 'undefined') return res.status(400).json({ success: false, message: 'Missing requestId' });
  let requests = loadRequests();
  if (!requests[requestId]) return res.status(404).json({ success: false, message: 'Request not found' });
  requests[requestId].status = 'denied';
  saveRequests(requests);
  return res.json({ success: true, message: 'Invite denied.' });
});

module.exports = router;
