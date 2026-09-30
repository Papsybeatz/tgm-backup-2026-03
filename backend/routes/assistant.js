/**
 * POST /api/assistant  — Steve, the TGM grant concierge.
 * GET  /api/assistant/session — rehydrate the conversation panel.
 *
 * This route previously contained a keyword if/else router that returned a
 * hardcoded template. It is now a thin transport in front of the real
 * tool-calling agent in `backend/agents/steve`.
 *
 * Backwards compatible: `{ reply, intent, requiresUpgrade, upgradeLink }` are
 * still returned, alongside the richer concierge payload the UI can opt into.
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const { runSteveTurn, getSessionView } = require('../agents/steve');
const { hasFeature } = require('../middleware/tierAuth');
const { resetSession, getOrCreateSession, saveSession } = require('../agents/steve/store');
const { buildOrderFromForm } = require('../agents/steve/formOrder');
const { createToolkit, parseSections } = require('../agents/steve/tools');
const {
  SLOTS,
  missingRequired,
  validateOrder,
  orderProgress,
  summarizeOrder,
} = require('../agents/steve/order');
const llm = require('../agents/steve/llm');

const router = express.Router();
const prisma = new PrismaClient();

/** Attach req.user when a valid token is present, but never block the request. */
async function softAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token =
      (header.startsWith('Bearer ') ? header.replace('Bearer ', '') : null) ||
      (req.cookies && req.cookies.session) ||
      req.body?.token ||
      null;

    if (!token || String(token).startsWith('pwdreset_')) return next();

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || new Date() > session.expiresAt) return next();

    const user = await prisma.user.findUnique({ where: { email: session.email } });
    if (user) req.user = user;
    return next();
  } catch (error) {
    // Auth is best-effort here; the concierge still works signed out.
    return next();
  }
}

router.post('/', softAuth, async (req, res) => {
  const { userId = 'guest', tier, message = '', context = {} } = req.body || {};

  if (!String(message).trim()) {
    return res.status(400).json({
      reply: 'Tell me about the grant you need and I’ll take the order.',
      intent: 'general',
      requiresUpgrade: false,
    });
  }

  const user = req.user
    ? { id: req.user.id, email: req.user.email, name: req.user.name, tier: tier || req.user.tier }
    : null;

  // Client-aware Steve is the Agency unlock: the same concierge, but working on
  // behalf of a client with that client's context.
  const clientId = String(context?.clientId || req.body?.clientId || '').trim() || null;
  if (clientId && !hasFeature(user?.tier || tier || 'free', 'client_aware_steve')) {
    return res.status(403).json({
      reply:
        'Working on behalf of a client is part of Agency. On your current plan Steve writes for your own organisation.',
      intent: 'upgrade_required',
      requiresUpgrade: true,
      upgradeLink: 'https://www.thegrantsmaster.com/pricing',
      requiredFeature: 'client_aware_steve',
    });
  }

  try {
    // Wrap the whole turn so every provider call it makes — tool loop, drafting,
    // scoring — is attributed to this request and to no other.
    const result = await llm.withUsage(async (usage) => {
      const turnResult = await runSteveTurn({ user, userId, message, context: { ...context, clientId } });
      turnResult.tokens = {
        requests: usage.requests,
        prompt: usage.prompt,
        completion: usage.completion,
        total: usage.total,
        models: usage.models,
        calls: usage.calls,
      };
      return turnResult;
    });

    return res.json({
      // legacy contract
      reply: result.reply,
      intent: result.intent,
      requiresUpgrade: false,
      upgradeLink: undefined,
      // concierge payload
      status: result.status,
      progress: result.progress,
      order: result.order,
      draftId: result.draftId || null,
      draftTitle: result.draftTitle || null,
      docHtml: result.docHtml || null,
      score: result.score ?? null,
      scoreReport: result.scoreReport || null,
      hasDraft: Boolean(result.hasDraft),
      editedSections: Array.isArray(result.editedSections) ? result.editedSections : [],
      download: result.download || null,
      suggestions: result.suggestions || [],
      engine: result.engine || 'agent',
      provider: llm.providerInfo(),
      llmError: result.llmError || null,
      path: result.path || null,
      tokens: result.tokens || null,
      signedIn: Boolean(user),
    });
  } catch (error) {
    console.error('[ASSISTANT] turn error:', error?.message || error);
    return res.status(500).json({
      reply: 'I hit a snag on my side. Try that again?',
      intent: 'error',
      requiresUpgrade: false,
    });
  }
});

/**
 * POST /api/assistant/order — itemized intake form.
 *
 * The deterministic front door to the SAME pipeline the conversation uses: the
 * form fills the order ticket, and the ticket drives drafting.js. It costs one
 * writing call (plus one scoring call) instead of the 12–15 a conversation
 * takes, and a dropdown can never mis-file the applicant type.
 *
 * Body: { form: {orgName, orgType, address, phone, contactName, contactEmail,
 *         projectTitle, need, servesWho, peopleServed, serviceArea, amount,
 *         moneyDoes, outcomes, funderName, deadline, deliverable},
 *         userId?, tier?, clientId? }
 */
