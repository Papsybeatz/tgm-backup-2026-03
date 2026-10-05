/**
 * Public Checkmate score — the anonymous funnel wedge.
 * ----------------------------------------------------------------------------
 * Two things have to hold or the wedge is dishonest:
 *
 *   1. The score must be real. A strong uploaded draft has to land in the
 *      "strong and funder-ready" band, not be marked down for ticket fields an
 *      anonymous upload was never asked to supply.
 *   2. The paywall must be server-side. Free keeps the diagnosis; the fixes
 *      come back locked. A browser-side lock is not a paywall.
 *
 * Run: cd backend && npm run test:public-score
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  CRITERIA,
  scoreDraft,
  heuristicScore,
  heuristicScoreOrderless,
  detectStyle,
} = require('../agents/steve/scoring');
const { applyScoreGate, FREE_SCORE_LIMIT } = require('../utils/scoreGate');

const ROOT = path.join(__dirname, '..', '..');
const SERVER_SRC = fs.readFileSync(path.join(ROOT, 'backend', 'server.js'), 'utf8');
const ROUTE_SRC = fs.readFileSync(
  path.join(ROOT, 'backend', 'routes', 'publicScore.js'),
  'utf8',
);
const RATE_SRC = fs.readFileSync(
  path.join(ROOT, 'backend', 'middleware', 'rateLimit.js'),
  'utf8',
);

/* ── fixtures ─────────────────────────────────────────────────────────────── */

const STRONG_PROPOSAL = `
EXECUTIVE SUMMARY

Riverbend Community Trust requests $75,000 from the Calloway Foundation to expand the
After-School Learning Lab, which served 240 students in 2024.

STATEMENT OF NEED

In the Riverbend school district, 38% of third graders read below grade level, and the
gap is widest for the 240 students who qualify for free lunch. Because the nearest
public library closes at 5pm, families working second shift have nowhere for their
children to go. Our 2024 pilot reduced the gap by 12 percentage points.

ORGANIZATION BACKGROUND

Riverbend Community Trust has operated since 1998 and partners with the district and
the county health department. Our track record includes three consecutive years of
clean audits and a documented pilot report.

PROJECT DESCRIPTION

The Learning Lab runs four afternoons a week and pairs each student with a trained
reading partner.

GOALS AND OBJECTIVES

Goal: raise reading proficiency. Objective: 90% of participants will gain one reading
level by June.

OUTCOMES AND EVALUATION

We will measure outcomes with the district's standardized assessment at baseline and
at 12 weeks. Target: 90% completion, with 75% gaining a level.

BUDGET NARRATIVE

The $75,000 request covers personnel ($52,000), materials ($13,000) and administration
($10,000). This budget breakdown follows the foundation's published line item guidance.

SUSTAINABILITY

We will sustain the program with a multi-year commitment from the county.

TIMELINE

Implementation begins in September and runs through June.

CONCLUSION

We respectfully request your support for the 240 students on our waitlist.

Sincerely,
Dana Whitfield
Riverbend Community Trust
412 Maple Avenue, Suite 3
dana@riverbendtrust.org
(555) 213-8890
Deadline: March 15, 2026
`;

const SHORT_LETTER = `
Dear Ms. Alvarez,

I am writing on behalf of Harbor Light Outreach to respectfully request $15,000 from the
Bell Foundation. We serve families in the east side neighborhood, and our food pantry
has seen rising demand this year. The funds would cover rent, refrigeration, and part
of our coordinator's time. We would be glad to report back on how the money was used.

Thank you for your consideration.

Sincerely,
Marcus Bell
Harbor Light Outreach
`;

const WEAK_DRAFT = `
We are a nonprofit that helps the community. We want funding to continue our important
work with people in need. Our programs are good and help many people. Please consider
our request for support so we can keep doing this work.
`;

