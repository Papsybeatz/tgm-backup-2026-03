const express = require('express');
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { logError, logAiAction } = require('../utils/logger');

/* ── Groq API call (returns plain text) ── */
async function groqChat(messages, maxTokens = 1800) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const body = JSON.stringify({
    model: 'llama-3.1-8b-instant',
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.message?.content;
          if (!text) reject(new Error('Empty AI response'));
          else resolve(text);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ── Template fallback (no API key needed) ── */
function templateDraft(prompt) {
  const org = prompt.match(/called\s+([A-Z][^,.\n]+)/i)?.[1]?.trim() || 'our organisation';
  const mission = prompt.length > 80 ? prompt.slice(0, 200) + '…' : prompt;

  return `<h2>Grant Proposal Letter</h2>

<p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

<h3>Executive Summary</h3>
<p>${org} respectfully submits this proposal requesting grant funding to support our mission of ${mission}. We believe this initiative directly aligns with your foundation's commitment to community development and sustainable impact.</p>

<h3>Organisation Background</h3>
<p>${org} is a registered non-profit organisation dedicated to creating measurable, lasting change in underserved communities. Our team combines deep local knowledge with evidence-based programming to deliver outcomes that matter.</p>

<h3>Statement of Need</h3>
<p>The communities we serve face significant barriers to access — including limited educational resources, inadequate healthcare infrastructure, and insufficient economic opportunity. Without targeted intervention, these gaps will continue to widen, perpetuating cycles of poverty and disadvantage.</p>

<h3>Project Description</h3>
<p>This grant will enable ${org} to expand our core programmes, reaching more beneficiaries with higher-quality services. Specifically, we will:</p>
<ul>
<li>Establish sustainable investment structures that fund daily operational costs</li>
<li>Provide access to quality education through partnerships with accredited institutions</li>
<li>Deliver healthcare services through mobile clinics and community health workers</li>
<li>Create enabling environments that support long-term growth and advancement</li>
</ul>

<h3>Goals & Objectives</h3>
<ul>
<li>Serve a minimum of 200 beneficiaries in the first programme year</li>
<li>Achieve 90% programme completion rate among enrolled participants</li>
<li>Establish 3 sustainable community partnerships by end of Year 1</li>
<li>Document and publish impact metrics quarterly</li>
</ul>

<h3>Budget Overview</h3>
<p>Requested funds will be allocated across personnel (40%), programme delivery (35%), infrastructure (15%), and administration (10%). A detailed budget breakdown is available upon request.</p>

<h3>Evaluation Plan</h3>
<p>We will measure success through quarterly impact reports, beneficiary surveys, and independent third-party evaluation. All data will be shared transparently with funders and the public.</p>

<h3>Conclusion</h3>
<p>We are confident that this investment in ${org} will generate significant, measurable impact for the communities we serve. We welcome the opportunity to discuss this proposal further and provide any additional information required.</p>

<p>Respectfully submitted,<br/><strong>${org}</strong></p>`;
}

function templateImprove(html) {
  // Strip tags to get plain text for context, then return enhanced version
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return `<h2>Revised Grant Proposal</h2>
<p><em>AI-enhanced version — review and personalise before submission.</em></p>
${html}
<h3>Strengthening Notes</h3>
<ul>
<li>Consider adding specific data points and statistics to support your need statement</li>
<li>Include letters of support from community partners or beneficiaries</li>
<li>Quantify your impact goals with measurable KPIs</li>
<li>Align your language directly with the funder's stated priorities</li>
<li>Add a sustainability plan showing how the programme continues after grant funding ends</li>
</ul>`;
}

function templateBrainstorm(prompt) {
  const cleanedPrompt = String(prompt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const projectText = cleanedPrompt || 'a community project in need of support';
  return [
    `This grant request seeks funding to support ${projectText}. The proposal focuses on a clear, immediate need and explains how targeted funding will improve day-to-day care, stability, and long-term outcomes for the people being served.`,
    `Funding would help cover core programme needs, staffing, supplies, and a safe operating environment while giving the organisation a stronger foundation for measurable impact. This summary can be expanded into a full proposal once the project goals, budget, and expected outcomes are confirmed.`,
  ].join('\n\n');
}

/* ── POST /api/ai/brainstorm ── */
router.post('/brainstorm', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ message: 'prompt is required' });

  try {
    let text;
    try {
      text = await groqChat([
        {
          role: 'system',
          content: `You are a grant-writing brainstorming assistant for a free-tier workspace. Expand the user's idea into 1-2 short, topic-aligned paragraphs in plain text. Do not output HTML. Do not invent unrelated sectors or template sections. Stay tightly grounded in the user's prompt and keep the response concise, specific, and easy to build on.`,
        },
        { role: 'user', content: `Expand this grant idea into a short brainstorming draft:\n\n${prompt}` },
      ], 220);
    } catch (e) {
      if (e.message === 'NO_KEY') {
        text = templateBrainstorm(prompt);
      } else {
        throw e;
      }
    }
    logAiAction('brainstorm_generated', { email: req.user?.email, promptLength: prompt.length });
    return res.json({ text });
  } catch (err) {
    logError('AI_BRAINSTORM', err, { email: req.user?.email });
    return res.status(500).json({ message: err.message || 'AI brainstorming failed' });
  }
});

