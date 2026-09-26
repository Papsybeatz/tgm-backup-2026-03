/**
 * Steve — persistence & handoff
 * ----------------------------------------------------------------------------
 * "Your grant is ready for your review."
 *
 * Saves the generated document into the applicant's real TGM workspace (the
 * same `Draft` table the editor reads), snapshots a version, and fires the
 * review-ready notification. Degrades gracefully when the user is signed out
 * or the database is unavailable.
 */
const { PrismaClient } = require('@prisma/client');
const { sendBrevoEmail } = require('../../utils/brevo');

const prisma = new PrismaClient();

const APP_URL = process.env.APP_URL || 'https://www.thegrantsmaster.com';

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Save (or update) the Steve-generated draft in the workspace.
 * @returns {Promise<{ok: boolean, draft?: object, created?: boolean, reason?: string}>}
 */
async function saveDraftForUser({ userId, draftId, title, content, tier = 'free' }) {
  if (!userId) return { ok: false, reason: 'not_authenticated' };

  try {
    if (draftId) {
      const existing = await prisma.draft.findFirst({ where: { id: draftId, userId } });
      if (existing) {
        const draft = await prisma.draft.update({
          where: { id: draftId },
          data: { title: title || existing.title, content, updatedAt: new Date() },
        });
        await snapshot(draft.id, content);
        return { ok: true, draft, created: false };
      }
    }

    // Free tier keeps the existing one-saved-draft rule.
    if (tier === 'free') {
      const count = await prisma.draft.count({ where: { userId } });
      if (count >= 1) {
        // Reuse their single free slot rather than blocking the concierge.
        const [oldest] = await prisma.draft.findMany({ where: { userId }, orderBy: { updatedAt: 'asc' }, take: 1 });
        if (oldest) {
          const draft = await prisma.draft.update({
            where: { id: oldest.id },
            data: { title: title || oldest.title, content, updatedAt: new Date() },
          });
          await snapshot(draft.id, content);
          return { ok: true, draft, created: false, reason: 'free_slot_reused' };
        }
      }
    }

    const draft = await prisma.draft.create({
      data: {
        userId,
        title: title || 'Steve Draft',
        content,
        tierAtCreation: String(tier || 'free'),
      },
    });
    await snapshot(draft.id, content);
    return { ok: true, draft, created: true };
  } catch (error) {
    console.error('[STEVE] save draft failed', error?.message || error);
    return { ok: false, reason: 'save_failed', error: error?.message };
  }
}

async function snapshot(draftId, content) {
  try {
    await prisma.draftVersion.create({ data: { draftId, content } });
  } catch (error) {
    console.warn('[STEVE] version snapshot skipped', error?.message || error);
  }
}

/**
 * Notify the applicant that the draft is ready to review.
 * Always returns an in-app handoff; email is best-effort.
 */
async function notifyReadyForReview({ user, draft, score }) {
  const draftUrl = draft?.id ? `${APP_URL}/workspace/${draft.id}` : `${APP_URL}/dashboard`;
  const result = { inApp: true, emailed: false, draftUrl };

  if (!user?.email || !process.env.BREVO_API_KEY) return result;

  const html = `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.6;color:#0A0F1A">
      <h2 style="margin:0 0 8px">Your grant is ready for your review</h2>
      <p>Steve finished drafting <strong>${escapeHtml(draft?.title || 'your grant')}</strong>.</p>
      ${
        typeof score === 'number'
          ? `<p><strong>Checkmate score:</strong> ${score}/100</p>`
          : ''
      }
      <p>Open it in your workspace to edit anything you like, then download it as PDF or Word.</p>
      <p><a href="${draftUrl}" style="background:#D4AF37;color:#0A0F1A;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Review my grant</a></p>
      <p style="color:#64748B;font-size:13px">The Grants Master — Steve</p>
    </div>
  `;

  const sent = await sendBrevoEmail({
    to: user.email,
    toName: user.name || '',
    subject: 'Your grant is ready for your review',
    htmlContent: html,
  });
  result.emailed = Boolean(sent?.sent);
  if (!sent?.sent) result.emailError = sent?.error;
  return result;
}

module.exports = { saveDraftForUser, notifyReadyForReview, APP_URL };