// Structured enough to score respectably, but missing the things the rubric
// flags: no budget figure, no quantified outcomes, no signatory block. This is
// the shape most real drafts arrive in, and it is what the gate has to lock.
const GAPPY_PROPOSAL = `
EXECUTIVE SUMMARY

Northside Arts Collective is applying to the Harmon Trust to grow our studio program.

STATEMENT OF NEED

Local young people have few places to make art after school. Many families cannot
afford lessons. This gap has widened over the past several years.

ORGANIZATION BACKGROUND

Northside Arts Collective has run community programs for over a decade and partners
with two neighborhood schools.

PROJECT DESCRIPTION

The studio program will run weekly sessions led by teaching artists.

GOALS AND OBJECTIVES

Our goal is to give more young people access to sustained arts instruction.

OUTCOMES AND EVALUATION

We will evaluate the program through attendance records and participant feedback.

CONCLUSION

We hope you will support this work.
`;

/* ── the rubric must be real, not punitive ────────────────────────────────── */

test('a strong uploaded proposal lands in the funder-ready band', () => {
  const report = heuristicScoreOrderless(STRONG_PROPOSAL, 'proposal');
  assert.ok(
    report.score >= 70,
    `a complete, specific proposal must not be marked down — got ${report.score}`,
  );
});

test('the document-only rubric separates a strong draft from a weak one', () => {
  const strong = heuristicScoreOrderless(STRONG_PROPOSAL, 'proposal').score;
  const weak = heuristicScoreOrderless(WEAK_DRAFT, 'proposal').score;
  assert.ok(strong > weak + 15, `expected a wide gap, got strong=${strong} weak=${weak}`);
});

test('the order-less rubric never reads the order ticket', () => {
  // If this ever depends on order fields, the public path silently regresses to
  // punishing drafts for information the visitor was never asked for.
  const withEmptyOrder = heuristicScoreOrderless(STRONG_PROPOSAL, 'proposal').score;
  const ticketScore = heuristicScore({}, STRONG_PROPOSAL, 'proposal').score;
  assert.notEqual(
    withEmptyOrder,
    ticketScore,
    'orderless and ticket rubrics must not be the same computation',
  );
  assert.ok(
    withEmptyOrder > ticketScore,
    'an empty ticket must not outscore the document-only rubric on the same draft',
  );
});

test('every criterion in the public report matches the shared rubric', () => {
  const report = heuristicScoreOrderless(STRONG_PROPOSAL, 'proposal');
  const keys = CRITERIA.map((c) => c.key).sort();
  assert.deepEqual(Object.keys(report.criteria).sort(), keys);
  for (const key of keys) {
    const value = report.criteria[key];
    assert.ok(Number.isFinite(value) && value >= 1 && value <= 100, `${key} out of range: ${value}`);
  }
});

/* ── style inference ──────────────────────────────────────────────────────── */

test('a structured proposal is detected as a proposal', () => {
  assert.equal(detectStyle(STRONG_PROPOSAL), 'proposal');
});

test('a short, unstructured letter is detected as a letter', () => {
  assert.equal(detectStyle(SHORT_LETTER), 'letter');
});

test('a letter is not judged by the proposal shape', () => {
  // The ticket rubric's own comment records this exact failure: judging letters
  // by proposal shape drove them into the 50s.
  const asLetter = heuristicScoreOrderless(SHORT_LETTER, 'letter').score;
  const asProposal = heuristicScoreOrderless(SHORT_LETTER, 'proposal').score;
  assert.ok(asLetter >= asProposal, `letter scored worse as a letter: ${asLetter} < ${asProposal}`);
});

/* ── the paywall is server-side ───────────────────────────────────────────── */

test('a draft with real gaps produces fixes to lock', () => {
  // Guards the gate test below: if the fixture ever stops producing fixes, the
  // gate test would pass vacuously.
  const report = heuristicScoreOrderless(GAPPY_PROPOSAL, 'proposal');
  assert.ok(
    report.fixes.length > 0,
    'the gappy fixture must produce at least one recommended fix',
  );
  assert.ok(report.missingComponents.length > 0, 'and at least one named gap');
});