router.post('/order', softAuth, async (req, res) => {
  const form = (req.body && req.body.form) || req.body || {};
  const userId = req.user?.id || req.body?.userId || 'guest';
  const clientId = String(req.body?.clientId || form.clientId || '').trim() || null;
  const tier = req.user?.tier || req.body?.tier || 'free';
  const user = req.user
    ? { id: req.user.id, email: req.user.email, name: req.user.name, tier }
    : null;

  if (clientId && !hasFeature(tier, 'client_aware_steve')) {
    return res.status(403).json({
      success: false,
      message:
        'Working on behalf of a client is part of Agency. On your current plan Steve writes for your own organisation.',
      requiresUpgrade: true,
      upgradeLink: 'https://www.thegrantsmaster.com/pricing',
      requiredFeature: 'client_aware_steve',
    });
  }

  const order = buildOrderFromForm(form);
  const missing = missingRequired(order);
  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Still needed: ${missing.map((key) => SLOTS[key].label).join(', ')}.`,
      missing,
      missingLabels: missing.map((key) => SLOTS[key].label),
      progress: orderProgress(order),
      order,
    });
  }

  const blockers = validateOrder(order);
  if (blockers.length) {
    return res.status(400).json({ success: false, message: blockers.join(' '), blockers, order });
  }

  try {
    const state = {
      status: 'drafting',
      order,
      style: order.style || 'letter',
      docTitle: null,
      docHtml: null,
      draftId: null,
      score: null,
      scoreReport: null,
      usedLLM: false,
      clientId,
      clientBlock: '',
    };

    const result = await llm.withUsage(async (usage) => {
      const toolkit = createToolkit({ state, user, tier });
      const toolResult = await toolkit.execute('create_draft', { style: state.style });
      toolResult.tokens = {
        requests: usage.requests,
        prompt: usage.prompt,
        completion: usage.completion,
        total: usage.total,
        models: usage.models,
        calls: usage.calls,
      };
      return toolResult;
    });

    // Seed the session so post-draft actions that still live on the conversation
    // ("Make it stronger", "Download PDF") work against this ticket.
    if (result.ok) {
      try {
        const session = await getOrCreateSession(String(user?.id || userId || 'guest'), clientId);
        await saveSession(session, {
          status: state.status,
          order: state.order,
          style: state.style,
          draftId: state.draftId,
          docTitle: state.docTitle,
          docHtml: state.docHtml,
          score: state.score,
          scoreReport: state.scoreReport,
        });
      } catch (error) {
        console.warn('[ASSISTANT] order session seed skipped:', error?.message || error);
      }
    }

    const download =
      state.draftId && user?.id
        ? {
            pdf: `/api/drafts/${state.draftId}/export.pdf`,
            docx: `/api/drafts/${state.draftId}/export.docx`,
          }
        : null;

    return res.json({
      success: Boolean(result.ok),
      reply: result.ok
        ? `Done. I wrote “${state.docTitle}” — Checkmate scores it ${state.score ?? 'n/a'}/100.`
        : 'I could not write this one yet — please check the details.',
      reason: result.reason || null,
      status: state.status,
      progress: orderProgress(state.order),
      order: state.order,
      orderSummary: summarizeOrder(state.order),
      draftId: state.draftId,
      draftTitle: state.docTitle,
      docHtml: state.docHtml || null,
      score: state.score ?? null,
      scoreReport: state.scoreReport || null,
      hasDraft: Boolean(state.docHtml),
      editedSections: state.docHtml ? Object.keys(parseSections(state.docHtml)) : [],
      download,
      engine: result.usedLLM ? 'agent' : 'planner',
      provider: llm.providerInfo(),
      needsSignIn: !user?.id,
      tokens: result.tokens || null,
    });
  } catch (error) {
    console.error('[ASSISTANT] order turn error:', error?.message || error);
    return res.status(500).json({
      success: false,
      reply: 'I hit a snag on my side. Try that again?',
    });
  }
});

router.get('/session', softAuth, async (req, res) => {
  const userId = req.query?.userId || req.body?.userId || 'guest';
  try {
    const view = await getSessionView({ user: req.user || null, userId, clientId: String(req.query?.clientId || '').trim() || null });
    return res.json({ success: true, signedIn: Boolean(req.user), ...view });
  } catch (error) {
    console.error('[ASSISTANT] session load error:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Could not load session' });
  }
});

/** POST /api/assistant/reset — start a brand new order. */
router.post('/reset', softAuth, async (req, res) => {
  const userId = req.user?.id || req.body?.userId || 'guest';
  try {
    await resetSession(userId);
    return res.json({ success: true });
  } catch (error) {
    console.error('[ASSISTANT] reset error:', error?.message || error);
    return res.status(500).json({ success: false });
  }
});

module.exports = router;
