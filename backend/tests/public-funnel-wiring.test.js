/**
 * The public Checkmate funnel, end to end.
 * ----------------------------------------------------------------------------
 * The scoring engine was correct and verified while the funnel around it was
 * still unreachable: the landing page promised a free no-signup check and sent
 * the click to /signup, and the unlock click dropped the visitor's result on the
 * way to signup. Neither is a scoring bug, so no scoring test could catch it.
 *
 * These assertions cover the seams — the places where a working page is not yet
 * a working funnel.
 *
 * Run: cd backend && npm run test:funnel
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const LANDING = read('src', 'components', 'LandingPage.jsx');
const FUNNEL = read('src', 'components', 'PublicScorePage.jsx');
const SIGNUP = read('src', 'components', 'SignupPage.jsx');
const HANDOFF = read('src', 'lib', 'publicScoreHandoff.js');

/**
 * The navigate() target that precedes a button label. The label is the stable
 * anchor; the handler sits just above it.
 */
function ctaTarget(src, label) {
  const at = src.indexOf(label);
  assert.ok(at > -1, `CTA "${label}" not found in the landing page`);
  const before = src.slice(Math.max(0, at - 400), at);
  const hits = [...before.matchAll(/navigate\('([^']+)'\)/g)];
  assert.ok(hits.length, `no navigate() call found for CTA "${label}"`);
  return hits[hits.length - 1][1];
}

/* ── the front door ───────────────────────────────────────────────────────── */

test('the Checkmate card opens the free checkup, not signup', () => {
  assert.equal(
    ctaTarget(LANDING, 'Try Checkmate'),
    '/checkup',
    'the card promises a score — it must open the page that produces one',
  );
});

test('the "run your own draft free" CTA opens the checkup', () => {
  // This button sits inside the "Honest by default" section and promises a free
  // run with no credit card. Sending it to a signup form was the exact broken
  // promise the wedge was built to fix.
  assert.equal(ctaTarget(LANDING, 'Run your own draft free'), '/checkup');
});

test('the landing copy does not promise the criterion the free tool omits', () => {
  // The anonymous rubric has no funder to align to, so alignment is excluded.
  // Copy advertising it would promise something the upload cannot deliver.
  const card = LANDING.slice(
    LANDING.indexOf('Checkmate result'),
    LANDING.indexOf('Try Checkmate'),
  );
  assert.doesNotMatch(
    card,
    /\balignment\b/i,
    'the free checkup does not score alignment — the copy must not claim it does',
  );
});

/* ── the back door ────────────────────────────────────────────────────────── */

test('the unlock click hands the result over before leaving', () => {
  assert.match(
    FUNNEL,
    /onClick=\{\(\) => savePublicScoreHandoff\(report\)\}/,
    'without this the visitor arrives at signup with their score gone',
  );
  assert.match(FUNNEL, /import \{ savePublicScoreHandoff \}/);
});

test('signup reads the carried result and shows it', () => {
  assert.match(SIGNUP, /readPublicScoreHandoff/, 'signup must read the handoff');
  assert.match(SIGNUP, /YOUR CHECKMATE RESULT/, 'the carried score must be visible');
  assert.match(
    SIGNUP,
    /carriedScore\.score/,
    'the actual score has to be rendered, not just acknowledged',
  );
});

test('the handoff is only read for the public-score entry point', () => {
  // An ordinary signup must not render a stranger's stale score from a session.
  assert.match(SIGNUP, /from'\) === 'public-score'/);
});

test('the carried result explains the evidence gap', () => {
  assert.match(
    SIGNUP,
    /carriedScore\.evidenceFloorApplied/,
    'a weak-evidence score must explain itself at signup too, not just on the funnel page',
  );
});

test('no funnel copy claims the score was capped', () => {
  // The flag reports that evidence is below the floor — it is a no-op on a draft
  // already scoring below the cap, so "your score is capped" is false for most
  // drafts that trip it. A 46 on a 186-word draft is low on its own merits.
  for (const [name, src] of [
    ['SignupPage', SIGNUP],
    ['PublicScorePage', FUNNEL],
  ]) {
    assert.doesNotMatch(src, /score is capped/i, `${name} must not claim the score was capped`);
  }
});

/* ── privacy: the document never rides along ──────────────────────────────── */

test('the handoff carries derived output only, never the document', () => {
  // A whitelist, not a spread. Spreading the report would copy whatever the
  // server sends — and if that ever includes document text, it would be written
  // to browser storage. A consultant trusting us with a client's proposal is
  // the whole reason this page exists.
  assert.doesNotMatch(
    HANDOFF,
    /\.\.\.report/,
    'the payload must be an explicit whitelist, never a spread of the report',
  );
  assert.match(HANDOFF, /sessionStorage/, 'session-scoped: it must die with the tab');
  assert.match(HANDOFF, /MAX_AGE_MS/, 'a stale handoff must not appear on a later signup');
});

module.exports = { ctaTarget };
