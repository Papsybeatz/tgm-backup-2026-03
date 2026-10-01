// backend/routes/teamInvites.js
//
// The team/seats API. This is the ONLY router mounted at /api/team.
//
// It used to be shadowed: server.js mounted routes/team.js at the same path
// FIRST, and that file served /status, /add, /remove, /resend-invite and
// /cancel-invite out of a `let team = {...}` in-memory stub. Express matches in
// mount order, so every call the UI actually made hit the stub — which returned
// two hardcoded fake pending invites for everyone, wrote nothing to the
// database, and emailed an invite link built from the email ADDRESS. The real
// accept endpoint looks the token up as an Invite row id, so that link could
// never be accepted. routes/team.js is deleted; this router owns the contract.
//
// Everything below reads and writes the database, and the invite link carries
// the Invite row's id — the same token /api/invite/:token/accept validates.

const express = require('express');
const { errorDetail } = require('../utils/errorDetail');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// The Prisma-backed session middleware. NOTE: this is middleware/auth, not
// middleware/roleAuth — roleAuth only checks `req.user`, and nothing populates
// req.user on this path, so every route here used to 403 for everyone.
const requireAuth = require('../middleware/auth');
const { TIERS } = require('../middleware/tierAuth');
const sendInviteEmail = require('../utils/sendInviteEmail');
const { sanitizeInput, validateEmail } = require('../utils/sanitize');

/** The public app origin, without a trailing slash. */
function appUrl() {
  return String(process.env.APP_URL || 'https://www.thegrantsmaster.com').replace(/\/+$/, '');
}

/**
 * The invite link the invitee receives.
 *
 * `token` is the Invite row's id — the value /api/invite/:token and
 * /api/invite/:token/accept both look up. It points straight at the acceptance
 * page so the invitee sees who invited them before creating an account; that
 * page carries the token on to signup, so the seat is still claimed.
 */
function buildInviteLink(inviteToken) {
  return `${appUrl()}/invite/accept?token=${encodeURIComponent(inviteToken)}`;
}

/**
 * Seats come from the tier table (middleware/tierAuth), so the panel can never
 * promise more than the plan actually grants. Infinity means unlimited; a tier
 * with no teamSeats (free, starter, lifetime) has none.
 */
function seatCapFor(tier) {
  const cap = TIERS[tier]?.limits?.teamSeats;
  return typeof cap === 'number' ? cap : 0;
}

/** The inviter's display name, so the email never shows a raw uuid. */
function inviterNameFor(user) {
  return user?.name || (user?.email ? String(user.email).split('@')[0] : 'A GrantsMaster user');
}

/** Seats in use = the owner plus every accepted invite. */
async function seatsUsed(inviterId) {
  const accepted = await prisma.invite.count({ where: { inviterId, status: 'accepted' } });
  return accepted + 1;
}

/** Seats spoken for = owner + accepted + pending (a pending invite holds a seat). */
async function seatsReserved(inviterId) {
  const [accepted, pending] = await Promise.all([
    prisma.invite.count({ where: { inviterId, status: 'accepted' } }),
    prisma.invite.count({ where: { inviterId, status: 'pending' } }),
  ]);
  return accepted + pending + 1;
}

function normaliseEmail(value) {
  return String(sanitizeInput(value) || '').trim().toLowerCase();
}

/* ───────────────────────────── GET /status ───────────────────────────── */

/**
 * The seat readout the Team settings panel renders. Every number here is
 * counted from the database — there is no hardcoded seed data.
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const [used, pending] = await Promise.all([
      seatsUsed(user.id),
      prisma.invite.findMany({
        where: { inviterId: user.id, status: 'pending' },
        orderBy: { sentAt: 'desc' },
        select: { email: true, status: true, sentAt: true },
      }),
    ]);

    const cap = seatCapFor(user.tier);
    return res.json({
      success: true,
      used,
      total: cap === Infinity ? 'unlimited' : cap,
      cap,
      tier: user.tier,
      pendingInvites: pending,
    });
  } catch (error) {
    console.error('[TEAM] status failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Could not load team status.', detail: errorDetail(error) });
  }
});

/* ────────────────────────── POST /add, /invite ───────────────────────── */

/**
 * Create a seat invite and email the real token link.
 *
 * The inviter is taken from the authenticated session — never from the request
 * body. The previous version trusted a client-supplied `inviterId`, which let
 * anyone create invites under someone else's account.
 */