test('an anonymous report keeps the diagnosis and loses the fixes', () => {
  const report = heuristicScoreOrderless(GAPPY_PROPOSAL, 'proposal');
  assert.ok(report.fixes.length > 0, 'the fixture must produce fixes for this test to mean anything');

  const gated = applyScoreGate('free', report);
  assert.equal(gated.fixesLocked, true, 'free must not receive the fixes');
  assert.deepEqual(gated.fixes, [], 'free must not receive the fixes');
  assert.ok(gated.score > 0, 'free must still receive a real score');
  assert.ok(Object.keys(gated.criteria).length > 0, 'free must still receive the breakdown');
  assert.ok(
    gated.missingComponents.length > 0,
    'free must still be told WHAT is missing — only the how-to-fix is paid',
  );
});

test('the public route applies the same gate as the signed-in route', () => {
  assert.match(ROUTE_SRC, /applyScoreGate\('free'/, 'the public route must apply the Free gate');
});

/* ── privacy: the uploaded document is never stored ───────────────────────── */

test('the public upload never touches the served upload directory', () => {
  assert.match(ROUTE_SRC, /multer\.memoryStorage\(\)/, 'uploads must be held in memory');
  assert.doesNotMatch(
    ROUTE_SRC,
    /userUploadDir|multer\.diskStorage/,
    'the public route must not write into the per-user upload directory',
  );
});

test('the temp copy is deleted on every exit path', () => {
  assert.match(ROUTE_SRC, /fs\.unlinkSync\(/, 'the temp file must be unlinked');
  assert.match(ROUTE_SRC, /finally\s*\{/, 'cleanup must run even when extraction throws');
});

test('the response states that nothing was stored', () => {
  assert.match(ROUTE_SRC, /stored:\s*false/);
});

/* ── wiring: mounted, limited, and reachable ──────────────────────────────── */

test('the public score route is actually mounted', () => {
  assert.match(
    SERVER_SRC,
    /app\.use\('\/api\/public'/,
    'an unmounted route file is the orphan trap — the route must be mounted',
  );
  assert.match(SERVER_SRC, /require\('\.\/routes\/publicScore'\)/);
});

test('the public score route is mounted behind both limiters', () => {
  const mount = SERVER_SRC.match(/app\.use\('\/api\/public'[^\n]*/);
  assert.ok(mount, 'mount line not found');
  assert.match(mount[0], /publicScoreLimiter/, 'a hot-loop limiter is required');
  assert.match(mount[0], /publicScoreDailyLimiter/, 'a daily cap is required');
});

test('the anonymous daily cap does not exceed the Free tier score cap', () => {
  const block = RATE_SRC.match(/publicScoreDailyLimiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/);
  assert.ok(block, 'daily limiter definition not found');
  const max = Number(block[0].match(/max:\s*(\d+)/)?.[1]);
  assert.equal(
    max,
    FREE_SCORE_LIMIT,
    'an anonymous visitor must not get more scores than a signed-in free user',
  );
});

test('a rejected upload does not burn one of the visitor scores', () => {
  const block = RATE_SRC.match(/publicScoreDailyLimiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/);
  assert.match(block[0], /skipFailedRequests:\s*true/);
});

/* ── end to end through scoreDraft ────────────────────────────────────────── */

test('scoreDraft in orderless mode returns a usable, labelled report', async () => {
  const report = await scoreDraft({}, STRONG_PROPOSAL, { orderless: true });
  assert.ok(report.score >= 70, `expected a strong score, got ${report.score}`);
  assert.equal(typeof report.label, 'string');
  assert.equal(report.style, 'proposal');
  assert.equal(report.criteriaDefs.length, CRITERIA.length);
  assert.ok(Array.isArray(report.fixes));
});

test('scoreDraft orderless infers style instead of defaulting to letter', async () => {
  const proposal = await scoreDraft({}, STRONG_PROPOSAL, { orderless: true });
  const letter = await scoreDraft({}, SHORT_LETTER, { orderless: true });
  assert.equal(proposal.style, 'proposal');
  assert.equal(letter.style, 'letter');
});

test('the signed-in path is unchanged when orderless is not requested', async () => {
  // Regression guard: the editor and Steve must keep the ticket rubric.
  const report = await scoreDraft({}, STRONG_PROPOSAL, { style: 'proposal' });
  assert.equal(report.orderless, undefined, 'the ticket path must not be marked orderless');
  assert.ok(report.score > 0);
});
