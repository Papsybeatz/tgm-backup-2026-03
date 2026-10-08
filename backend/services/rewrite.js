/**
 * Shared rewrite transport + prompts.
 * ----------------------------------------------------------------------------
 * `groqChat` and the rewrite prompts used to live inline in routes/ai.js. The
 * anonymous funnel needs the *same* rewrite behaviour as the signed-in
 * /rewrite-basic route, so both now import from here rather than keeping two
 * copies of the prompts that can drift apart.
 *
 * The transport delegates to agents/steve/llm.chat(), NOT a private https call.
 * That is deliberate: the original inline transport hardcoded
 * `llama-3.1-8b-instant`, which Groq retired (404 model_not_found), so every
 * rewrite 500'd with "Empty AI response". `chat()` carries the provider config,
 * the model fallback chain and per-model error reporting, so a retired model is
 * a fallback, not an outage.
 *
 * Throws `NO_KEY` when no provider is configured, so callers can decide whether
 * to fall back to a template (signed-in) or fail loudly (the public demo — an
 * unchanged document returned as a "rewrite" would be a lie).
 */
const { chat } = require('../agents/steve/llm');

/** system prompt per action, shared by every caller. */
const REWRITE_PROMPTS = {
  rewrite:
    "You are a basic rewrite assistant for free-tier users. Rewrite ONLY the user's provided text. Keep the same topic, entities, location, and intent. Do NOT introduce new project types, templates, sections, or unrelated ideas. Return one concise rewritten block (plain text only).",
  rewrite_clarity:
    "You are a clarity rewrite assistant. Rewrite ONLY the user's provided text for clarity and readability while keeping the exact same topic and meaning. No templates, no headings, no bullet sections, no topic changes. Return one concise block of plain text.",
  rewrite_impact:
    "You are an impact rewrite assistant. Rewrite ONLY the user's text to sound stronger while preserving the same topic, facts, and context. Do not invent new themes or sectors. Do not output sections. Return one concise block of plain text.",
  brainstorm_basic:
    "You are a free-tier brainstorming assistant. Expand ONLY the user's exact idea into 3-5 short, practical bullet points. Keep the same topic and context. No headings, no proposal sections, no templates, no unrelated sectors. Output plain text bullets only.",
  draft_letter:
    "You are an expert grant writer. Draft a professional grant proposal letter based on the provided content. Use formal letter format with proper greeting, introduction, need statement, project description, and closing. Use HTML with <h2>, <p>, <br/> tags. Output only the HTML.",

  /**
   * The anonymous funnel's rewrite. This is deliberately NOT the cosmetic
   * `rewrite` above: a same-facts reword does not move the Checkmate rubric, so
   * the funnel's whole premise (watch your own score move) would fail. This
   * prompt is rubric-aware — it strengthens the criteria the score actually
   * reads — while forbidding invented facts.
   */
  proposal_improve:
    "You are an expert grant reviewer and editor. Rewrite the proposal below so it scores higher on a funder's rubric. " +
    'Strengthen the statement of need with the concrete details already present, make every outcome measurable, ' +
    'add a clear budget narrative and a sustainability line if the draft lacks one, and organise the text under ' +
    'standard headings (Executive Summary, Statement of Need, Organization Background, Project Description, ' +
    'Goals and Objectives, Outcomes and Evaluation, Budget Narrative, Sustainability, Timeline, Conclusion). ' +
    'Do NOT invent facts, figures, partner names or outcomes. Where a specific number is required but absent, ' +
    'write [ADD YOUR NUMBER] as a placeholder rather than guessing. Return plain text only — no markdown fences, ' +
    'no commentary about what you changed.',
};

/**
 * One chat call, on the shared resilient transport.
 *
 * Keeps the historical `NO_KEY` error contract that routes/ai.js matches on,
 * even though llm.chat() signals the same condition as `NO_LLM_KEY`.
 */
async function groqChat(messages, maxTokens = 1800) {
  try {
    const { content } = await chat(messages, { maxTokens, temperature: 0.7 });
    return content;
  } catch (error) {
    if (error?.message === 'NO_LLM_KEY') throw new Error('NO_KEY');
    throw error;
  }
}

/**
 * Rewrite `content` with the named action's prompt.
 *
 * @throws Error('NO_KEY') when no provider is configured.
 * @throws Error('INVALID_ACTION') when the action has no prompt.
 */
async function rewriteText({ action, content, maxTokens = 1800 }) {
  const systemPrompt = REWRITE_PROMPTS[action];
  if (!systemPrompt) {
    const error = new Error('Invalid action');
    error.code = 'INVALID_ACTION';
    throw error;
  }
  return groqChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
    maxTokens,
  );
}

module.exports = { groqChat, rewriteText, REWRITE_PROMPTS };
