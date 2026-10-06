/**
 * The Checkmate score card — the share loop.
 * ----------------------------------------------------------------------------
 * Two things have to hold or the share loop does damage instead of good:
 *
 *   1. The client's file name must never reach the card. A consultant posting
 *      their score must not leak which client the draft belongs to.
 *   2. The card must be built in the browser. A score card is a nice-to-have;
 *      uploading a client's proposal to render one would break the promise the
 *      whole funnel rests on.
 *
 * Run: cd backend && npm run test:share
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const CARD_SRC = read('src', 'lib', 'scoreCard.js');
const FUNNEL = read('src', 'components', 'PublicScorePage.jsx');

// The card module is ESM; load it dynamically from this CJS test file.
const CARD_MODULE = pathToFileURL(path.join(ROOT, 'src', 'lib', 'scoreCard.js')).href;
const load = () => import(CARD_MODULE);

const REPORT = {
  score: 84,
  label: 'Ready',
  criteria: { need: 91, completeness: 88, evidence: 72, outcomes: 85, budget: 80, compliance: 95 },
  criteriaDefs: [
    { key: 'need', label: 'Statement of Need' },
    { key: 'completeness', label: 'Completeness' },
    { key: 'evidence', label: 'Evidence & Proof' },
    { key: 'outcomes', label: 'Measurable Outcomes' },
    { key: 'budget', label: 'Budget Credibility' },
    { key: 'compliance', label: 'Compliance Readiness' },
  ],
  fileName: 'acme-health-rehab-2026.pdf',
  words: 1840,
  style: 'proposal',
  evidenceFloorApplied: false,
};

/* ── the redaction guarantee ──────────────────────────────────────────────── */

test('the file name is masked down to its extension', async () => {
  const { redactFileName } = await load();
  assert.equal(redactFileName('acme-health-rehab-2026.pdf'), '\u2022\u2022\u2022\u2022\u2022\u2022.pdf');
  assert.equal(redactFileName('notes.docx'), '\u2022\u2022\u2022\u2022\u2022\u2022.docx');
  assert.equal(redactFileName('proposal'), '\u2022\u2022\u2022\u2022\u2022\u2022');
});

test('two different client names are indistinguishable once redacted', async () => {
  // The point of the redaction: a shared card must not reveal whose draft it
  // was. If two unrelated names produce different output, the stem survived.
  const { redactFileName } = await load();
  const long = redactFileName('acme-health-rehab-2026.pdf');
  const short = redactFileName('b.pdf');
  const other = redactFileName('riverbend-community-trust.pdf');

  assert.equal(long, short, 'the stem length must not survive');
  assert.equal(long, other, 'the stem content must not survive');
  assert.ok(!long.includes('acme'), 'no fragment of the stem may appear');
  assert.ok(!long.includes('b.pdf'), 'no fragment of the stem may appear');
});

test('redaction handles empty and missing names', async () => {
  const { redactFileName } = await load();
  for (const input of [null, undefined, '', '   ', 0, {}]) {
    assert.equal(redactFileName(input), null, `expected null for ${JSON.stringify(input)}`);
  }
});

test('the card content never carries the raw file name', async () => {
  const { scoreCardContent } = await load();
  const serialized = JSON.stringify(scoreCardContent(REPORT));
  assert.ok(!serialized.includes('acme'), 'the client name must not reach the card');
  assert.ok(!serialized.includes('rehab'), 'the client name must not reach the card');
  assert.equal(scoreCardContent(REPORT).file, '\u2022\u2022\u2022\u2022\u2022\u2022.pdf');
});

test('the share caption never carries the raw file name', async () => {
  const { shareCaption } = await load();
  const caption = shareCaption(REPORT);
  assert.ok(!caption.includes('acme'));
  assert.match(caption, /84\/100/);
  assert.match(caption, /Ready/);
});

/* ── the card says the right thing ────────────────────────────────────────── */

test('the card carries the score, the band, and the criteria', async () => {
  const { scoreCardContent } = await load();
  const c = scoreCardContent(REPORT);
  assert.equal(c.score, 84);
  assert.equal(c.band, 'Ready');
  assert.equal(c.criteria.length, 6);
  assert.equal(c.criteria[0].label, 'Statement of Need');
  assert.equal(c.criteria[0].value, 91);
  assert.match(c.footer, /thegrantsmaster\.com/);
});

test('the card clamps a score that is out of range', async () => {
  const { scoreCardContent } = await load();
  assert.equal(scoreCardContent({ score: 900 }).score, 100);
  assert.equal(scoreCardContent({ score: -40 }).score, 0);
  assert.equal(scoreCardContent({ score: 'nonsense' }).score, 0);
  assert.equal(scoreCardContent({}).score, 0);
});

test('the card flags a capped score', async () => {
  const { scoreCardContent } = await load();
  assert.equal(scoreCardContent({ ...REPORT, evidenceFloorApplied: true }).floor, true);
  assert.equal(scoreCardContent(REPORT).floor, false);
});

test('the card survives a report with no criteria at all', async () => {
  const { scoreCardContent } = await load();
  const c = scoreCardContent({ score: 61, label: 'In Progress' });
  assert.equal(c.criteria.length, 0);
  assert.equal(c.file, null);
  assert.equal(c.words, null);
});

/* ── the LinkedIn link ────────────────────────────────────────────────────── */

test('the LinkedIn share URL is well formed and encoded', async () => {
  const { linkedInShareUrl, SHARE_URL } = await load();
  const url = linkedInShareUrl();
  assert.ok(url.startsWith('https://www.linkedin.com/sharing/share-offsite/?url='));
  assert.ok(url.includes(encodeURIComponent(SHARE_URL)), 'the target must be URL-encoded');
  assert.equal(linkedInShareUrl('https://example.com/a b?c=1'), linkedInShareUrl('https://example.com/a b?c=1'));
  assert.ok(linkedInShareUrl('https://example.com/a b').includes('a%20b'));
});

/* ── privacy: nothing is uploaded ─────────────────────────────────────────── */

test('the card is drawn in the browser and never uploaded', () => {
  // A card is a nice-to-have. Uploading a client's proposal to render one would
  // break the promise the entire funnel rests on.
  assert.doesNotMatch(
    CARD_SRC,
    /fetch\(|XMLHttpRequest|apiUrl|navigator\.sendBeacon/,
    'the card module must never make a network call',
  );
  assert.match(CARD_SRC, /document\.createElement\('canvas'\)/, 'the card is drawn locally');
  assert.match(CARD_SRC, /toBlob/, 'the card becomes a PNG in the browser');
});

/* ── wiring ───────────────────────────────────────────────────────────────── */

test('the funnel offers the share action', () => {
  assert.match(FUNNEL, /import \{ shareScoreCard \}/, 'the page must use the card module');
  assert.match(FUNNEL, /onClick=\{share\}/, 'the share button must be wired');
  assert.match(FUNNEL, /Share your score/, 'the action must be visible to the visitor');
});

test('the share control tells the visitor their file name is hidden', () => {
  assert.match(
    FUNNEL,
    /file name hidden/,
    'a consultant must be told the card redacts the client name before they post it',
  );
});

test('the share state resets when the visitor scores another draft', () => {
  // Otherwise a second draft inherits the first one's "Shared" message.
  const reset = FUNNEL.slice(FUNNEL.indexOf('const reset = useCallback'));
  assert.match(reset, /setShareState\('idle'\)/);
  assert.match(reset, /setShareNote\(''\)/);
});
