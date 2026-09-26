const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sendInviteEmail = require('../utils/sendInviteEmail');

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** The inviter's display name, so the email does not show a raw user id. */
async function resolveInviterName(inviterId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: inviterId } });
    return user?.name || user?.email?.split('@')[0] || 'A GrantsMaster user';
  } catch {
    return 'A GrantsMaster user';
  }
}

/**
 * The invite link.
 *
 * This used to be a hardcoded `https://grantsmaster.app/invite/accept` — a
different domain from the product (thegrantsmaster.com) and a route that does
 * not exist in the frontend, so the link led nowhere. It now uses the same
 * signup entry point the working team route uses.
 */
function buildInviteLink(inviteToken) {
  const base = process.env.APP_URL || 'https://www.thegrantsmaster.com';
  return `${base.replace(/\/+$/, '')}/signup?invite=${encodeURIComponent(inviteToken)}`;
}

// Helper: get seat usage for inviterId (stub, replace with real logic)
async function getSeatUsage(inviterId) {
  // Count accepted + pending invites for this inviter
  const count = await prisma.invite.count({
    where: {
      inviterId,
      status: { in: ['pending', 'accepted'] }
    }
  });
  // For demo, maxSeats = 10
  return { used: count, max: 10 };
}

const { requireAuth } = require('../middleware/roleAuth');
// POST /api/team/invite
router.post('/invite', requireAuth, async (req, res) => {
  const { sanitizeInput, validateEmail } = require('../utils/sanitize');
  const email = sanitizeInput(req.body.email);
  const inviterId = sanitizeInput(req.body.inviterId);
  const tier = sanitizeInput(req.body.tier);
  if (!validateEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email.' });
  if (tier !== 'agency-unlimited') return res.status(400).json({ success: false, message: 'Invalid tier.' });
  const { used, max } = await getSeatUsage(inviterId);
  if (used >= max) return res.status(400).json({ success: false, message: 'No available seats.' });
  const invite = await prisma.invite.create({
    data: {
      email,
      inviterId,
      tier,
      status: 'pending',
      sentAt: new Date(),
      acceptedAt: null
    }
  });
  // Two bugs fixed here: the inviter's UUID was being passed as their NAME, so
  // the email read "<uuid> invited you"; and the link pointed at a different
  // domain with a route that does not exist in the app.
  const inviterName = await resolveInviterName(inviterId);
  await sendInviteEmail(email, inviterName, buildInviteLink(invite.id));
  res.json({ success: true, invite });
});

// POST /api/team/cancel-invite
router.post('/cancel-invite', requireAuth, async (req, res) => {
  const { sanitizeInput } = require('../utils/sanitize');
  const email = sanitizeInput(req.body.email);
  const inviterId = sanitizeInput(req.body.inviterId);
  await prisma.invite.updateMany({
    where: { email, inviterId, status: 'pending' },
    data: { status: 'cancelled' }
  });
  const invites = await prisma.invite.findMany({ where: { inviterId } });
  res.json({ success: true, invites });
});

// POST /api/team/resend-invite
router.post('/resend-invite', requireAuth, async (req, res) => {
  const { sanitizeInput } = require('../utils/sanitize');
  const email = sanitizeInput(req.body.email);
  const inviterId = sanitizeInput(req.body.inviterId);
  const invite = await prisma.invite.findFirst({ where: { email, inviterId, status: 'pending' } });
  if (!invite) return res.status(404).json({ success: false, message: 'Invite not found.' });
  await prisma.invite.update({ where: { id: invite.id }, data: { sentAt: new Date() } });
  const inviterName = await resolveInviterName(inviterId);
  await sendInviteEmail(email, inviterName, buildInviteLink(invite.id));
  res.json({ success: true });
});

// GET /api/team/invites?inviterId=xyz
router.get('/invites', requireAuth, async (req, res) => {
  const { sanitizeInput } = require('../utils/sanitize');
  const inviterId = sanitizeInput(req.query.inviterId);
  if (!inviterId) return res.status(400).json({ success: false, message: 'Missing inviterId.' });
  const invites = await prisma.invite.findMany({ where: { inviterId } });
  res.json({ success: true, invites });
});

module.exports = router;
