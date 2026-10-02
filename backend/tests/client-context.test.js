/**
 * Client-aware Steve — the ?clientId flow.
 *
 * One of three flows never exercised live. The Agency tier's whole promise is
 * that Steve writes for a *client* rather than for you, so two things must hold:
 *
 *   1. OWNERSHIP. A clientId is honoured only when the folder belongs to the
 *      requesting user. Otherwise a consultant could read a competitor's client
 *      list by guessing an id.
 *   2. GROUNDING. Templates are injected as reference material, never as facts
 *      to copy, and are capped so a large library cannot blow the token budget.
 *
 * Prisma is stubbed so the whole decision tree runs without a database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function stub(key, exports) {
  const m = new Module(key);
  m.filename = key;
  m.loaded = true;
  m.exports = exports;
  require.cache[key] = m;
}

const PRISMA_KEY = require.resolve('@prisma/client');

let folders = [];
let templates = [];
let findFirstArgs = null;
let findManyArgs = null;
let activityLogs = [];
let failNext = false;

stub(PRISMA_KEY, {
  PrismaClient: function () {
    return {
      clientFolder: {
        findFirst: async (args) => {
          findFirstArgs = args;
          if (failNext) throw new Error('db down');
          const w = args.where || {};
          return folders.find((f) => f.id === w.id && f.ownerId === w.ownerId) || null;
        },
      },
      clientTemplate: {
        findMany: async (args) => {
          findManyArgs = args;
          if (failNext) throw new Error('db down');
          const all = templates
            .filter((t) => t.clientId === args.where.clientId)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          return typeof args.take === 'number' ? all.slice(0, args.take) : all;
        },
      },
      clientActivityLog: {
        create: async ({ data }) => {
          if (failNext) throw new Error('db down');
          activityLogs.push(data);
          return data;
        },
      },
    };
  },
});

const { loadClientContext, clientPromptBlock, logClientActivity } = require('../agents/steve/clientContext.js');

function reset() {
  folders = [];
  templates = [];
  findFirstArgs = null;
  findManyArgs = null;
  activityLogs = [];
  failNext = false;
}

/* ── ownership ─────────────────────────────────────────────────────── */

test('no clientId or no userId means no client context, without a query', async () => {
  reset();
  assert.equal(await loadClientContext({ userId: 'u1', clientId: '' }), null);
  assert.equal(await loadClientContext({ userId: '', clientId: 'c1' }), null);
  assert.equal(findFirstArgs, null, 'an incomplete call must not reach the database');
});

test('a client folder belonging to someone else is refused', async () => {
  reset();
  folders = [{ id: 'c1', ownerId: 'someone-else', name: 'Not Yours' }];

  const result = await loadClientContext({ userId: 'u1', clientId: 'c1' });

  assert.equal(result, null, 'another user\'s client folder must not load');
  assert.equal(findFirstArgs.where.ownerId, 'u1', 'ownership is part of the query, not a post-filter');
});

test('the owner gets their client folder', async () => {
  reset();
  folders = [{ id: 'c1', ownerId: 'u1', name: 'Acme Nonprofit', sector: 'Youth', state: 'NY' }];

  const result = await loadClientContext({ userId: 'u1', clientId: 'c1' });

  assert.ok(result, 'the owner should get their folder');
  assert.equal(result.client.name, 'Acme Nonprofit');
  assert.ok(Array.isArray(result.templates));
});

/* ── templates ─────────────────────────────────────────────────────── */

test('templates are capped and newest-first', async () => {
  reset();
  folders = [{ id: 'c1', ownerId: 'u1', name: 'Acme' }];
  templates = Array.from({ length: 8 }, (_, i) => ({
    clientId: 'c1',
    title: `T${i}`,
    type: 'narrative',
    content: `body ${i}`,
    updatedAt: new Date(2026, 0, i + 1),
  }));

  const { templates: loaded } = await loadClientContext({ userId: 'u1', clientId: 'c1' });

  assert.equal(loaded.length, 5, 'at most 5 templates are injected');
  assert.equal(loaded[0].title, 'T7', 'the newest template comes first');
  assert.equal(findManyArgs.take, 5, 'the cap is applied in the query, not after fetching everything');
});

test('a template lookup failure degrades to no context rather than throwing', async () => {
  reset();
  folders = [{ id: 'c1', ownerId: 'u1', name: 'Acme' }];
  failNext = true;

  const result = await loadClientContext({ userId: 'u1', clientId: 'c1' });
  assert.equal(result, null, 'a conversation must never be blocked by a failed context load');
});

/* ── the injected prompt block ─────────────────────────────────────── */

test('the prompt block names the client and marks templates as reference, not facts', () => {
  const block = clientPromptBlock({
    client: { name: 'Acme Nonprofit', sector: 'Youth', state: 'NY', notes: 'Prefers plain language', funders: ['NYSCA', 'Robin Hood'] },
    templates: [{ title: 'Our standard narrative', type: 'narrative', content: '<p>Some <b>HTML</b> body</p>' }],
  });

  assert.match(block, /Acme Nonprofit/);
  assert.match(block, /Youth/);
  assert.match(block, /NY/);
  assert.match(block, /NYSCA, Robin Hood/);
  assert.match(block, /reference only/i, 'templates must be marked reference-only');
  assert.doesNotMatch(block, /<b>/, 'markup is stripped before injection');
  assert.match(block, /Some HTML body/);
});

test('the prompt block is empty when there is no client', () => {
  assert.equal(clientPromptBlock({ client: null, templates: [] }), '');
  assert.equal(clientPromptBlock({}), '');
});

test('a single template cannot blow the token budget', () => {
  const huge = 'x'.repeat(5000);
  const block = clientPromptBlock({
    client: { name: 'Acme' },
    templates: [{ title: 'Big', type: 'narrative', content: huge }],
  });
  const body = block.split('\n').find((l) => l.startsWith('- Big'));
  assert.ok(body.length < 760, `template body should be truncated, got ${body.length} chars`);
});

/* ── activity logging never breaks a turn ──────────────────────────── */

test('client activity is recorded', async () => {
  reset();
  const ok = await logClientActivity({ clientId: 'c1', userId: 'u1', action: 'draft', detail: 'wrote a narrative' });
  assert.equal(ok, true);
  assert.equal(activityLogs.length, 1);
  assert.equal(activityLogs[0].action, 'draft');
});

test('activity logging failure is swallowed and reported as false', async () => {
  reset();
  failNext = true;
  const ok = await logClientActivity({ clientId: 'c1', userId: 'u1', action: 'draft' });
  assert.equal(ok, false, 'logging must never throw into the request path');
});

test('activity logging without a clientId is a no-op', async () => {
  reset();
  const ok = await logClientActivity({ clientId: '', userId: 'u1', action: 'draft' });
  assert.equal(ok, false);
  assert.equal(activityLogs.length, 0);
});
