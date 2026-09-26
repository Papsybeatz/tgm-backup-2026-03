/**
 * Steve concierge — agent tests
 * ----------------------------------------------------------------------------
 * Run:  cd backend && npm run test:steve
 *
 * These tests exercise the two engines without a database or an LLM key:
 *   1. the deterministic planner (no key configured)
 *   2. the tool-calling agent loop (LLM stubbed)
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:1/test';
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const llm = require('../agents/steve/llm');
const store = require('../agents/steve/store');
const { runSteveTurn } = require('../agents/steve/agent');
const { REQUIRED_SLOTS, isComplete } = require('../agents/steve/order');

const FULL_ORDER = {
  applicant_name: 'Hope Orphanage',
  applicant_type: '501(c)(3) nonprofit',
  need_statement: 'Thirty orphaned children aged 4 to 15 in Roanoke have no stable home or school access.',
  program_activities: 'Fund school fees, two daily meals, and a supervised dormitory.',
  target_population: 'Orphaned children aged 4 to 15',
  people_served: '30',
  service_area: 'Roanoke, Virginia',
  address: '4210 Electric Road #1038, Roanoke, VA 24018',
  request_amount: '75000',
  outcomes: 'Serve 30 children with 95% school enrollment and 100% daily meal coverage.',
  timeline: 'January to December 2027',
  funder_name: 'The Community Foundation',
  contact_name: 'Grace Mensah, Director',
  deadline: 'March 15',
};

/* ─────────────────────────── planner (no LLM key) ─────────────────────────── */

test('planner asks exactly one question per turn and finishes the ticket', async () => {
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const userId = `planner_${Date.now()}`;
  await store.resetSession(userId);

  const first = await runSteveTurn({ user: null, userId, message: 'I need a grant for my orphanage' });
  assert.equal(first.engine, 'planner');
  assert.ok(first.reply.includes('?'), 'Steve must ask a question');
  assert.equal(first.progress.requiredFilled, 0);

  // Answer every required line, one turn at a time.
  const answers = REQUIRED_SLOTS.map((key) => FULL_ORDER[key]);
  let last = first;
  for (const answer of answers) {
    last = await runSteveTurn({ user: null, userId, message: answer });
  }

  assert.equal(last.progress.complete, true, 'ticket should be complete after all answers');
  assert.ok(/shall i write it now\?/i.test(last.reply), 'Steve should read back and ask to write');

  const done = await runSteveTurn({ user: null, userId, message: 'yes' });
  assert.equal(done.intent, 'draft_ready');
  assert.equal(done.hasDraft, true);
  assert.ok(done.score >= 1 && done.score <= 100, 'Checkmate must return a real score');
  assert.ok(done.editedSections.length >= 5, 'the draft must contain real sections');
});

/* ───────────────────────── agent loop (LLM stubbed) ───────────────────────── */

test('agent loop captures the order, asks the next question, then writes the grant', async () => {
  process.env.GROQ_API_KEY = 'test-key';

  llm.isEnabled = () => true;
  llm.chat = async (messages, options = {}) => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const hasTools = Array.isArray(options.tools) && options.tools.length > 0;
    const wantsDraft = /^(yes|write it|go ahead)/i.test(String(lastUser?.content || '').trim());

    if (!hasTools) return { content: '', toolCalls: [], finishReason: 'stop', raw: {} };

    if (wantsDraft) {
      return {
        content: '',
        toolCalls: [
          { id: `call_draft_${Date.now()}`, type: 'function', function: { name: 'create_draft', arguments: '{}' } },
        ],
        finishReason: 'tool_calls',
        raw: { role: 'assistant', content: '' },
      };
    }

    // Model extracts the whole ticket in one go, the way a real model would.
    return {
      content: 'Got it — I have what I need.',
      toolCalls: [
        {
          id: `call_intake_${Date.now()}`,
          type: 'function',
          function: { name: 'capture_intake', arguments: JSON.stringify({ fields: FULL_ORDER }) },
        },
      ],
      finishReason: 'tool_calls',
      raw: { role: 'assistant', content: '' },
    };
  };

  const userId = `agent_${Date.now()}`;
  await store.resetSession(userId);

  const turn = await runSteveTurn({
    user: null,
    userId,
    message: 'A client of mine started an orphanage with 30 orphans and needs a grant written.',
  });

  assert.equal(turn.engine, 'agent');
  assert.equal(isComplete(turn.order), true, 'agent must have filled every required line');
  assert.ok(/shall i write it now\?/i.test(turn.reply), 'guardrail must ask for confirmation');

  const done = await runSteveTurn({ user: null, userId, message: 'yes' });
  assert.equal(done.hasDraft, true);
  assert.equal(done.status, 'ready_for_review');
  assert.ok(done.score >= 1 && done.score <= 100);
  assert.ok(done.reply.includes('/100'), 'Steve must report the Checkmate score');
});