async function createInvite(req, res) {
  try {
    const user = req.user;
    const email = normaliseEmail(req.body?.email);
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    if (email === String(user.email || '').toLowerCase()) {
      return res.status(400).json({ success: false, message: 'You are already on this team.' });
    }

    const cap = seatCapFor(user.tier);
    if (cap === 0) {
      return res.status(403).json({
        success: false,
        message: 'Your plan does not include team seats. Upgrade to Pro or Agency to invite teammates.',
      });
    }

    // One live invite per address: re-inviting is a resend, not a new row.
    const existing = await prisma.invite.findFirst({
      where: { inviterId: user.id, email, status: { in: ['pending', 'accepted'] } },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        alreadyInvited: true,
        message: `${email} already has a ${existing.status} invite on this team.`,
      });
    }

    if (cap !== Infinity) {
      const reserved = await seatsReserved(user.id);
      if (reserved >= cap) {
        return res.status(400).json({
          success: false,
          noSeats: true,
          message: `No seats left — your plan includes ${cap}. Cancel a pending invite or upgrade for more.`,
        });
      }
    }

    const invite = await prisma.invite.create({
      data: {
        email,
        inviterId: user.id,
        tier: user.tier,
        status: 'pending',
        sentAt: new Date(),
        acceptedAt: null,
      },
    });

    const inviteLink = buildInviteLink(invite.id);
    let emailed = true;
    try {
      await sendInviteEmail(email, inviterNameFor(user), inviteLink);
    } catch (emailError) {
      // The seat still exists; the inviter can copy the link and send it.
      emailed = false;
      console.error('[TEAM] invite email failed:', emailError?.message || emailError);
    }

    return res.json({
      success: true,
      emailed,
      invite: { email: invite.email, status: invite.status, sentAt: invite.sentAt },
      inviteLink,
      message: emailed ? `Invite sent to ${email}` : `Invite created for ${email}, but the email could not be sent. Copy the link instead.`,
    });
  } catch (error) {
    console.error('[TEAM] add failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Could not create the invite.', detail: errorDetail(error) });
  }
}

router.post('/add', requireAuth, createInvite);
router.post('/invite', requireAuth, createInvite); // legacy path, same handler

/* ─────────────────────── POST /cancel-invite ─────────────────────── */

/** Cancel a PENDING invite. An accepted seat is released via /remove. */
router.post('/cancel-invite', requireAuth, async (req, res) => {
  try {
    const email = normaliseEmail(req.body?.email);
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }

    const result = await prisma.invite.updateMany({
      where: { inviterId: req.user.id, email, status: 'pending' },
      data: { status: 'cancelled' },
    });

    if (!result.count) {
      return res.status(404).json({ success: false, message: `No pending invite for ${email}.` });
    }
    return res.json({ success: true, message: `Invite to ${email} cancelled.` });
  } catch (error) {
    console.error('[TEAM] cancel failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Could not cancel the invite.', detail: errorDetail(error) });
  }
});

/* ─────────────────────── POST /resend-invite ─────────────────────── */

/** Re-send a pending invite, with the SAME token so an earlier link still works. */
router.post('/resend-invite', requireAuth, async (req, res) => {
  try {
    const email = normaliseEmail(req.body?.email);
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }

    const invite = await prisma.invite.findFirst({
      where: { inviterId: req.user.id, email, status: 'pending' },
    });
    if (!invite) {
      return res.status(404).json({ success: false, message: `No pending invite for ${email}.` });
    }

    await prisma.invite.update({ where: { id: invite.id }, data: { sentAt: new Date() } });
    const inviteLink = buildInviteLink(invite.id);

    let emailed = true;
    try {
      await sendInviteEmail(email, inviterNameFor(req.user), inviteLink);
    } catch (emailError) {
      emailed = false;
      console.error('[TEAM] resend email failed:', emailError?.message || emailError);
    }

    return res.json({
      success: true,
      emailed,
      inviteLink,
      message: emailed ? `Invite resent to ${email}.` : `Could not resend to ${email}. Copy the link instead.`,
    });
  } catch (error) {
    console.error('[TEAM] resend failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Could not resend the invite.', detail: errorDetail(error) });
  }
});

/* ────────────────────────── POST /remove ────────────────────────── */

/**
 * Remove a member: revoke their seat.
 *
 * If the seat had been claimed, the tier it granted is taken back — but only
 * while the account still sits on exactly that tier, so someone who upgraded
 * independently is never silently downgraded.
 */
router.post('/remove', requireAuth, async (req, res) => {
  try {
    const email = normaliseEmail(req.body?.email);
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }

    const invites = await prisma.invite.findMany({
      where: { inviterId: req.user.id, email, status: { in: ['pending', 'accepted'] } },
    });
    if (!invites.length) {
      return res.status(404).json({ success: false, message: `No team member or invite for ${email}.` });
    }

    await prisma.invite.updateMany({
      where: { inviterId: req.user.id, email, status: { in: ['pending', 'accepted'] } },
      data: { status: 'cancelled' },
    });

    let downgraded = false;
    const acceptedTiers = invites.filter((i) => i.status === 'accepted').map((i) => i.tier);
    if (acceptedTiers.length) {
      const member = await prisma.user.findUnique({ where: { email } });
      if (member && acceptedTiers.includes(member.tier)) {
        await prisma.user.update({ where: { id: member.id }, data: { tier: 'free' } });
        downgraded = true;
      }
    }

    return res.json({
      success: true,
      downgraded,
      message: downgraded ? `Removed ${email} and released their seat.` : `Removed ${email}.`,
    });
  } catch (error) {
    console.error('[TEAM] remove failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Could not remove that member.', detail: errorDetail(error) });
  }
});

/* ────────────────────────── GET /invites ────────────────────────── */

/** Every invite this account has sent. */
router.get('/invites', requireAuth, async (req, res) => {
  try {
    const invites = await prisma.invite.findMany({
      where: { inviterId: req.user.id },
      orderBy: { sentAt: 'desc' },
    });
    return res.json({ success: true, invites });
  } catch (error) {
    console.error('[TEAM] invites failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Could not load invites.', detail: errorDetail(error) });
  }
});

module.exports = router;
// Exposed for tests only — these are pure helpers.
module.exports.__test = { buildInviteLink, seatCapFor, normaliseEmail };
