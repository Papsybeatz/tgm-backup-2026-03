/**
 * Score cache — one letter, one number.
 * ----------------------------------------------------------------------------
 * The scoring model is stochastic. `scoring.js` pins `temperature: 0` and builds
 * its prompt from a fixed rubric with no dates or randomness, and the same letter
 * still came back 62/51/58/51: the provider batches requests and routes tokens
 * through a mixture-of-experts, so identical input can take a different path.
 *
 * Nothing in our code can force that to be reproducible. What we can do is stop
 * asking twice. These tests pin that: the second visitor to submit a given
 * letter gets the first visitor's number.
 *
 * Run: cd backend && node --test tests/score-cache.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeLetter,
  hashLetter,
  numericScore,
  scoreOnce,
  createMemoryScoreCache,
} = require('../utils/scoreCache');

function read(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...parts), 'utf8');
}

const CACHE_SRC = read('backend', 'utils', 'scoreCache.js');
const ROUTE_SRC = read('backend', 'routes', 'publicScore.js');
const SCHEMA_SRC = read('backend', 'utils', 'ensureSchema.js');

const LETTER = 'Dear Programme Officer, we respectfully request funding for our youth programme.';

/* ── the key ──────────────────────────────────────────────────────────────── */

test('the same words hash the same however they were uploaded', () => {
  // A .docx export, a PDF dump and a copy-paste all differ in whitespace and in
  // whatever tags survive extraction. They are the same letter and must share a
  // cache entry, or a visitor gets a fresh roll of the dice for re-uploading.
  const asDocx = 'Dear Sir,\n\n   We  request funding.\n\n\n';
  const asPasted = '<p>Dear Sir,</p><p>We request funding.</p>';
  const asWrapped = 'Dear Sir, We request\nfunding.';

  assert.equal(hashLetter(asDocx), hashLetter(asPasted));
  assert.equal(hashLetter(asDocx), hashLetter(asWrapped));
  assert.equal(normalizeLetter(asPasted), 'Dear Sir, We request funding.');
});

test('different letters hash differently', () => {
  assert.notEqual(hashLetter(LETTER), hashLetter(`${LETTER} And a second paragraph.`));
});

test('case is not folded, because case can change meaning', () => {
  // Folding case would hand a visitor someone else's score.
  assert.notEqual(hashLetter('We need $5,000.'), hashLetter('we need $5,000.'));
});

test('there is nothing to key on when there is no text', () => {
  assert.equal(hashLetter(''), null);
  assert.equal(hashLetter('   \n\t '), null);
  assert.equal(hashLetter(null), null);
  assert.equal(hashLetter(undefined), null);
});

/* ── the guarantee ────────────────────────────────────────────────────────── */

test('the same letter scores the same number every time', async () => {
  const cache = createMemoryScoreCache();
  let calls = 0;
  // Stands in for the model: a different number on every call, which is exactly
  // the behaviour that made a "score" meaningless.
  const compute = async () => ({ score: [62, 51, 58][calls++] ?? 58 });

  const first = await scoreOnce({ cache, text: LETTER, compute });
  const second = await scoreOnce({ cache, text: LETTER, compute });
  const third = await scoreOnce({ cache, text: LETTER, compute });

  assert.equal(calls, 1, 'the model must be asked once, not three times');
  assert.equal(first.report.score, 62);
  assert.equal(second.report.score, 62, 'the second visitor must not see a different number');
  assert.equal(third.report.score, 62);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(third.cached, true);
});

test('a reformatted re-upload gets the original score, not a new one', async () => {
  const cache = createMemoryScoreCache();
  let calls = 0;
  const compute = async () => ({ score: calls++ === 0 ? 62 : 51 });

  const first = await scoreOnce({ cache, text: 'Dear Sir,\n\nWe request funding.', compute });
  const second = await scoreOnce({ cache, text: '<p>Dear Sir,</p><p>We request funding.</p>', compute });

  assert.equal(calls, 1, 'the same words must not be scored twice');
  assert.equal(second.report.score, first.report.score);
});