/* ── POST /api/ai/draft ── */
router.post('/draft', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ message: 'prompt is required' });

  try {
    let draft;
    try {
      draft = await groqChat([
        {
          role: 'system',
          content: `You are an expert grant writer. Write a complete, professional grant proposal letter in HTML format using <h2>, <h3>, <p>, <ul>, <li> tags. 
Include: Executive Summary, Organisation Background, Statement of Need, Project Description, Goals & Objectives, Budget Overview, Evaluation Plan, and Conclusion.
Be specific, compelling, and funder-focused. Use formal but accessible language. Output only the HTML content, no markdown fences.`,
        },
        { role: 'user', content: `Write a grant proposal letter based on this description:\n\n${prompt}` },
      ]);
    } catch (e) {
      if (e.message === 'NO_KEY') {
        draft = templateDraft(prompt);
      } else {
        throw e;
      }
    }
    logAiAction('draft_generated', { email: req.user?.email, promptLength: prompt.length, usedGroq: !draft.includes('AI-enhanced') });
    return res.json({ draft });
  } catch (err) {
    logError('AI_DRAFT', err, { email: req.user?.email });
    return res.status(500).json({ message: err.message || 'AI generation failed' });
  }
});

/* ── POST /api/ai/improve ── */
router.post('/improve', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'content is required' });

  try {
    let output;
    try {
      output = await groqChat([
        {
          role: 'system',
          content: `You are an expert grant writer and editor. Improve the provided grant proposal HTML to make it more compelling, specific, and funder-aligned.
Enhance clarity, strengthen the need statement, sharpen impact language, and ensure professional tone throughout.
Return the improved content as HTML using <h2>, <h3>, <p>, <ul>, <li> tags. Output only the HTML, no markdown fences.`,
        },
        { role: 'user', content: `Improve this grant proposal:\n\n${content}` },
      ]);
    } catch (e) {
      if (e.message === 'NO_KEY') {
        output = templateImprove(content);
      } else {
        throw e;
      }
    }
    logAiAction('draft_improved', { email: req.user?.email, contentLength: content.length });
    return res.json({ output });
  } catch (err) {
    logError('AI_IMPROVE', err, { email: req.user?.email });
    return res.status(500).json({ message: err.message || 'AI improve failed' });
  }
});

/* ── POST /api/ai/rewrite-basic ── */
router.post('/rewrite-basic', requireAuth, async (req, res) => {
  const { action, content, draftId } = req.body;
  if (!action || !content) return res.status(400).json({ message: 'action and content are required' });

  try {
    const isFree = req.user.tier === 'free';
    if (isFree && draftId) {
      const draft = await prisma.draft.findFirst({ where: { id: draftId, userId: req.user.id } });
      if (draft && draft.aiActionCount >= 3) {
        return res.status(403).json({ success: false, canUseAi: false, reason: 'ai_limit_reached', message: 'Free tier AI limit reached (3 actions per draft). Upgrade for unlimited AI.' });
      }
    }

    let systemPrompt = '';
    switch (action) {
      case 'rewrite':
        systemPrompt = 'You are an expert grant writer. Rewrite the provided grant proposal section to make it clearer, more compelling, and funder-focused. Preserve the HTML structure using <h2>, <h3>, <p>, <ul>, <li> tags. Output only the HTML, no markdown fences.';
        break;
      case 'rewrite_clarity':
        systemPrompt = 'You are an expert grant editor. Rewrite the provided grant proposal section for maximum clarity and readability. Simplify complex sentences, improve flow, and ensure the need statement is easy to understand. Preserve HTML structure. Output only the HTML.';
        break;
      case 'rewrite_impact':
        systemPrompt = 'You are an expert grant writer. Rewrite the provided grant proposal section to maximize emotional and logical impact. Strengthen the need statement, use powerful but truthful language, and make the case for funding irresistible. Preserve HTML structure. Output only the HTML.';
        break;
      case 'brainstorm_basic':
        systemPrompt = 'You are a grant-writing brainstorming assistant for a free-tier workspace. Expand the user\'s idea into 1-2 short, topic-aligned paragraphs in plain text. Do not output HTML. Do not invent unrelated sectors. Stay tightly grounded in the user\'s prompt and keep the response concise and specific.';
        break;
      case 'draft_letter':
        systemPrompt = 'You are an expert grant writer. Draft a professional grant proposal letter based on the provided content. Use formal letter format with proper greeting, introduction, need statement, project description, and closing. Use HTML with <h2>, <p>, <br/> tags. Output only the HTML.';
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    let output;
    try {
      output = await groqChat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ]);
    } catch (e) {
      if (e.message === 'NO_KEY') {
        output = content;
      } else {
        throw e;
      }
    }

    if (isFree && draftId) {
      try {
        await prisma.draft.update({ where: { id: draftId }, data: { aiActionCount: { increment: 1 } } });
      } catch (e) {
        console.warn('[AI] failed to increment aiActionCount', e && e.message ? e.message : e);
      }
    }

    const response = { success: true, output };
    if (isFree && draftId) {
      const updated = await prisma.draft.findUnique({ where: { id: draftId } });
      response.aiActionCount = updated?.aiActionCount ?? null;
    }
    logAiAction(`rewrite_basic_${action}`, { email: req.user?.email, draftId: draftId || null });
    return res.json(response);
  } catch (err) {
    logError('AI_REWRITE_BASIC', err, { email: req.user?.email });
    return res.status(500).json({ message: err.message || 'AI rewrite failed' });
  }
});

module.exports = router;
