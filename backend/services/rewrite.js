/**
 * Shared rewrite transport + prompts.
 * ----------------------------------------------------------------------------
 * `groqChat` and the rewrite prompts used to live inline in routes/ai.js. The
 * anonymous funnel needs the *same* rewrite behaviour as the signed-in
 * /rewrite-basic route, so both now import from here rather than keeping two
 * copies of the prompts that can drift apart.
 *
 * The transport speaks the OpenAI-compatible chat-completions shape to Groq and
 * throws `NO_KEY` when no key is configured, so callers can decide whether to
 * fall back to a template (signed-in) or fail loudly (the public demo — an
 * unchanged document returned as a "rewrite" would be a lie).
 */
const https = require('https');

const DEFAULT_MODEL = 'llama-3.1-8b-instant';

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

/** One OpenAI-compatible chat call. Throws Error('NO_KEY') when unconfigured. */
async function groqChat(messages, maxTokens = 1800) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const body = JSON.stringify({
    model: DEFAULT_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.message?.content;
            if (!text) reject(new Error('Empty AI response'));
            else resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
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

module.exports = { groqChat, rewriteText, REWRITE_PROMPTS, DEFAULT_MODEL };
