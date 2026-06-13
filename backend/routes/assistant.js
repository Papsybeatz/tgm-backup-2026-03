const express = require('express');
const {
  addMessage,
  getOrCreateSession,
  updateDraftReference,
  updateIntent,
} = require('../utils/assistantStore');
const { generateGrantDraft } = require('../services/grantDraft');

const router = express.Router();
const UPGRADE_LINK = 'https://www.thegrantsmaster.com/pricing';

function createMessage(role, content) {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

function normalizeTier(tier) {
  return String(tier || 'free').toLowerCase();
}

function detectIntent(message, session) {
  const text = String(message || '').toLowerCase();
  if (text.includes('write') && text.includes('grant')) return 'draft_grant';
  if (text.includes('draft') && text.includes('grant')) return 'draft_grant';
  if (text.includes('edit') || text.includes('revise') || text.includes('improve')) return 'edit_grant';
  if (text.includes('submit') || text.includes('submission')) return 'submission_help';
  if (text.includes('upgrade') || text.includes('pricing') || text.includes('plan')) return 'upsell';
  if (text.includes('email') || text.includes('concierge')) return 'concierge_email';
  if (text.includes('review') || text.includes('score') || text.includes('compliance')) return 'advanced_review';
  if (session?.lastIntent === 'draft_grant') return 'draft_grant';
  return 'general_help';
}

function getUpgradeRequirement(tier, intent, message) {
  const normalizedTier = normalizeTier(tier);
  if (normalizedTier !== 'free') return null;

  const text = String(message || '').toLowerCase();
  const advancedRequest =
    intent === 'advanced_review' ||
    intent === 'submission_help' ||
    text.includes('advanced review') ||
    text.includes('unlimited drafts') ||
    text.includes('submission pack') ||
    text.includes('compliance packet');

  if (!advancedRequest) return null;

  return {
    requiresUpgrade: true,
    upgradeLink: UPGRADE_LINK,
    reply: 'You are ready for a more complete funding workflow. To unlock advanced review, unlimited drafts, or a submission pack, you will need the Pro or Unlimited tier. Here is the upgrade link.',
  };
}

function handleDraftGrant(session, message) {
  const text = String(message || '').toLowerCase();
  const previousAssistantMessages = session.messages.filter((item) => item.role === 'assistant');
  const askedForStory = previousAssistantMessages.some((item) => item.content.includes('tell me the story briefly'));
  const askedDraftOrStory = previousAssistantMessages.some((item) => item.content.includes('Do you have a draft already'));

  if (!askedDraftOrStory) {
    return 'Great. Do you have a draft already, or just the story behind the grant?';
  }

  if (text.includes('just the story') || text.includes('story')) {
    return 'Okay, tell me the story briefly: who you are, what you need funding for, and why it matters.';
  }

  if (askedForStory && message.trim().length > 20) {
    const draft = generateGrantDraft(message);
    const draftReference = {
      id: `assistant_draft_${Date.now()}`,
      title: 'TGM Assistant First Grant Draft',
      content: draft,
      createdAt: new Date().toISOString(),
    };
    updateDraftReference(session.userId, draftReference);
    return `Interesting story. Here is your first draft. Read it and tell me what you want updated.\n\n${draft}`;
  }

  return 'Send me the story in a few sentences: who you are, what you need funding for, who it helps, and why it matters.';
}

function buildReply({ intent, message, session }) {
  switch (intent) {
    case 'draft_grant':
      return handleDraftGrant(session, message);
    case 'edit_grant':
      return 'Paste the section you want improved and tell me what should change: clearer, shorter, stronger, more funder-aligned, or more emotional.';
    case 'submission_help':
      return 'I can help you organize a submission checklist: narrative, budget, evidence, attachments, eligibility, deadline, and final review.';
    case 'upsell':
      return 'You can compare plans on the pricing page. Pro is best for stronger drafts and reviews; Unlimited is best for ongoing funding operations.';
    case 'concierge_email':
      return 'Tell me who the email is going to and what you need from them. I can draft a clear outreach or follow-up message.';
    case 'advanced_review':
      return 'I can review for clarity, evidence, funder alignment, and missing submission materials. Paste the draft or section you want checked.';
    default:
      return 'I can help with grant drafting, editing, funding readiness, funder positioning, submission prep, or upgrade questions. What are you trying to get done right now?';
  }
}

router.post('/', (req, res) => {
  const { userId = 'guest', tier = 'free', message = '', context = {} } = req.body || {};
  if (!message.trim()) {
    return res.status(400).json({ reply: 'Please type a question for TGM Assistant.', intent: 'general_help' });
  }

  const session = getOrCreateSession(userId);
  addMessage(userId, createMessage('user', message));

  const intent = detectIntent(message, session);
  updateIntent(userId, intent);

  const upgrade = getUpgradeRequirement(tier, intent, message);
  const reply = upgrade?.reply || buildReply({ intent, message, session, context });

  addMessage(userId, createMessage('assistant', reply));

  return res.json({
    reply,
    intent,
    requiresUpgrade: Boolean(upgrade?.requiresUpgrade),
    upgradeLink: upgrade?.upgradeLink,
  });
});

module.exports = router;
