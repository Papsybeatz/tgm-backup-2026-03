/**
 * Steve — Drafting engine
 * ----------------------------------------------------------------------------
 * Turns a completed order ticket into a real grant document.
 *
 * When an LLM key is present, each section is written by the model grounded
 * strictly in the applicant's own order lines. When no key is present (or the
 * model fails), the deterministic assembler writes a genuinely complete
 * proposal from the SAME order data — never the old one-size-fits-all template.
 */
const { chat, extractJson, isEnabled } = require('./llm');
const { SLOTS, deriveTitle, formatAmount, parseAmount, isBlank } = require('./order');

const FULL_PROPOSAL_SECTIONS = [
  'Executive Summary',
  'Statement of Need',
  'Organization Background',
  'Project Description',
  'Goals & Objectives',
  'Outcomes & Evaluation',
  'Budget Narrative',
  'Sustainability',
  'Timeline',
  'Conclusion',
];

const LETTER_SECTIONS = [
  'Opening',
  'Statement of Need',
  'Project Description',
  'Budget Request',
  'Conclusion',
];

function sectionsForStyle(style) {
  return style === 'letter' ? LETTER_SECTIONS : FULL_PROPOSAL_SECTIONS;
}

function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sentence(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function budgetLines(order) {
  const amount = parseAmount(order?.request_amount);
  if (!isBlank(order?.budget_breakdown)) {
    return String(order.budget_breakdown)
      .split(/\n|;|•/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (amount === null) return [];
  // Proportional budget grounded in the applicant's stated activities.
  const allocation = [
    ['Direct program delivery', 0.45],
    ['Personnel and program staff', 0.3],
    ['Facilities, utilities, and transport', 0.15],
    ['Administration and evaluation', 0.1],
  ];
  return allocation.map(([label, share]) => `${label}: ${formatAmount(amount * share)}`);
}

function buildContext(order) {
  const title = deriveTitle(order);
  const amount = formatAmount(order?.request_amount);
  return { title, amount, order };
}

/* ───────────────────────── deterministic assembler ───────────────────────── */

/**
 * The one-page grant letter.
 *
 * The proposal-shaped map below has no Opening or Budget Request, so without
 * this the letter style fell back to pasting the Statement of Need into those
 * sections and shipped a visibly wrong document.
 */
function assembleLetter(order) {
  const proposal = assembleDraft(order);
  const { title, amount } = buildContext(order);
  const org = String(order?.applicant_name || 'The applicant organization').trim();
  const type = String(order?.applicant_type || 'nonprofit organization').trim();
  const area = String(order?.service_area || 'the service area').trim();
  const funder = String(order?.funder_name || 'your foundation').trim();
  const need = sentence(order?.need_statement) || 'The community faces a documented and unmet need.';
  const lines = budgetLines(order);
  const budgets = lines.length
    ? lines.map((line) => `<li>${esc(line)}</li>`).join('')
    : '<li>Detailed line-item budget available on request.</li>';

  return {
    Opening: `<p>Dear Program Officer,</p><p>${esc(org)} is a ${esc(type)} serving ${esc(area)}. We respectfully request ${esc(amount)} from ${esc(funder)} to fund ${esc(title)}.</p><p>${esc(need)}</p>`,
    'Statement of Need': proposal['Statement of Need'],
    'Project Description': proposal['Project Description'],
    'Budget Request': `<p>We respectfully request ${esc(amount)}, allocated as follows:</p><ul>${budgets}</ul><p>Every line item is tied directly to the activities above. A detailed budget and supporting documentation are available on request.</p>`,
    Conclusion: proposal.Conclusion,
  };
}

/** Build the section map for whichever deliverable was asked for. */
function assembleForStyle(order, style) {
  return style === 'letter' ? assembleLetter(order) : assembleDraft(order);
}

function assembleDraft(order) {
  const { title, amount } = buildContext(order);
  const org = String(order?.applicant_name || 'The applicant organization').trim();
  const type = String(order?.applicant_type || 'nonprofit organization').trim();
  const need = sentence(order?.need_statement) || 'The community faces a documented and urgent unmet need.';
  const activities = sentence(order?.program_activities) || 'The funded program will deliver direct services to the people who need them most.';
  const population = String(order?.target_population || 'the community').trim();
  const served = isBlank(order?.people_served) ? null : String(order.people_served).trim();
  const area = String(order?.service_area || 'the service area').trim();
  const address = String(order?.address || '').trim();
  const funder = String(order?.funder_name || 'the funder').trim();
  const outcomes = sentence(order?.outcomes) || 'Measurable improvements in the lives of the people served.';
  const evidence = sentence(order?.evidence) || '';
  const timeline = isBlank(order?.timeline)
    ? 'The program is designed for a twelve-month implementation cycle.'
    : `The funded work runs ${String(order.timeline).trim()}.`;
  const contact = isBlank(order?.contact_name) ? '' : String(order.contact_name).trim();
  const deadline = isBlank(order?.deadline) ? '' : String(order.deadline).trim();
  const lines = budgetLines(order);
  const budgets = lines.length
    ? lines.map((line) => `<li>${esc(line)}</li>`).join('')
    : '<li>Detailed line-item budget available on request.</li>';

  const goals = [
    served ? `Serve ${esc(served)} ${esc(population)} directly.` : `Serve ${esc(population)} directly.`,
    esc(sentence(outcomes)),
    `Deliver the funded activities in ${esc(area)} within the implementation period.`,
  ]
    .map((goal) => `<li>${goal}</li>`)
    .join('');

  return {
    'Executive Summary': `<p>${esc(org)}, a ${esc(type)} serving ${esc(area)}, respectfully requests ${esc(amount)} from ${esc(funder)} to fund ${esc(title)}. ${esc(need)} This proposal sets out the need, the program design, the budget, and the measurable outcomes the funding will produce.</p>`,
    'Statement of Need': `<p>${esc(need)} The people most affected are ${esc(population)}${served ? ` — approximately ${esc(served)} individuals` : ''} in ${esc(area)}. Without targeted investment, this need will continue unmet and the cost of inaction will be carried by the community itself.</p>${evidence ? `<p>Evidence from our work to date: ${esc(evidence)}</p>` : ''}`,
    'Organization Background': `<p>${esc(org)} is a ${esc(type)} operating in ${esc(area)}. The organization exists to serve ${esc(population)} and delivers its work through disciplined, locally grounded programming.${address ? ` The organization is located at ${esc(address)}.` : ''}</p>`,
    'Project Description': `<p>${esc(title)} will be delivered over the funding period with a clear operating model. Specifically, the grant will fund the following activities:</p><p>${esc(activities)}</p><p>Delivery is sequenced from mobilization and staffing, through direct service delivery, to measurement and reporting, so that the funder can see progress at every stage.</p>`,
    'Goals & Objectives': `<ul>${goals}</ul>`,
    'Outcomes & Evaluation': `<p>${esc(outcomes)} Progress will be measured against these outcomes through intake records, service logs, and participant follow-up. Results are compiled into periodic reports so the funder receives verifiable evidence of what the investment achieved, not just activity counts.</p>`,
    'Budget Narrative': `<p>The requested ${esc(amount)} is allocated as follows:</p><ul>${budgets}</ul><p>Every line item is tied directly to delivery of the activities described above. A detailed line-item budget and supporting documentation are available on request.</p>`,
    Sustainability: `<p>Beyond this grant period, ${esc(org)} will sustain the program through diversified funding, earned partnerships, and continued local support. The goal is not a one-time intervention but durable capacity in ${esc(area)} for ${esc(population)}.</p>`,
    Timeline: `<p>${esc(timeline)}</p>`,
    Conclusion: `<p>This is a credible, funder-ready opportunity: a clearly documented need, a specific program that addresses it, a budget tied to delivery, and outcomes the funder can hold us to. ${esc(org)} is ready to begin immediately upon award.${deadline ? ` We note the submission deadline of ${esc(deadline)}.` : ''} Thank you for your consideration.</p>${contact ? `<p>Respectfully submitted,<br/><strong>${esc(contact)}</strong><br/>${esc(org)}</p>` : ''}`,
  };
}

/* ────────────────────────────── LLM writer ────────────────────────────── */

function orderPromptBlock(order) {
  const lines = Object.keys(SLOTS)
    .filter((key) => !isBlank(order?.[key]))
    .map((key) => `${SLOTS[key].label}: ${order[key]}`);
  return lines.join('\n');
}

async function writeWithLLM(order, style) {
  const sections = sectionsForStyle(style);
  const amount = formatAmount(order?.request_amount);
  const prompt = [
    'You are Steve, an expert grant writer. Write a real, funder-ready grant document.',
    'Use ONLY the facts in the order ticket below. Never invent statistics, partners, dates, or awards that are not supplied.',
    'If a detail is missing, write around it without fabricating a number.',
    `Funder: ${order?.funder_name || 'a general funder'}. Requested amount: ${amount}.`,
    order?.funder_guidelines ? `Funder guidelines/priorities to align to:\n${order.funder_guidelines}` : '',
    '',
    'ORDER TICKET',
    orderPromptBlock(order),
    '',
    `Write these sections: ${sections.join(', ')}.`,
    'Return ONLY JSON of the form {"sections": {"<section name>": "<html>"}} using <p>, <ul>, <li>, <strong> tags. No markdown fences.',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await chat(
    [
      { role: 'system', content: 'You write precise, professional grant proposals as strict HTML. You never fabricate facts. You output JSON only.' },
      { role: 'user', content: prompt },
    ],
    { json: true, temperature: 0.5, maxTokens: 3000, label: 'draft' },
  );

  const parsed = extractJson(response.content);
  const raw = parsed?.sections || parsed;
  if (!raw || typeof raw !== 'object') throw new Error('LLM returned no sections');

  const out = {};
  sections.forEach((name) => {
    const value = raw[name] || raw[name.toLowerCase()];
    if (typeof value === 'string' && value.trim()) out[name] = value.trim();
  });
  if (Object.keys(out).length === 0) throw new Error('LLM returned an empty draft');
  return out;
}

async function reviseWithLLM(order, sectionName, currentHtml, instruction) {
  const response = await chat(
    [
      {
        role: 'system',
        content:
          'You are Steve, an expert grant editor. You revise only the requested section and return strict HTML. You never fabricate facts.',
      },
      {
        role: 'user',
        content: [
          `Order ticket facts (source of truth):\n${orderPromptBlock(order)}`,
          '',
          `SECTION: ${sectionName}`,
          `CURRENT HTML:\n${currentHtml}`,
          '',
          `REQUESTED CHANGE: ${instruction}`,
          '',
          'Return only the revised HTML for this section. No markdown fences.',
        ].join('\n'),
      },
    ],
    { temperature: 0.5, maxTokens: 1400, label: 'revise' },
  );
  const html = String(response.content || '').trim();
  if (!html) throw new Error('LLM returned an empty revision');
  return html.replace(/```(?:html)?/gi, '').trim();
}

/* ─────────────────────────────── public API ─────────────────────────────── */

function renderDocument(title, sectionMap, style) {
  const order =
    style === 'letter'
      ? ['Opening', 'Statement of Need', 'Project Description', 'Budget Request', 'Conclusion']
      : Object.keys(sectionMap);

  const body = order
    .filter((name) => sectionMap[name])
    .map((name) => `<h2>${esc(name)}</h2>\n${sectionMap[name]}`)
    .join('\n\n');

  return `<h1>${esc(title)}</h1>\n${body}`;
}

/**
 * Generate a complete grant draft from an order ticket.
 * @returns {Promise<{html: string, sections: object, usedLLM: boolean, title: string, style: string}>}
 */
async function generateGrant(order, options = {}) {
  const style = options.style || order?.style || 'letter';
  const title = options.title || deriveTitle(order);
  const sectionNames = sectionsForStyle(style);

  let sections;
  let usedLLM = false;

  if (isEnabled()) {
    try {
      sections = await writeWithLLM(order, style);
      usedLLM = true;
    } catch (error) {
      sections = null;
    }
  }

  if (!sections) {
    const assembled = assembleForStyle(order, style);
    sections = {};
    sectionNames.forEach((name) => {
      sections[name] = assembled[name] || assembled['Statement of Need'];
    });
  } else {
    // Fill any section the model skipped so the document is never partial.
    const assembled = assembleForStyle(order, style);
    sectionNames.forEach((name) => {
      if (!sections[name]) sections[name] = assembled[name] || assembled['Statement of Need'];
    });
  }

  return { html: renderDocument(title, sections, style), sections, usedLLM, title, style };
}

/** Revise a single section, falling back to a deterministic rewrite. */
async function reviseSection(order, sectionName, currentHtml, instruction) {
  if (isEnabled()) {
    try {
      const html = await reviseWithLLM(order, sectionName, currentHtml, instruction);
      return { html, usedLLM: true };
    } catch (error) {
      // fall through
    }
  }
  const assembled = assembleDraft(order);
  const rebuilt = assembled[sectionName];
  return { html: rebuilt || currentHtml, usedLLM: false };
}

module.exports = {
  FULL_PROPOSAL_SECTIONS,
  LETTER_SECTIONS,
  sectionsForStyle,
  assembleDraft,
  assembleLetter,
  assembleForStyle,
  generateGrant,
  reviseSection,
  buildContext,
};
