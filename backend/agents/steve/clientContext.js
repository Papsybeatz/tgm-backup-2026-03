/**
 * Client context — what makes Steve work *for a client* rather than for you.
 *
 * A consultant's Steve needs to know whose grant he is writing: the client's
 * name, sector, state, notes and saved templates. Without this the Agency tier
 * sells nothing — a consultant pays $149 and gets the same generic concierge.
 *
 * Two rules this module enforces:
 *   1. OWNERSHIP. A clientId is only honoured if the folder belongs to the
 *      requesting user. Otherwise anyone could read another consultant's client
 *      list by guessing an id.
 *   2. GROUNDING. Templates are injected as reference material, never as facts
 *      to copy. Steve must still take the order from the applicant.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Cap injected template content so a large library cannot blow the token budget. */
const MAX_TEMPLATES = 5;
const MAX_TEMPLATE_CHARS = 700;

/**
 * Load a client folder and its templates, but only for its owner.
 *
 * @returns {Promise<{client: object, templates: Array}|null>} null when the id
 *          does not exist, is not owned by this user, or the lookup fails.
 */
async function loadClientContext({ userId, clientId }) {
  if (!userId || !clientId) return null;

  try {
    const client = await prisma.clientFolder.findFirst({
      where: { id: String(clientId), ownerId: String(userId) },
    });
    if (!client) {
      console.warn('[STEVE] clientId not found or not owned by this user — ignoring');
      return null;
    }

    const templates = await prisma.clientTemplate.findMany({
      where: { clientId: client.id },
      orderBy: { updatedAt: 'desc' },
      take: MAX_TEMPLATES,
    });

    return { client, templates };
  } catch (error) {
    // Never block a conversation because client context failed to load.
    console.warn('[STEVE] could not load client context:', error?.message || error);
    return null;
  }
}

/**
 * The block injected into Steve's system prompt.
 *
 * Deliberately terse: it is re-sent on every request, and on the free tier the
 * whole per-minute budget is only a few thousand tokens.
 */
function clientPromptBlock({ client, templates }) {
  if (!client) return '';

  const lines = [
    'You are working on behalf of a CLIENT of the person you are talking to.',
    `Client organisation: ${client.name}`,
  ];

  if (client.sector) lines.push(`Sector: ${client.sector}`);
  if (client.state) lines.push(`State / region: ${client.state}`);
  if (client.notes) lines.push(`Notes from the consultant: ${String(client.notes).slice(0, 600)}`);

  if (Array.isArray(client.funders) && client.funders.length) {
    const names = client.funders
      .map((f) => (typeof f === 'string' ? f : f?.name))
      .filter(Boolean)
      .slice(0, 5);
    if (names.length) lines.push(`Funders they work with: ${names.join(', ')}`);
  }

  if (templates.length) {
    lines.push('');
    lines.push('Their saved templates (reference only — voice and structure, NOT facts to copy):');
    templates.forEach((t) => {
      const body = String(t.content || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_TEMPLATE_CHARS);
      lines.push(`- ${t.title} (${t.type}): ${body}`);
    });
  }

  lines.push('');
  lines.push(
    'Rules for client work: write for THIS organisation, never invent its history, and if the applicant has not said something, ask — a template is not evidence.',
  );

  return lines.join('\n');
}

/** Record that Steve worked on this client's file. Best-effort, never throws. */
async function logClientActivity({ clientId, userId, action, detail, metadata = null }) {
  if (!clientId) return false;
  try {
    await prisma.clientActivityLog.create({
      data: {
        clientId: String(clientId),
        userId: userId ? String(userId) : null,
        action: String(action || 'steve_action'),
        detail: detail ? String(detail).slice(0, 500) : null,
        metadata: metadata || undefined,
      },
    });
    return true;
  } catch (error) {
    console.warn('[STEVE] could not log client activity:', error?.message || error);
    return false;
  }
}

module.exports = { loadClientContext, clientPromptBlock, logClientActivity };
