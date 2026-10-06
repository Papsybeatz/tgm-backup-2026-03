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
  ORDERLESS_CRITERIA,
  EVIDENCE_FLOOR,
  EVIDENCE_FLOOR_CAP,
  scoreDraft,
  heuristicScore,
  heuristicScoreOrderless,
  finalizeOrderless,
  isSubstantial,
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

/*
 * THE NEGATIVE CONTROL FIXTURE.
 *
 * A proposal with every section heading, in the right order, with a complete
 * letterhead — and nothing verifiable under any of it. No numbers, no data, no
 * budget figure, no named partner. Before the letterhead/body split and the
 * substance-gated completeness, this scored 80/100: "Ready".
 *
 * If this fixture ever lands in the Ready band again, the rubric has regressed.
 * Kept deliberately split from its letterhead so the two can be compared.
 */
const HOLLOW_BODY = `
EXECUTIVE SUMMARY

Our organization is requesting funds from the foundation to support our important
program work in the community.

STATEMENT OF NEED

There is a significant need in our community for the services we provide. Many people
face challenges, and our program addresses these challenges in meaningful ways.

ORGANIZATION BACKGROUND

Our organization has a strong history of serving the community and a dedicated team.

PROJECT DESCRIPTION

The project will deliver services to community members through our established model.

GOALS AND OBJECTIVES

Our goal is to improve outcomes for the people we serve through this project.

OUTCOMES AND EVALUATION

We will evaluate the project to ensure it is achieving its intended outcomes.

BUDGET NARRATIVE

The budget covers the costs associated with delivering this program.

SUSTAINABILITY

The program will be sustained through ongoing support.

TIMELINE

The project will run over the coming year.

CONCLUSION

We appreciate your consideration of this request.
`;

const HOLLOW_LETTERHEAD = `
Sincerely,
Jordan Ellis
Community Partners Inc
1250 Harbor Boulevard, Suite 200
jordan@communitypartners.org
(555) 448-1120
Deadline: April 1, 2026
`;

const HOLLOW_PROPOSAL = HOLLOW_BODY + HOLLOW_LETTERHEAD;

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

/* ── negative controls: formatting must not buy a pass ──────────────────── */

test('NEGATIVE CONTROL: a hollow but well-formatted proposal is not funder-ready', () => {
  // The regression this suite exists for. Every heading present, letterhead
  // complete, nothing verifiable anywhere. This used to score 80 ("Ready").
  const report = heuristicScoreOrderless(HOLLOW_PROPOSAL, 'proposal');
  assert.ok(
    report.score < 70,
    `a hollow proposal must not reach the Ready band — got ${report.score}`,
  );
});

test('NEGATIVE CONTROL: a letterhead must not move the content criteria', () => {
  // Adding name/address/phone/email/deadline to an unchanged body used to move
  // this draft 63 -> 80: the phone satisfied hasNumbers and the street address
  // counted as evidence.
  const withLetter = heuristicScoreOrderless(HOLLOW_BODY + HOLLOW_LETTERHEAD, 'proposal');
  const withoutLetter = heuristicScoreOrderless(HOLLOW_BODY, 'proposal');
  assert.equal(withLetter.criteria.need, withoutLetter.criteria.need, 'need must not move');
  assert.equal(
    withLetter.criteria.evidence,
    withoutLetter.criteria.evidence,
    'evidence must not move',
  );
  assert.ok(
    withLetter.criteria.compliance > withoutLetter.criteria.compliance,
    'compliance is the one criterion the letterhead is supposed to move',
  );
});

test('NEGATIVE CONTROL: a heading with nothing under it is not a section', () => {
  const report = heuristicScoreOrderless(HOLLOW_PROPOSAL, 'proposal');
  assert.ok(
    report.missingComponents.some((m) => /heading with nothing under it/i.test(m)),
    'empty sections must be reported',
  );
  assert.ok(
    report.criteria.completeness < 50,
    `completeness must not be bought by headings alone — got ${report.criteria.completeness}`,
  );
});