test('a correction amends the ticket instead of being filed as an answer', async () => {
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENAI_API_KEY;
  llm.isEnabled = () => false; // earlier tests stub this to true

  const userId = `amend_${Date.now()}`;
  await store.resetSession(userId);

  const setup = [
    'start', 'Hope Soccer Academy', 'School', 'Street kids lack structured football pathways',
    'Training and equipment', 'Street kids with football talent', 'Greater Accra, Ghana',
    '6317 Sakatsuru Loop, Dansoman', '$75,000', 'Serve 120 kids',
  ];
  let turn;
  for (const answer of setup) {
    turn = await runSteveTurn({ user: null, userId, message: answer });
  }
  assert.equal(turn.progress.complete, true);
  assert.equal(turn.order.request_amount, '$75,000');

  const amended = await runSteveTurn({ user: null, userId, message: 'change the amount to $250k' });
  assert.equal(amended.intent, 'amend');
  assert.equal(Number(amended.order.request_amount), 250000, 'ticket amount must be updated');
  assert.match(amended.reply, /updated/i);
  assert.match(amended.reply, /\$250,000/);
  assert.match(amended.reply, /write it now\?/i, 'must re-offer to write');

  // Writing must use the corrected amount, not the original.
  const written = await runSteveTurn({ user: null, userId, message: 'yes' });
  assert.equal(written.hasDraft, true);
  // Assert on the request line, not a bare substring: $75,000 legitimately
  // appears as a proportional budget line (30% of $250,000).
  assert.match(written.docHtml, /requests \$250,000/);
  assert.doesNotMatch(written.docHtml, /requests \$75,000/);

  // Correcting again must rewrite the existing draft.
  const again = await runSteveTurn({ user: null, userId, message: 'change the amount to $300k' });
  assert.equal(again.intent, 'amend');
  assert.match(again.docHtml, /\$300,000/);
});

test('a long story is never filed as the organization name', async () => {
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENAI_API_KEY;
  llm.isEnabled = () => false;

  const userId = `prose_${Date.now()}`;
  await store.resetSession(userId);

  const story =
    'my friend gathers soccer talented kids from the streets and its a soccer academy in the making, so he needs a grant letter to apply for grant support';

  await runSteveTurn({ user: null, userId, message: 'It is a nonprofit' });
  const turn = await runSteveTurn({ user: null, userId, message: story });

  assert.notEqual(turn.order.applicant_name, story, 'the story must not become the org name');
  assert.equal(turn.order.need_statement, story, 'the story belongs in the need statement');
  assert.match(turn.reply, /name of the organization/i, 'must still ask for the real name');
});

test('a detail Steve acknowledges in its reply is still filed on the ticket', async () => {
  process.env.GROQ_API_KEY = 'test-key';
  llm.isEnabled = () => true;

  // A model that talks about the detail but returns no fields at all — the
  // exact failure reported from a real session.
  llm.chat = async () => ({
    content: JSON.stringify({
      fields: {},
      reply: 'Got it — thanks for sharing that the orphanage serves 30 children. What is the organisation called?',
    }),
    toolCalls: [],
    finishReason: 'stop',
    raw: { role: 'assistant', content: '' },
  });

  const userId = `ack_${Date.now()}`;
  await store.resetSession(userId);

  const turn = await runSteveTurn({
    user: null,
    userId,
    message: 'A client of mine started an orphanage with 30 orphans and wants me to write her a grant',
  });

  assert.equal(Number(turn.order.people_served), 30, 'the acknowledged count must be on the ticket');
  assert.equal(turn.order.target_population, 'orphans');
});

test('a street number is never filed as a funding amount', async () => {
  process.env.GROQ_API_KEY = 'test-key';
  llm.isEnabled = () => true;
  llm.chat = async () => ({
    content: JSON.stringify({ fields: {}, reply: 'Thanks — what is the funding amount?' }),
    toolCalls: [],
    finishReason: 'stop',
    raw: { role: 'assistant', content: '' },
  });

  const userId = `addr_${Date.now()}`;
  await store.resetSession(userId);
  const turn = await runSteveTurn({ user: null, userId, message: '6317 Sakatsuru Loop, Dansoman, Accra' });

  assert.equal(turn.order.request_amount, undefined, 'an address must not become a request amount');
});

test('guardrail refuses to write while the ticket is incomplete', async () => {
  process.env.GROQ_API_KEY = 'test-key';
  llm.isEnabled = () => true;

  // A misbehaving model that tries to write immediately.
  llm.chat = async (messages, options = {}) => {
    if (!Array.isArray(options.tools) || options.tools.length === 0) {
      return { content: '', toolCalls: [], finishReason: 'stop', raw: {} };
    }
    return {
      content: '',
      toolCalls: [
        { id: 'call_early', type: 'function', function: { name: 'create_draft', arguments: '{}' } },
      ],
      finishReason: 'tool_calls',
      raw: { role: 'assistant', content: '' },
    };
  };

  const userId = `guard_${Date.now()}`;
  await store.resetSession(userId);

  const turn = await runSteveTurn({ user: null, userId, message: 'write me a grant' });
  assert.equal(turn.hasDraft, false, 'must not ship a draft with an empty ticket');
  assert.ok(turn.reply.includes('?'), 'must ask for the missing detail instead');
  assert.ok(turn.progress.requiredFilled === 0);
});
