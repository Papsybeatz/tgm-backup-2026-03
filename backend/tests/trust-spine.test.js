/**
 * Trust spine.
 *
 * heycatch (the marketing agent) audited TGM's credibility signals and found a
 * set of unbacked claims: invented metrics, placeholder testimonials, an
 * "Award-Winning Platform" badge with no awards, and a legal-entity name that
 * disagreed between the founder section and the footer.
 *
 * Those were corrected. These tests exist so they cannot quietly come back —
 * each one encodes a specific correction that was already made once.
 *
 * They assert on source, not on the rendered page, because a claim that is in
 * the source is a claim that can ship again.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', '..', 'src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '_orphaned') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC);
const readAll = () => FILES.map((f) => ({ f, text: fs.readFileSync(f, 'utf8') }));

/* ───────────────────────── legal entity ───────────────────────── */

test('every copyright line names the registered entity, not the product', () => {
  // The /funder-api footer said "The Grants Master. All rights reserved." while
  // every other page named Gee Oh Dee (Tech) LLC. A product name is not a legal
  // entity, and the mismatch is exactly what a due-diligence reader notices.
  const offenders = [];
  for (const { f, text } of readAll()) {
    for (const line of text.split('\n')) {
      if (!/All rights reserved/.test(line)) continue;
      if (!/Gee Oh Dee \(Tech\) LLC/.test(line)) {
        offenders.push(`${path.relative(SRC, f)}: ${line.trim().slice(0, 90)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `copyright lines missing the LLC:\n${offenders.join('\n')}`);
});

test('the product/company distinction is stated explicitly', () => {
  const trust = fs.readFileSync(path.join(SRC, 'components', 'TrustPage.jsx'), 'utf8');
  assert.match(trust, /Gee Oh Dee \(Tech\) LLC/, 'the trust page must name the entity');
});

/* ───────────────────────── unbacked claims ───────────────────────── */

test('the funder API headline does not claim present-tense funder reliance', () => {
  // It read "The infrastructure funders rely on." while the same page advertised
  // "Pilot program - 3 slots open" — no funder can rely on it yet.
  const api = fs.readFileSync(path.join(SRC, 'components', 'FunderApiLandingPage.jsx'), 'utf8');
  assert.doesNotMatch(api, /The infrastructure funders rely on\./);
  assert.match(
    api,
    /Built to be the infrastructure funders rely on\./,
    'the headline should state design intent, which is true today',
  );
});

test('network lock-in is not advertised as a benefit', () => {
  // "That's network lock-in." is investor-deck framing on a customer-facing
  // page: it warns the buyer rather than giving them a reason to buy.
  for (const { f, text } of readAll()) {
    assert.doesNotMatch(text, /network lock-in/i, `${path.relative(SRC, f)} still advertises lock-in`);
  }
});

test("heycatch's invented metrics have not returned", () => {
  // Every one of these was a fabricated number with nothing behind it.
  const banned = [
    [/180k|180,000/, '$180k won in the first 90 days'],
    [/\b41%/, '41% win rate'],
    [/\b98%/, '98% scoring accuracy'],
    [/\b500\+/, '500+ organizations'],
    [/2\.4M/, '$2.4M+ in grants drafted'],
  ];
  for (const { f, text } of readAll()) {
    for (const [re, label] of banned) {
      assert.doesNotMatch(text, re, `${path.relative(SRC, f)} reintroduces: ${label}`);
    }
  }
});

test('no award claims without awards', () => {
  for (const { f, text } of readAll()) {
    assert.doesNotMatch(
      text,
      /Award-[Ww]inning\s+(Platform|Grant)/,
      `${path.relative(SRC, f)} claims an award`,
    );
  }
});

test('no placeholder testimonial copy', () => {
  // These shipped to production: "Testimonial pending", "Photo + LinkedIn
  // pending", "Replace with a verified customer quote".
  const banned = [/Testimonial pending/i, /Photo \+ LinkedIn pending/i, /Replace with a verified customer quote/i];
  for (const { f, text } of readAll()) {
    for (const re of banned) {
      assert.doesNotMatch(text, re, `${path.relative(SRC, f)} still has placeholder testimonial copy`);
    }
  }
});

/* ───────────────────────── the honest replacement ───────────────────────── */

test('the homepage says plainly that proof is still being earned', () => {
  // The correction was not just to delete the fake proof but to say why. This
  // pins the replacement so the section is not quietly removed later.
  const landing = fs.readFileSync(path.join(SRC, 'components', 'LandingPage.jsx'), 'utf8');
  assert.match(landing, /earn proof than fake it/i);
});

test('the trust page states it does not claim unearned awards or reviews', () => {
  const trust = fs.readFileSync(path.join(SRC, 'components', 'TrustPage.jsx'), 'utf8');
  // Apostrophe-agnostic: the source writes it as &apos; in JSX, so matching a
  // literal "haven't" fails against a statement that is plainly there.
  assert.match(trust, /claim awards we/i);
  assert.match(trust, /invented reviews/i);
});

/* ───────── attestations, compliance badges, and superlatives ─────────
 *
 * The second heycatch pass flagged three more classes of unbacked claim: a
 * certification we have not been audited for, a compliance badge that asserts
 * an assessment rather than a right, and superlatives with nothing to compare
 * against. Each was rewritten to state the underlying practice instead, and
 * each replacement is pinned below so it cannot be swapped back for the badge.
 */

/* ─────────── security: inherited from audited providers ───────────
 *
 * TGM holds no SOC 2 report of its own. Rather than describe ourselves in the
 * language of an audit we have not had, the trust page names the providers we
 * run on and links each one's trust centre. Their attestations are the evidence
 * — and if their controls fail, ours fail, so they are the honest thing to
 * point at rather than a self-description.
 */

test('TGM never claims a SOC 2 attestation for its own practices', () => {
  // The removed shape: "Security practices designed around SOC 2 principles",
  // which reads as an audit result. There is no audit.
  for (const { f, text } of readAll()) {
    assert.doesNotMatch(
      text,
      /designed around SOC\s*2/i,
      `${path.relative(SRC, f)} claims SOC 2 for our own practices`,
    );
    assert.doesNotMatch(
      text,
      /SOC\s*2[-\s]*certified/i,
      `${path.relative(SRC, f)} claims a SOC 2 certification`,
    );
  }
});

test('the trust page says plainly that we hold no SOC 2 audit of our own', () => {
  const trust = fs.readFileSync(path.join(SRC, 'components', 'TrustPage.jsx'), 'utf8');
  assert.match(trust, /do not hold our own SOC 2/i);
});

test('security is attributed to audited providers, each with a trust centre link', () => {
  const trust = fs.readFileSync(path.join(SRC, 'components', 'TrustPage.jsx'), 'utf8');
  const providers = [
    ['Railway', 'https://trust.railway.com'],
    ['Vercel', 'https://security.vercel.com'],
    ['Supabase', 'https://trust.supabase.com'],
    ['GitHub', 'https://ghec.github.trust.page'],
    ['Stripe', 'https://stripe.com/docs/security'],
    ['Groq', 'https://trust.groq.com'],
  ];
  for (const [name, url] of providers) {
    assert.ok(trust.includes(name), `${name} missing from the infrastructure list`);
    assert.ok(trust.includes(url), `${name} trust centre is not linked`);
  }
});

test('the homepage points at the same audited infrastructure', () => {
  // The claim has to be consistent across pages, or the trust page reads as an
  // isolated correction rather than the site's actual position.
  const landing = fs.readFileSync(path.join(SRC, 'components', 'LandingPage.jsx'), 'utf8');
  assert.match(landing, /Railway, Vercel, Supabase and GitHub/);
  assert.match(landing, /Audited infrastructure/);
});

test('GDPR/CCPA is stated as a right, not a compliance badge', () => {
  // "aligned" asserts an assessment. "deletion on request" is the concrete
  // thing the regulations require and the product actually offers.
  for (const { f, text } of readAll()) {
    assert.doesNotMatch(
      text,
      /GDPR\s*\/?\s*&?\s*CCPA[-\s]+aligned/i,
      `${path.relative(SRC, f)} claims GDPR/CCPA alignment`,
    );
  }
  const all = readAll().map((r) => r.text).join('\n');
  assert.match(all, /GDPR & CCPA: deletion on request/);
});

test('no superlative asserts a dataset nobody can measure', () => {
  // "deepest dataset" and "Enterprise-grade" are comparative claims with no
  // stated comparison. The replacement says what is actually in the module.
  for (const { f, text } of readAll()) {
    assert.doesNotMatch(text, /\bdeepest\b/i, `${path.relative(SRC, f)} claims the deepest dataset`);
    assert.doesNotMatch(text, /Enterprise-grade/i, `${path.relative(SRC, f)} claims enterprise-grade practices`);
  }
});

test('no unmeasured API latency figure is advertised', () => {
  // "< 500ms avg response time" was never benchmarked under real load.
  for (const { f, text } of readAll()) {
    assert.doesNotMatch(text, /500\s*ms/i, `${path.relative(SRC, f)} advertises an unmeasured latency`);
  }
});

test('the latency replacement describes what the API actually does', () => {
  const funder = fs.readFileSync(path.join(SRC, 'components', 'FunderApiLandingPage.jsx'), 'utf8');
  assert.match(funder, /Single or batch/);
  assert.match(funder, /Score one application or a full cycle/);
  assert.match(funder, /How does the API handle volume\?/);
});

test('data handling is described concretely, not by analogy', () => {
  // "the same seriousness as a financial institution" borrows credibility from
  // a sector we are not in. The replacement states the actual controls.
  const trust = fs.readFileSync(path.join(SRC, 'components', 'TrustPage.jsx'), 'utf8');
  assert.doesNotMatch(trust, /financial institution/i);
  assert.match(trust, /as sensitive by default/);
});
