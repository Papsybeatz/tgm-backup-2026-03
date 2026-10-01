// /backend/routes/invite.js
// POST /request-invite route for invite requests
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth');
const { errorDetail } = require('../utils/errorDetail');

const prisma = new PrismaClient();
const router = express.Router();

// The waitlist used to be a JSON file under backend/data/. Railway's filesystem
// is ephemeral, so every redeploy destroyed it, and two concurrent submissions
// could clobber each other's write. It now lives in the InviteRequest table.

// Strip anything that is not a sensible character for the field. Kept from the
// file-based implementation so stored values do not change shape.
function sanitize(str) {
  return String(str == null ? '' : str).replace(/[^\w@.\-\s]/g, '').trim();
}

// A request really only needs an address. The caller may not know a name — the
// marketing form asks for an email alone — so derive one from the local part
// rather than rejecting a genuine lead.
function deriveName(name, email) {
  const cleaned = sanitize(name);
  if (cleaned) return cleaned;
  const local = String(email || '').split('@')[0] || '';
  return sanitize(local) || null;
}

function applyCors(res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
}

// The endpoint is advertised as public, so answer the cross-origin preflight.
router.options('/request-invite', (req, res) => {
  applyCors(res);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return res.sendStatus(204);
});

router.post('/request-invite', async (req, res) => {
  applyCors(res);

  const { name = '', email, organization = '', reason = '', tier = '' } = req.body || {};

  // Email is the one field we cannot invent.
  if (!sanitize(email)) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }

  const address = sanitize(email).toLowerCase();
  const derivedName = deriveName(name, address);
  const org = sanitize(organization);
  const rsn = sanitize(reason);
  const plan = sanitize(tier);

  // Only overwrite fields the caller actually supplied, so a bare resubmission
  // cannot wipe detail already captured.
  const update = {};
  if (derivedName) update.name = derivedName;
  if (org) update.organization = org;
  if (rsn) update.reason = rsn;
  if (plan) update.tier = plan;

  try {
    // Idempotent: a repeat submission refreshes the existing request rather than
    // queueing a duplicate, so the caller sees the same response either way.
    await prisma.inviteRequest.upsert({
      where: { email: address },
      create: {
        name: derivedName,
        email: address,
        organization: org || null,
        reason: rsn || null,
        tier: plan || null,
        status: 'pending',
      },
      update,
    });

    return res.json({ success: true, message: 'Invite request received.' });
  } catch (err) {
    console.error('[INVITE] request-invite failed:', err?.message || err);
    return res.status(500).json({
      detail: errorDetail(err), success: false, message: 'Failed to save invite request.' });
  }
});


// ---------------------------------------------------------------------------
// Invite acceptance
//
// The token is the Invite row's id. The invitee arrives from the email link at
// /invite/accept?token=<id> (or /signup?invite=<id>), and accepting:
//   - validates the invite still exists and is pending
//   - checks the signed-in account matches the invited address
//   - marks it accepted and grants the seat's tier
//
// The email check matters: without it anyone holding a link could claim a seat
// meant for someone else.
// ---------------------------------------------------------------------------

/** Only what the invitee needs to see. The inviter's uuid is never exposed. */
async function describeInvite(invite) {
  let inviterName = null;
  try {
    const inviter = await prisma.user.findUnique({ where: { id: invite.inviterId } });
    inviterName = inviter?.name || inviter?.email?.split('@')[0] || null;
  } catch { /* presentational only */ }

  return {
    valid: true,
    token: invite.id,
    email: invite.email,
    tier: invite.tier,
    status: invite.status,
    inviterName,
  };
}

/** Public: is this invite usable, and who sent it. */
router.get('/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).json({ valid: false, message: 'Missing invite token.' });

  try {
    const invite = await prisma.invite.findUnique({ where: { id: token } });
    if (!invite) {
      return res.status(404).json({ valid: false, reason: 'not_found', message: 'This invitation link is not valid.' });
    }
    if (invite.status === 'cancelled') {
      return res.status(410).json({ valid: false, reason: 'cancelled', message: 'This invitation was cancelled.' });
    }
    if (invite.status === 'accepted') {
      return res.status(200).json({ valid: false, reason: 'already_accepted', message: 'This invitation has already been accepted.', email: invite.email });
    }

    return res.json(await describeInvite(invite));
  } catch (error) {
    console.error('[INVITE] validate failed:', error?.message || error);
    return res.status(500).json({ valid: false, message: 'Could not check this invitation.', detail: errorDetail(error) });
  }
});

/** Authenticated: accept the invite for the signed-in account. */
router.post('/:token/accept', requireAuth, async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).json({ success: false, message: 'Missing invite token.' });

  try {
    const invite = await prisma.invite.findUnique({ where: { id: token } });
    if (!invite) {
      return res.status(404).json({ success: false, reason: 'not_found', message: 'This invitation link is not valid.' });
    }
    if (invite.status === 'cancelled') {
      return res.status(410).json({ success: false, reason: 'cancelled', message: 'This invitation was cancelled.' });
    }

    // Idempotent: arriving twice should not fail the second time.
    if (invite.status === 'accepted') {
      return res.json({ success: true, alreadyAccepted: true, tier: invite.tier });
    }

    const userEmail = String(req.user.email || '').trim().toLowerCase();
    const invitedEmail = String(invite.email || '').trim().toLowerCase();
    if (userEmail !== invitedEmail) {
      return res.status(403).json({
        success: false,
        reason: 'email_mismatch',
        message: `This invitation was sent to ${invitedEmail}. Sign in with that address to accept it.`,
      });
    }

    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    // The seat's tier is the point of the invite: the invitee joins at the
    // inviter's plan level rather than as a fresh free user.
    if (invite.tier) {
      await prisma.user.update({ where: { id: req.user.id }, data: { tier: invite.tier } });
    }

    return res.json({ success: true, tier: invite.tier, message: 'Invitation accepted.' });
  } catch (error) {
    console.error('[INVITE] accept failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Could not accept this invitation.', detail: errorDetail(error) });
  }
});

// Exposed for tests: the pure helpers are where the input handling lives, and
// they are worth pinning without standing up a database.
router.__test = { sanitize, deriveName };

module.exports = router;
