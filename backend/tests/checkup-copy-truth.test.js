/**
 * The checkup page's privacy and limit copy must match what the system does.
 * ----------------------------------------------------------------------------
 * Two claims on /checkup had drifted away from the code:
 *
 *   1. "It is never stored." True of the FILE. Not true of the derived report,
 *      which the score cache has persisted since it landed (keyed by a SHA-256
 *      of the normalised text). A privacy claim that is slightly false is worse
 *      than a narrower claim that is exactly true, because the whole reason a
 *      consultant uploads a client's proposal here is the sentence above the
 *      upload button.
 *
 *   2. "Six free scores." The daily wall is keyed on the visitor, which is
 *      correct, but a visitor behind carrier NAT or an office connection shares
 *      that key with strangers. So the number is a ceiling the system cannot
 *      always deliver to any one person, and copy that states it as a fact is
 *      making a promise the product will break for someone on their first visit.
 *
 * These tests fail if either claim drifts back, in either direction: if the
 * copy over-promises, or if the code changes underneath copy that is now wrong.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PAGE_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'src', 'components', 'PublicScorePage.jsx'),
  'utf8',
);
const CACHE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'utils', 'scoreCache.js'),
  'utf8',
);

test('the page does not claim that nothing is stored', () => {
  // The document is not stored; the report derived from it is. Both halves
  // have to be on the page, because a visitor reading only the first half would
  // conclude nothing of theirs survives the request.
  assert.doesNotMatch(
    PAGE_SRC,
    /It is never\s+stored, and we never share it/,
    'the blanket "never stored" claim is not true while the score cache persists the report',
  );
  assert.match(
    PAGE_SRC,
    /the file is\s+never stored and never shared/,
    'the copy must be specific that the FILE is what is not stored',
  );
  assert.match(
    PAGE_SRC,
    /the result is saved\s+against a fingerprint of the text, not the text itself/,
    'the copy must disclose that the derived report is kept, and how it is keyed',
  );
});

test('the disclosed storage behaviour is what the cache actually does', () => {
  // Pins the copy to the implementation rather than to a sentence someone
  // liked. If the cache ever starts storing the text itself, or stops keying on
  // a hash, the disclosure above becomes false and this fails.
  assert.match(CACHE_SRC, /hashLetter/, 'the cache must key on a derived hash');
  assert.match(
    CACHE_SRC,
    /createHash\('sha256'\)/,
    'the fingerprint must be a hash, not a reversible encoding of the text',
  );
  assert.match(
    CACHE_SRC,
    /TABLE\s*=\s*'ScoreCache'/,
    'the stored artefact is the report table',
  );
});

test('the page does not promise a fixed number of free scores', () => {
  // A fixed number is a promise about a shared resource. The wall is keyed on
  // the visitor, so two strangers behind one carrier-NAT address share it.
  assert.doesNotMatch(
    PAGE_SRC,
    /Six free scores|6 free scores/i,
    'the number cannot be stated as a fact while the allowance is shared by connection',
  );
  // Whitespace-tolerant: the sentence is wrapped across lines in the JSX, and a
  // literal-space pattern would fail on a purely cosmetic reflow.
  assert.match(
    PAGE_SRC,
    /Free scores are limited\s+each\s+day/,
    'the copy must describe the allowance without promising an exact count',
  );
});

test('the free rewrite is described as daily, matching the 24-hour wall', () => {
  // publicRewriteDailyLimiter is 1 per 24h. Copy that says "one free rewrite"
  // with no period reads as one ever, which is both wrong and worse than the
  // truth.
  assert.match(
    PAGE_SRC,
    /One free rewrite a day/,
    'the rewrite allowance must state its window',
  );
  const limiter = fs.readFileSync(
    path.join(__dirname, '..', 'middleware', 'rateLimit.js'),
    'utf8',
  );
  const block = limiter.match(/publicRewriteDailyLimiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/);
  assert.ok(block, 'publicRewriteDailyLimiter definition not found');
  assert.equal(
    Number(block[0].match(/max:\s*(\d+)/)?.[1]),
    1,
    'the copy says one, so the limiter must be one',
  );
  assert.match(block[0], /windowMs:\s*24 \* 60 \* 60 \* 1000/, 'and the window must be a day');
});

test('the page never states the limit as an exact allowance anywhere', () => {
  // The number appears in the tier config and the server response, but it must
  // not be repeated to the visitor as a promise. This is the guard that stops
  // it creeping back in a future copy pass.
  const hits = PAGE_SRC.match(/[Ss]ix free|[Ss]ix scores|\b6 free scores/gi) || [];
  assert.deepEqual(hits, [], `found a fixed-count promise in the copy: ${hits.join(', ')}`);
});