test('a genuinely different letter is scored fresh', async () => {
  const cache = createMemoryScoreCache();
  let calls = 0;
  const compute = async () => ({ score: ++calls * 10 });

  await scoreOnce({ cache, text: LETTER, compute });
  const other = await scoreOnce({ cache, text: `${LETTER} Plus a budget table.`, compute });

  assert.equal(calls, 2, 'a different letter must not inherit the first one\'s score');
  assert.equal(other.report.score, 20);
  assert.equal(other.cached, false);
});

test('two visitors submitting the same new letter agree on one number', async () => {
  // Both call the model, one insert wins, and `remember` hands back the winner —
  // so the very first pair to see a letter still agree.
  const cache = createMemoryScoreCache();
  let calls = 0;
  const compute = async () => ({ score: ++calls === 1 ? 62 : 51 });

  const [a, b] = await Promise.all([
    scoreOnce({ cache, text: LETTER, compute }),
    scoreOnce({ cache, text: LETTER, compute }),
  ]);

  assert.equal(a.report.score, b.report.score, 'a first pair must not disagree');
});

test('the shared cache never overwrites a score it already holds', () => {
  assert.match(
    CACHE_SRC,
    /ON CONFLICT \("hash"\) DO NOTHING/,
    'a later writer must not replace the number visitors have already seen',
  );
});

/* ── failure ──────────────────────────────────────────────────────────────── */

test('an unreachable cache still returns a score', async () => {
  // A database blip must cost a visitor nothing. Failing closed here would turn
  // a cache outage into a scoring outage.
  const broken = {
    shared: true,
    async read() { throw new Error('db down'); },
    async remember() { throw new Error('db down'); },
    async recordHit() { throw new Error('db down'); },
  };

  const errors = [];
  const { report, cached } = await scoreOnce({
    cache: broken,
    text: LETTER,
    compute: async () => ({ score: 71 }),
    onError: (error) => errors.push(error.message),
  });

  assert.equal(report.score, 71, 'the visitor still gets a score');
  assert.equal(cached, false);
  assert.equal(errors.length, 2, 'both the failed read and the failed write are reported');
});

test('a broken telemetry counter does not break the response', async () => {
  const cache = {
    shared: true,
    async read() { return { report: { score: 62 }, score: 62 }; },
    async remember() { return null; },
    async recordHit() { throw new Error('counter down'); },
  };

  const { report, cached } = await scoreOnce({ cache, text: LETTER, compute: async () => ({ score: 1 }) });

  assert.equal(report.score, 62);
  assert.equal(cached, true);
});

test('a stored score of zero is still a score', () => {
  // `score ?? 0` would confuse a genuine zero with a missing value.
  assert.equal(numericScore({ score: 0 }), 0);
  assert.equal(numericScore({}), 0);
  assert.equal(numericScore(null), 0);
  assert.equal(numericScore({ score: 62.6 }), 63);
});

/* ── wiring ───────────────────────────────────────────────────────────────── */

test('the public route scores through the cache on both surfaces', () => {
  assert.match(ROUTE_SRC, /scoreOnce\(\{/, 'the route must go through the cache');

  assert.equal(
    (ROUTE_SRC.match(/await scoreLetter\(text, content\)/g) || []).length,
    2,
    'both /score and the rewrite delta baseline must use the cached score',
  );
  assert.doesNotMatch(
    ROUTE_SRC,
    /const before = await scoreDraft\(/,
    'the delta baseline must not bypass the cache — that is the mismatch that made '
      + 'the "before" number differ from the number on the page',
  );
});

test('the cache table is created at boot, since migrate deploy cannot run here', () => {
  assert.match(SCHEMA_SRC, /CREATE TABLE IF NOT EXISTS "ScoreCache"/);
  assert.match(SCHEMA_SRC, /"hash" TEXT NOT NULL/);
  assert.match(SCHEMA_SRC, /ScoreCache_pkey/);
  assert.match(SCHEMA_SRC, /"report" JSONB NOT NULL/);
});
