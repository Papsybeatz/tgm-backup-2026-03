/**
 * Steve — session store
 * ----------------------------------------------------------------------------
 * Conversations live in Postgres (`AssistantSession` + `AssistantMessage`) so
 * an applicant never has to re-tell their story after a reload or a deploy.
 *
 * If the tables have not been migrated yet, or the database is unreachable,
 * the store degrades to an in-memory map instead of throwing — the concierge
 * stays up.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const memory = { sessions: new Map(), messages: new Map() };
const MAX_HISTORY = 24;

let dbDisabledReason = null;

function isMissingTableError(error) {
  const code = error?.code;
  const message = String(error?.message || '');
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    /does not exist|Unknown arg|Unknown field|AssistantSession|AssistantMessage/i.test(message)
  );
}

function emptyOrder() {
  return {};
}

async function getOrCreateSession(userId) {
  const key = String(userId || 'guest');

  if (!dbDisabledReason) {
    try {
      const existing = await prisma.assistantSession.findFirst({
        where: { userId: key },
        orderBy: { updatedAt: 'desc' },
      });
      if (existing) return existing;

      return await prisma.assistantSession.create({
        data: { userId: key, order: emptyOrder(), status: 'intake' },
      });
    } catch (error) {
      dbDisabledReason = error.message;
      if (isMissingTableError(error)) {
        console.warn('[STEVE] assistant tables unavailable, using in-memory store:', error.message);
      } else {
        console.warn('[STEVE] session load failed, using in-memory store:', error.message);
      }
    }
  }

  if (!memory.sessions.has(key)) {
    memory.sessions.set(key, {
      id: `mem_${key}`,
      userId: key,
      status: 'intake',
      order: emptyOrder(),
      style: 'full_proposal',
      draftId: null,
      docTitle: null,
      score: null,
      scoreReport: null,
      lastIntent: null,
    });
    memory.messages.set(key, []);
  }
  return memory.sessions.get(key);
}

async function saveSession(session, patch = {}) {
  const data = {};
  ['status', 'order', 'draftId', 'docTitle', 'docHtml', 'style', 'score', 'scoreReport', 'lastIntent'].forEach((field) => {
    if (patch[field] !== undefined) data[field] = patch[field];
  });

  Object.assign(session, data);

  if (!dbDisabledReason && !String(session.id).startsWith('mem_')) {
    try {
      const updated = await prisma.assistantSession.update({ where: { id: session.id }, data });
      return updated;
    } catch (error) {
      if (isMissingTableError(error)) dbDisabledReason = error.message;
      else console.warn('[STEVE] session save failed:', error.message);
    }
  }

  const key = session.userId;
  memory.sessions.set(key, { ...(memory.sessions.get(key) || {}), ...session });
  return session;
}

async function appendMessage(session, role, content, metadata = null) {
  const payload = { role, content: String(content || ''), metadata };

  if (!dbDisabledReason && !String(session.id).startsWith('mem_')) {
    try {
      return await prisma.assistantMessage.create({
        data: { sessionId: session.id, ...payload },
      });
    } catch (error) {
      if (isMissingTableError(error)) dbDisabledReason = error.message;
      else console.warn('[STEVE] message save failed:', error.message);
    }
  }

  const key = session.userId;
  const list = memory.messages.get(key) || [];
  list.push({ id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...payload, createdAt: new Date().toISOString() });
  memory.messages.set(key, list.slice(-MAX_HISTORY));
  return list[list.length - 1];
}

async function getHistory(session, limit = MAX_HISTORY) {
  if (!dbDisabledReason && !String(session.id).startsWith('mem_')) {
    try {
      const rows = await prisma.assistantMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return rows.reverse();
    } catch (error) {
      if (isMissingTableError(error)) dbDisabledReason = error.message;
      else console.warn('[STEVE] history load failed:', error.message);
    }
  }
  return (memory.messages.get(session.userId) || []).slice(-limit);
}

async function resetSession(userId) {
  const key = String(userId || 'guest');
  memory.sessions.delete(key);
  memory.messages.delete(key);

  if (!dbDisabledReason) {
    try {
      await prisma.assistantSession.deleteMany({ where: { userId: key } });
    } catch (error) {
      if (isMissingTableError(error)) dbDisabledReason = error.message;
    }
  }
  return getOrCreateSession(key);
}

module.exports = {
  getOrCreateSession,
  saveSession,
  appendMessage,
  getHistory,
  resetSession,
  isMissingTableError,
};
