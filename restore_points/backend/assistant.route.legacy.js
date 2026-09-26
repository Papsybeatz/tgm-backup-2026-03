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
const SIGNED_OUT_DRAFT_REPLY = 'Great — I can help you write a new grant. To start drafting, you’ll need to create your free TGM workspace. Once you’re inside, I’ll guide you step‑by‑step, collect your project details, and generate your first draft. Click “Get Started Free” to open your workspace and we’ll begin.';
const NY_OPPORTUNITIES = [
  'NYC Arts & Culture Capacity Grant: good for arts, culture, and creative programming.',
  'New York Community Health Equity Fund: good for health access, prevention, and wellness programs.',
  'NY Youth Workforce Readiness Grant: good for youth development, workforce training, and career pathways.',
  'New York Housing Stability Initiative: good for housing, homelessness prevention, and wraparound services.',
];
const SCOTT_DAILY = ['1 LinkedIn post', '10-20 outreach messages', '1 NY insight or consultant insight', '1 deadline reminder if applicable'];
const SCOTT_WEEKLY = ['1 case study', '1 template', '1 guide', '1 email broadcast'];
const SCOTT_FUNNELS = ['NY Funnel', 'Consultant Funnel', 'General Nonprofit Funnel'];

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
  if (text.includes('how do i use') || text.includes('where do i start') || text.includes('what should i click') || text.includes('guide me') || text.includes('help me use') || text.includes('help me start')) {
    return 'guide_help';
  }
  if (text.includes('write') && text.includes('grant')) return 'draft_grant';
  if (text.includes('scott') || text.includes('distribution plan') || text.includes('growth engine')) return 'scott_distribution';
  if (text.includes('ny grant') || text.includes('new york grant') || text.includes('ny nonprofit') || text.includes('ny arts')) return 'new_york_help';
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

function isSignedOutDraftRequest({ intent, userId, context }) {
  if (intent !== 'draft_grant') return false;
  if (context?.isSignedIn === true) return false;
  return !userId || userId === 'guest' || context?.isSignedIn === false;
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
    case 'guide_help':
      return 'Welcome — I can help you get started. Click New Draft on your dashboard to open your workspace, upload a draft to improve it, or ask me how scoring works.';
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
    case 'new_york_help':
      return `For New York grant work, start with fit, deadline, and proof. Current NY-focused examples in TGM include:\n\n- ${NY_OPPORTUNITIES.join('\n- ')}\n\nIf you are drafting, tell me your organization type, borough or service area, target population, program goal, budget range, and deadline.`;
    case 'scott_distribution':
      return `Scott runs TGM distribution through three funnels: ${SCOTT_FUNNELS.join(', ')}.\n\nDaily operating system:\n- ${SCOTT_DAILY.join('\n- ')}\n\nWeekly operating system:\n- ${SCOTT_WEEKLY.join('\n- ')}\n\nThe strongest conversion CTA is Lifetime Access: limited spots, Pro forever, with NY and consultant-specific urgency.`;
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
  const currentPage = String(context.currentPage || '').toLowerCase();
  const mode = String(context.mode || '').toLowerCase();
  const isWorkspaceRoute = currentPage.startsWith('/workspace');
  const isGuideMode = mode === 'guide' || currentPage.startsWith('/dashboard') || currentPage.startsWith('/clients');

  if (isSignedOutDraftRequest({ intent, userId, context })) {
    addMessage(userId, createMessage('assistant', SIGNED_OUT_DRAFT_REPLY));
    return res.json({
      reply: SIGNED_OUT_DRAFT_REPLY,
      intent,
      requiresUpgrade: false,
    });
  }

  if (!isWorkspaceRoute && (intent === 'draft_grant' || intent === 'edit_grant' || intent === 'advanced_review')) {
    const reply = isGuideMode
      ? 'Let’s open your workspace first. Click New Draft on your dashboard, and I\'ll walk you through the rest.'
      : 'Great story — open your workspace first so I can help you turn it into a draft. Click New Draft on your dashboard, and I\'ll take it from there.';
    addMessage(userId, createMessage('assistant', reply));
    return res.json({
      reply,
      intent,
      requiresUpgrade: false,
    });
  }

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
