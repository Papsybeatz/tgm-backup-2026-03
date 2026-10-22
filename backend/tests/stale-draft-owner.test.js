/**
 * Whose letter is loaded on the right?
 * ----------------------------------------------------------------------------
 * The intake form and the finished draft are independent state, and nothing
 * connected them. So a consultant could fill in Client B's details while Client
 * A's draft sat on the right, under helper text saying "Edit, download or email
 * the draft on the right" — one click from emailing a funder the wrong
 * organisation's proposal.
 *
 * That is the only failure in this product that produces a client-facing
 * embarrassment rather than an error message, so it is worth pinning carefully.
 *
 * The rule has two halves and they matter in opposite directions:
 *
 *   - a REAL mismatch must warn, or the guard does nothing;
 *   - an UNKNOWN owner must stay silent, or the warning cries wolf on correct
 *     drafts until people learn to ignore it — which is the same as having no
 *     guard at all.
 *
 * `draftOwner.ts` is imported directly. Node strips the type annotations; that
 * needs Node 22+ (on by default in 23+). This suite already requires a modern
 * runtime, and CI does not run backend tests.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const REPO = path.join(__dirname, '..', '..');
const HELPER = path.join(REPO, 'src', 'components', 'steve', 'draftOwner.ts');
const helper = import(pathToFileURL(HELPER).href);

const read = (...parts) =>
  fs.readFileSync(path.join(REPO, 'src', 'components', 'steve', ...parts), 'utf8');

test('the same client named twice does not warn', async () => {
  const m = await helper;
  // Whitespace and case are how people actually type a name twice, not a sign
  // that they have switched clients.
  assert.equal(m.draftBelongsToAnotherOrg('U-Smile', 'U-Smile'), false);
  assert.equal(m.draftBelongsToAnotherOrg('Hope Community Center', 'hope community center'), false);
  assert.equal(m.draftBelongsToAnotherOrg('  Hope  Community   Center ', 'Hope Community Center'), false);
});

test('a different client warns', async () => {
  const m = await helper;
  assert.equal(m.draftBelongsToAnotherOrg('U-Smile', 'Blue Gene Orphanage'), true);
  assert.equal(m.draftBelongsToAnotherOrg('Hope Community Center', 'Bright Future Initiative'), true);
});

test('an unknown draft owner never warns', async () => {
  // The important half. A draft restored without its order, or a guest session
  // with no stored order, has no owner — and warning there would fire on a
  // perfectly correct draft. A guard that cries wolf gets ignored.
  const m = await helper;
  for (const unknown of [null, undefined, '', '   ']) {
    assert.equal(
      m.draftBelongsToAnotherOrg('U-Smile', unknown),
      false,
      `draft owner "${String(unknown)}" must not raise a warning`,
    );
  }
});

test('an empty form never warns', async () => {
  const m = await helper;
  for (const empty of [null, undefined, '', '   ']) {
    assert.equal(
      m.draftBelongsToAnotherOrg(empty, 'Blue Gene Orphanage'),
      false,
      'a blank form has nothing to disagree with — the help text is not a mismatch',
    );
  }
});

test('punctuation is treated as significant', async () => {
  const m = await helper;
  // "U-Smile" and "U Smile" could genuinely be two clients. Collapsing
  // punctuation would silence a real mismatch to fix a cosmetic one.
  assert.equal(m.draftBelongsToAnotherOrg('U-Smile', 'U Smile'), true);
});

test('non-string input is tolerated rather than thrown on', async () => {
  const m = await helper;
  assert.equal(m.draftBelongsToAnotherOrg(42, 42), false);
  assert.equal(m.draftBelongsToAnotherOrg({}, 'U-Smile'), false);
  assert.equal(m.draftBelongsToAnotherOrg('U-Smile', []), false);
});

test('the form records which client the draft was written for', () => {
  const hook = read('useSteveConcierge.ts');
  // Captured from the form that actually produced the draft, not from the form
  // as it looks afterwards — the whole failure is that the two diverge.
  assert.match(hook, /const \[draftOrg, setDraftOrg\] = useState<string \| null>\(null\)/);
  assert.match(
    hook,
    /setDraftOrg\(String\(form\.orgName \|\| ''\)\.trim\(\) \|\| null\)/,
    'the owner must come from the submitted form',
  );
  // Restored on rehydrate, which is exactly when the form is blank again.
  assert.match(
    hook,
    /data\.order[\s\S]{0,80}orgName/,
    'the owner must survive a reload via order.orgName',
  );
  // And cleared with the draft, so "Next client" really is a clean slate.
  assert.match(
    hook,
    /setDraftTitle\(null\);\s*setDraftOrg\(null\);\s*setDocHtml\(null\)/,
    'resetting must clear the owner alongside the draft',
  );
  assert.match(hook, /^ {4}draftOrg,$/m, 'the owner must be returned to consumers');
});

test('the form warns when the draft belongs to someone else', () => {
  const form = read('SteveIntakeForm.tsx');
  assert.match(form, /from '\.\/draftOwner'/, 'the form must use the shared rule');
  assert.match(form, /const staleDraft = draftBelongsToAnotherOrg\(form\.orgName, draftOrg\)/);
  // The warning has to name both sides, or the reader cannot tell which is
  // which. And it must offer the fix ("Next client") rather than only alarm.
  assert.match(form, /role="alert"/);
  // Gated on the verdict, not merely present. Without this the warning could be
  // dead-coded behind a false condition and the copy-only assertions would still
  // pass — verified by mutation: `{false && (` slipped through before this line.
  assert.match(form, /\{staleDraft && \(/, 'the warning must render behind the guard');
  assert.match(form, /The draft on the right was written for \{draftOrg\}/);
  assert.match(form, /These details are for \{form\.orgName\}/);
  assert.match(form, /Next client/);
});

test('the draft pane names the organisation it was written for', () => {
  const ticket = read('OrderTicket.tsx');
  assert.match(ticket, /draftOrg\?: string \| null/);
  assert.match(ticket, /Prepared for \{draftOrg\}/);
});

test('the counter passes the owner to both panes', () => {
  const counter = read('SteveCounter.tsx');
  assert.match(counter, /draftOrg: c\.draftOrg/, 'the ticket needs it');
  assert.match(counter, /draftOrg=\{c\.draftOrg\}/, 'the form needs it');
});
