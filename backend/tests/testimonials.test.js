const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const SRC = path.join(REPO, 'src');
const BACKEND = path.join(REPO, 'backend');

function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

function walk(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '_orphaned') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

function sources() {
  return walk(SRC, ['.jsx', '.tsx', '.js', '.ts']).map((f) => ({
    f,
    text: fs.readFileSync(f, 'utf8'),
  }));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * The real-quote pipeline.
 *
 * The trust spine's whole position is that every claim on the page is either
 * checkable or labelled as ours. Testimonials are the one place where that is
 * easy to break quietly: a quote attributed to an anonymous user cannot be
 * checked by a reader at all, which makes a fabricated one safer to *write* and
 * more damaging to *find*. These tests make the fabrication path impossible to
 * take without deleting a test first.
 * ═══════════════════════════════════════════════════════════════════════════ */

test('the public endpoint returns only approved testimonials', () => {
  const route = read('backend/routes/testimonials.js');
  assert.match(route, /where:\s*\{\s*status:\s*'approved'\s*\}/);
});

test('the public endpoint never returns the submitter email', () => {
  // Anonymity has to hold in the payload, not just in the render. If the email
  // ships to the browser it is public, whatever the UI chooses to display.
  const route = read('backend/routes/testimonials.js');
  const get = route.slice(route.indexOf("router.get('/'"), route.indexOf("router.post('/'"));
  const select = get.slice(get.indexOf('select:'), get.indexOf('});', get.indexOf('select:')));
  assert.match(select, /quote:\s*true/);
  assert.doesNotMatch(select, /email:\s*true/, 'the public GET selects email');
});

test('a submission can never publish itself', () => {
  // The client controls the body. If status came from the body, anyone could
  // publish their own quote straight onto the trust page.
  const route = read('backend/routes/testimonials.js');
  const post = route.slice(route.indexOf("router.post('/'"));
  assert.match(post, /status:\s*'pending'/);
  assert.doesNotMatch(post, /status:\s*body\./, 'status is taken from the request body');
  assert.doesNotMatch(post, /status:\s*clean\(/, 'status is taken from the request body');
});

test('a submission shorter than the minimum is rejected', () => {
  const route = read('backend/routes/testimonials.js');
  assert.match(route, /const MIN_QUOTE = \d+/);
  assert.match(route, /quote\.length < MIN_QUOTE/);
  assert.match(route, /res\.status\(400\)/);
});

test('publishing requires an admin', () => {
  // Approval is the only path to 'approved', so it is the gate that keeps a
  // fabricated or off-topic submission off the page.
  const admin = read('backend/routes/admin.js');
  assert.match(admin, /router\.get\('\/testimonials',\s*requireAdmin/);
  assert.match(admin, /router\.post\('\/testimonials\/:id\/approve',\s*requireAdmin/);
  assert.match(admin, /router\.post\('\/testimonials\/:id\/reject',\s*requireAdmin/);
});

test('the wall renders nothing while loading and nothing when empty', () => {
  const wall = read('src/components/TestimonialWall.jsx');
  assert.match(wall, /if \(state\.status === 'loading'\) return null/);
  assert.match(wall, /state\.items\.length === 0/);
  assert.match(wall, /No published quotes yet/);
});

test('the wall has no fallback or sample quote content', () => {
  // The empty state must describe the absence of proof, never simulate it.
  // Line-aware: the file's own comments explain that there is no placeholder,
  // and matching those would be a false positive on the intent, not the code.
  const wall = read('src/components/TestimonialWall.jsx');
  for (const line of wall.split('\n')) {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    assert.doesNotMatch(
      line,
      /sample|placeholder|example quote|demo testimonial/i,
      'a placeholder quote string is rendered',
    );
  }
  assert.match(wall, /\{t\.quote\}/, 'the only quote source must be the API row');
});

test('no source file hardcodes a testimonial array', () => {
  // If quotes exist in a data array in the bundle, we wrote them. Every quote
  // must arrive from /api/testimonials at runtime.
  //
  // Two shapes, both requiring a *definition* rather than a read: a declared
  // constant, or an object field. A bare `body.testimonials : []` ternary is a
  // read, not a hardcoded list, so the lookbehind excludes property access.
  const hardcoded = [
    /(?:const|let|var)\s+[\w$]*[Tt]estimonials?[\w$]*\s*=\s*\[/,
    /(?<![.\w$])testimonials\s*:\s*\[/i,
  ];
  for (const { f, text } of sources()) {
    for (const re of hardcoded) {
      assert.doesNotMatch(
        text,
        re,
        `${path.relative(REPO, f)} contains a hardcoded testimonial array`,
      );
    }
  }
});

test('the trust page shows quotes only through the wall component', () => {
  const trust = read('src/components/TrustPage.jsx');
  assert.match(trust, /<TestimonialWall\s*\/>/);
  // No inline quote markup in the page itself — every quote comes from the API.
  assert.doesNotMatch(trust, /<blockquote/, 'TrustPage renders quote markup directly');
});

test('the story form asserts on the response body, not on res.ok', () => {
  // A 200 that is not a real success must never render as "submitted" — that was
  // the exact bug the waitlist form shipped with.
  const form = read('src/components/ShareStoryForm.jsx');
  assert.match(form, /body\.success !== true/);
});

test('the story form promises anonymity, not publication', () => {
  const form = read('src/components/ShareStoryForm.jsx');
  assert.match(form, /never published/i);
  assert.match(form, /nothing goes live until we have read it/i);
});

test('the capability block is labelled as our own words, not a customer\'s', () => {
  // The honesty move that makes the section work: it says who is speaking. A
  // capability claim is true whoever says it, so there is nothing to gain by
  // dressing it as a testimonial and everything to lose.
  const trust = read('src/components/TrustPage.jsx');
  assert.match(trust, /What TGM Does — In Our Words/);
  assert.match(trust, /stated by us, and checkable inside the product/i);
});

test('the capability block does not use testimonial framing', () => {
  const trust = read('src/components/TrustPage.jsx');
  const caps = trust.slice(trust.indexOf('const CAPABILITIES'), trust.indexOf('const SECURITY'));
  assert.doesNotMatch(caps, /said one|according to a|one user told us|our customers say/i);
});

/* ─────────────────────────── plumbing is real ─────────────────────────── */

test('the model, migration and parachute all exist', () => {
  const schema = read('backend/prisma/schema.prisma');
  assert.match(schema, /model Testimonial \{/);
  assert.match(schema, /@@index\(\[status\]\)/);

  const mig = read('backend/prisma/migrations/20261003000000_testimonials/migration.sql');
  assert.match(mig, /CREATE TABLE "Testimonial"/);
  assert.match(mig, /"status" TEXT NOT NULL DEFAULT 'pending'/);

  // The parachute matters more here than usual: quotes accumulate over time, so
  // a failed migrate deploy must not stop us collecting them.
  const es = read('backend/utils/ensureSchema.js');
  assert.match(es, /CREATE TABLE IF NOT EXISTS "Testimonial"/);
});

test('the public route is mounted and is not behind auth', () => {
  // The wall is on a public page; requiring auth would silently render the
  // empty state for every visitor and we would never know.
  const server = read('backend/server.js');
  assert.match(server, /app\.use\('\/api\/testimonials',\s*require\('\.\/routes\/testimonials'\)\)/);

  const route = read('backend/routes/testimonials.js');
  assert.doesNotMatch(route, /requireAuth/, 'the public testimonial routes require auth');
});