test('NEGATIVE CONTROL: a concise but concrete section is not called empty', () => {
  // Length is not the test — specificity is. An earlier word gate flagged both
  // of these as "a heading with nothing under it", which is its own kind of
  // credibility failure: telling a writer their most concrete line is empty.
  assert.equal(
    isSubstantial({
      heading: 'BUDGET NARRATIVE',
      body: ' The $75,000 request covers personnel ($52,000), materials ($13,000) and administration ($10,000).',
    }),
    true,
    'a section carrying four dollar figures is substantive however brief',
  );
  assert.equal(
    isSubstantial({
      heading: 'TIMELINE',
      body: ' Implementation begins in September and runs through June.',
    }),
    true,
    'a timeline naming two months is substantive',
  );
  assert.equal(
    isSubstantial({
      heading: 'SUSTAINABILITY',
      body: ' The program will be sustained through ongoing support.',
    }),
    false,
    'generic filler is not substantive',
  );
  assert.equal(
    isSubstantial({ heading: 'TIMELINE', body: ' 2024' }),
    false,
    'a bare fragment is not a section',
  );
});

/* ── the hard evidence floor ─────────────────────────────────────────────── */

test('the evidence floor caps a well-formed but evidence-free document', () => {
  // Synthetic: everything else is excellent, evidence is not. Without the floor
  // this averages to ~86; with it, the document cannot claim to be ready.
  const criteria = {
    need: 95,
    completeness: 95,
    evidence: EVIDENCE_FLOOR - 10,
    outcomes: 95,
    budget: 95,
    compliance: 100,
  };
  const body = 'A body with nothing verifiable in it.';
  const result = finalizeOrderless(criteria, body, body, 'proposal');
  assert.equal(result.floorApplied, true, 'the floor must engage below the threshold');
  assert.ok(
    result.overall <= EVIDENCE_FLOOR_CAP,
    `overall must be capped at ${EVIDENCE_FLOOR_CAP}, got ${result.overall}`,
  );
});

test('the evidence floor does not touch a document that has evidence', () => {
  const criteria = {
    need: 90,
    completeness: 90,
    evidence: EVIDENCE_FLOOR + 20,
    outcomes: 90,
    budget: 90,
    compliance: 90,
  };
  const body = 'We served 240 students in 2024 and cut the gap by 12 percentage points.';
  const result = finalizeOrderless(criteria, body, body, 'proposal');
  assert.equal(result.floorApplied, false);
  assert.ok(
    result.overall > EVIDENCE_FLOOR_CAP,
    'a genuinely evidenced draft must clear the cap',
  );
});

test('the public report says whether the floor was applied', () => {
  const report = heuristicScoreOrderless(STRONG_PROPOSAL, 'proposal');
  assert.equal(typeof report.evidenceFloorApplied, 'boolean');
  assert.equal(report.evidenceFloorApplied, false, 'the strong fixture has evidence');
});

test('the free gate does not strip the evidence-floor flag', () => {
  // The flag is only useful if it survives the last step. applyScoreGate locks
  // the fixes; it must not quietly drop the reason the score was capped.
  const report = heuristicScoreOrderless(HOLLOW_PROPOSAL, 'proposal');
  assert.equal(report.evidenceFloorApplied, true, 'the hollow fixture must trip the floor');

  const gated = applyScoreGate('free', report);
  assert.equal(
    gated.evidenceFloorApplied,
    true,
    'the gate must preserve the flag — a dropped field is a silent cap',
  );
  assert.equal(gated.fixesLocked, true, 'the free tier still withholds the fixes');
});

test('the public response forwards the evidence-floor flag to the client', () => {
  // The floor fired correctly in scoring for weeks while the route never sent
  // the flag, so a capped 44 reached the page with no explanation. Asserting on
  // the report alone missed it: the response payload is the actual contract.
  assert.match(
    ROUTE_SRC,
    /evidenceFloorApplied:\s*Boolean\(gated\.evidenceFloorApplied\)/,
    'the route must forward the floor flag, not swallow it',
  );
});

test('the public report carries exactly the order-less criteria', () => {
  const report = heuristicScoreOrderless(STRONG_PROPOSAL, 'proposal');
  const keys = ORDERLESS_CRITERIA.map((c) => c.key).sort();
  assert.deepEqual(Object.keys(report.criteria).sort(), keys);
  assert.ok(
    !('alignment' in report.criteria),
    'alignment must be absent — an anonymous upload has no funder to align to',
  );
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
  assert.equal(report.criteriaDefs.length, ORDERLESS_CRITERIA.length);
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
