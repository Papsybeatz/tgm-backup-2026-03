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
const { resetSession } = require('../agents/steve/store');
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

  try {
    // Wrap the whole turn so every provider call it makes — tool loop, drafting,
    // scoring — is attributed to this request and to no other.
    const result = await llm.withUsage(async (usage) => {
      const turnResult = await runSteveTurn({ user, userId, message, context });
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

router.get('/session', softAuth, async (req, res) => {
  const userId = req.query?.userId || req.body?.userId || 'guest';
  try {
    const view = await getSessionView({ user: req.user || null, userId });
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
