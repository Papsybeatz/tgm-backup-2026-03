/**
 * Per-page metadata, the sitemap, and structured data.
 *
 * The gap this closes: this is a client-rendered SPA, so every route shipped
 * the one <title> and <meta description> hard-coded in index.html, and the
 * sitemap listed 6 of the 17 real public pages. To a crawler that reads as a
 * single page with duplicates, not a site with distinct pages.
 *
 * These assert on source text rather than importing the module, matching how
 * the rest of this suite works: src/lib/pageMeta.js is ESM and this suite runs
 * under CommonJS.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const META_SRC = fs.readFileSync(path.join(REPO, 'src', 'lib', 'pageMeta.js'), 'utf8');
const SITEMAP_SRC = fs.readFileSync(path.join(REPO, 'public', 'sitemap.xml'), 'utf8');
const INDEX_SRC = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const APP_SRC = fs.readFileSync(path.join(REPO, 'src', 'App.jsx'), 'utf8');

const SITE_URL = 'https://www.thegrantsmaster.com';

/** Parse the PAGE_META block into { path: { title, description, ... } }. */
function parsePageMeta(src) {
  const block = src.match(/export const PAGE_META = \{([\s\S]*?)\n\};/);
  assert.ok(block, 'PAGE_META block not found in src/lib/pageMeta.js');

  const entries = {};
  const entryRe = /'([^']+)':\s*\{([^}]*)\}/g;
  let m;
  while ((m = entryRe.exec(block[1])) !== null) {
    const body = m[2];
    const title = body.match(/title:\s*'((?:[^'\\]|\\.)*)'/);
    const description = body.match(/description:\s*'((?:[^'\\]|\\.)*)'/);
    entries[m[1]] = {
      title: title ? title[1] : null,
      description: description ? description[1] : null,
    };
  }
  return entries;
}

/** Extract the pathname of every <loc> in the sitemap. */
function sitemapPaths(src) {
  const locs = [...src.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return locs.map((loc) => {
    const rest = loc.slice(SITE_URL.length);
    return rest === '' || rest === '/' ? '/' : rest;
  });
}

const PAGE_META = parsePageMeta(META_SRC);
const SITEMAP_PATHS = sitemapPaths(SITEMAP_SRC);

test('pageMeta defines a real set of public pages', () => {
  const paths = Object.keys(PAGE_META);
  assert.ok(paths.length >= 15, `expected at least 15 public pages, got ${paths.length}`);
  assert.ok(paths.includes('/'), 'the homepage must be defined');
});

test('every page has both a title and a description', () => {
  for (const [route, meta] of Object.entries(PAGE_META)) {
    assert.ok(meta.title, `${route} has no title`);
    assert.ok(meta.description, `${route} has no description`);
    assert.ok(meta.title.trim().length > 0, `${route} has a blank title`);
    assert.ok(meta.description.trim().length > 20, `${route} description is too thin`);
  }
});

test('no two pages share a title', () => {
  const seen = new Map();
  for (const [route, meta] of Object.entries(PAGE_META)) {
    const key = meta.title.toLowerCase();
    assert.ok(
      !seen.has(key),
      `${route} and ${seen.get(key)} share the title "${meta.title}" — the whole point is that each page is distinct`
    );
    seen.set(key, route);
  }
});

test('no two pages share a description', () => {
  const seen = new Map();
  for (const [route, meta] of Object.entries(PAGE_META)) {
    const key = meta.description.toLowerCase();
    assert.ok(
      !seen.has(key),
      `${route} and ${seen.get(key)} share a description`
    );
    seen.set(key, route);
  }
});

test('titles and descriptions stay within search-result limits', () => {
  for (const [route, meta] of Object.entries(PAGE_META)) {
    assert.ok(
      meta.title.length <= 60,
      `${route} title is ${meta.title.length} chars (max 60): "${meta.title}"`
    );
    assert.ok(
      meta.description.length <= 160,
      `${route} description is ${meta.description.length} chars (max 160)`
    );
  }
});

test('the sitemap lists every public page, and nothing else', () => {
  const defined = new Set(Object.keys(PAGE_META));
  const listed = new Set(SITEMAP_PATHS);

  const missing = [...defined].filter((p) => !listed.has(p));
  const extra = [...listed].filter((p) => !defined.has(p));

  assert.deepEqual(missing, [], `sitemap is missing public pages: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `sitemap lists pages that are not defined public pages: ${extra.join(', ')}`);
});

test('the sitemap has no duplicate entries', () => {
  const seen = new Set();
  for (const p of SITEMAP_PATHS) {
    assert.ok(!seen.has(p), `sitemap lists ${p} twice`);
    seen.add(p);
  }
});

test('auth-gated and post-submit routes are kept out of the sitemap', () => {
  const forbidden = [
    '/dashboard',
    '/workspace',
    '/admin/monitoring',
    '/billing',
    '/team',
    '/clients',
    '/onboarding',
    '/scott',
    '/lead-magnet/grant-workflow-blueprint/success',
  ];
  for (const route of forbidden) {
    assert.ok(
      !SITEMAP_PATHS.includes(route),
      `${route} must not be in the sitemap — it is not a public page`
    );
  }
});

test('duplicate-content aliases canonical away instead of competing', () => {
  // /plans renders PricingPage and /en,/es,/fr render LandingPage. Indexing
  // them as separate pages would split the ranking signal of the real page.
  for (const alias of ['/plans', '/consultant-mode', '/en', '/es', '/fr']) {
    assert.ok(
      META_SRC.includes(`'${alias}':`),
      `${alias} must be declared in CANONICAL_ALIASES`
    );
    assert.ok(
      !SITEMAP_PATHS.includes(alias),
      `${alias} is a duplicate-content alias and must stay out of the sitemap`
    );
  }
});

test('RouteMeta is mounted inside the Router so it runs on navigation', () => {
  assert.match(
    APP_SRC,
    /import RouteMeta from '\.\/components\/RouteMeta'/,
    'App.jsx does not import RouteMeta'
  );
  assert.match(APP_SRC, /<Router>[\s\S]{0,80}<RouteMeta \/>/, 'RouteMeta is not mounted inside the Router');
});

test('index.html carries structured data with the real legal entity', () => {
  assert.match(INDEX_SRC, /application\/ld\+json/, 'no JSON-LD block in index.html');

  const json = INDEX_SRC.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'could not extract the JSON-LD block');

  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(json[1]); }, 'the JSON-LD block is not valid JSON');

  const types = (parsed['@graph'] || []).map((n) => n['@type']);
  assert.ok(types.includes('Organization'), 'structured data has no Organization node');
  assert.ok(types.includes('SoftwareApplication'), 'structured data has no SoftwareApplication node');

  const org = parsed['@graph'].find((n) => n['@type'] === 'Organization');
  assert.equal(org.legalName, 'Gee Oh Dee (Tech) LLC', 'Organization legalName is wrong');
  assert.equal(org.address.postalCode, '24018', 'Organization address is wrong');
  assert.ok(
    org.sameAs.includes('https://www.linkedin.com/in/thomas-clottey'),
    'Organization sameAs is missing the founder LinkedIn'
  );
});

test('structured data claims no ratings or reviews we do not have', () => {
  // We have no third-party reviews. Emitting aggregateRating would be both
  // dishonest and a Google structured-data violation.
  //
  // Scoped to the PARSED data on purpose: asserting against the raw file would
  // match the comment above, which names the very fields it forbids.
  const json = INDEX_SRC.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'could not extract the JSON-LD block');
  const serialized = JSON.stringify(JSON.parse(json[1]));

  assert.doesNotMatch(serialized, /aggregateRating/, 'structured data claims a rating we do not have');
  assert.doesNotMatch(serialized, /reviewCount/, 'structured data claims reviews we do not have');
  assert.doesNotMatch(serialized, /"review"/, 'structured data claims reviews we do not have');
});

test('structured data offers match the real, corrected prices', () => {
  const prices = [...INDEX_SRC.matchAll(/"name":\s*"(Free|Starter|Pro|Agency|Agency\+|Lifetime)",\s*"price":\s*"(\d+)"/g)]
    .map((m) => [m[1], m[2]]);

  // The two numbers the competitor report got wrong are the ones worth pinning:
  // Lifetime is $499 (not $149) and Agency is $149 (not $299).

  assert.deepEqual(
    prices,
    [['Free', '0'], ['Starter', '29'], ['Pro', '79'], ['Agency', '149'], ['Agency+', '299'], ['Lifetime', '499']],
    'structured-data prices must match the corrected tier list'
  );
});

/* ────────── served-HTML metadata (the second audit's finding) ────────── */

const PKG = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const PRERENDER_SRC = fs.readFileSync(path.join(REPO, 'scripts', 'prerender-meta.mjs'), 'utf8');
const FAQS_SRC = fs.readFileSync(path.join(REPO, 'src', 'lib', 'faqs.js'), 'utf8');

test('the build emits per-route HTML, not just a runtime <head> swap', () => {
  // Rewriting <head> at runtime fixes the title for Google, which executes JS,
  // but leaves every route serving the homepage's description in the bytes on
  // the wire — the exact gap the second audit caught. Only a build step fixes it.
  assert.match(
    PKG.scripts.build,
    /prerender-meta\.mjs/,
    'the build script must run scripts/prerender-meta.mjs after vite build'
  );

  // vercel.json's buildCommand OVERRIDES the package script. It previously said
  // "npx vite build", which skipped the prerender on every deploy while local
  // builds looked perfectly correct — so the deployed HTML never had the
  // per-route tags at all, and no amount of routing work could expose them.
  const vercel = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8'));
  assert.match(
    vercel.buildCommand || '',
    /npm run build|prerender-meta\.mjs/,
    'vercel.json buildCommand must run the prerender, not a bare vite build'
  );
});

test('the prerender derives its routes from PAGE_META, not a second list', () => {
  assert.match(PRERENDER_SRC, /PAGE_META/, 'prerender must read PAGE_META');
  assert.match(PRERENDER_SRC, /pageMeta\.js/, 'prerender must bundle src/lib/pageMeta.js');
  assert.doesNotMatch(
    PRERENDER_SRC,
    /'\/pricing':\s*\{\s*title/,
    'prerender must not hard-code a second copy of the page metadata'
  );
});

test('the prerender refuses to silently skip a tag it cannot find', () => {
  // A no-op prerender is worse than none: it looks green and ships the bug.
  assert.match(PRERENDER_SRC, /replaceOnce/, 'prerender must replace tags through a checked helper');
  assert.match(PRERENDER_SRC, /expected exactly 1 match/, 'a missing tag must throw, not pass');
});

test('FAQ schema and the rendered FAQs come from one module', () => {
  // Hand-copied markup drifts the first time an answer changes, and the page
  // then publishes a question it does not actually answer.
  assert.match(FAQS_SRC, /export const PRICING_FAQS/, 'PRICING_FAQS must be exported');
  assert.match(FAQS_SRC, /export const FUNDER_API_FAQS/, 'FUNDER_API_FAQS must be exported');
  assert.match(FAQS_SRC, /export function faqPageSchema/, 'faqPageSchema must be exported');
  assert.match(PRERENDER_SRC, /PRICING_FAQS/, 'prerender must read the shared pricing FAQs');
  assert.match(PRERENDER_SRC, /FUNDER_API_FAQS/, 'prerender must read the shared funder FAQs');

  const pricing = fs.readFileSync(path.join(REPO, 'src', 'components', 'PricingPage.jsx'), 'utf8');
  const funder = fs.readFileSync(path.join(REPO, 'src', 'components', 'FunderApiLandingPage.jsx'), 'utf8');
  assert.match(pricing, /from '\.\.\/lib\/faqs'/, 'PricingPage must import the shared FAQs');
  assert.match(funder, /from '\.\.\/lib\/faqs'/, 'FunderApiLandingPage must import the shared FAQs');
});

test('every prerendered route is exposed by a rewrite ahead of the catch-all', () => {
  // Measured on production: a catch-all rewrite and handle:filesystem both
  // swallowed the prerendered files, so /pricing served the homepage's
  // description even though dist/pricing/index.html was deployed and returned
  // 200 when requested directly. Only an explicit rewrite wins, and it has to
  // come before the catch-all or the catch-all takes the path first.
  const vercel = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8'));
  const rewrites = vercel.rewrites || [];
  const sources = rewrites.map((r) => r.source);
  const catchAll = rewrites.findIndex((r) => r.destination === '/index.html');
  assert.ok(catchAll !== -1, 'vercel.json must keep an SPA catch-all fallback');

  const missing = Object.keys(parsePageMeta(META_SRC))
    .filter((p) => p !== '/')
    .filter((p) => !sources.includes(p));
  assert.deepEqual(missing, [], `prerendered routes with no rewrite: ${missing.join(', ')}`);

  for (const p of Object.keys(parsePageMeta(META_SRC))) {
    if (p === '/') continue;
    assert.ok(
      sources.indexOf(p) < catchAll,
      `${p} must be rewritten before the catch-all, or it will never be served`
    );
  }
});

test('the funder API is reachable from the header nav and both footers', () => {
  // The funder-api page was fully built and priced but unreachable by
  // navigation — the third buyer type could only find it by guessing the URL.
  const surfaces = {
    AppHeader: fs.readFileSync(path.join(REPO, 'src', 'components', 'AppHeader.jsx'), 'utf8'),
    AppLayout: fs.readFileSync(path.join(REPO, 'src', 'components', 'AppLayout.jsx'), 'utf8'),
    LandingPage: fs.readFileSync(path.join(REPO, 'src', 'components', 'LandingPage.jsx'), 'utf8'),
  };
  for (const [name, src] of Object.entries(surfaces)) {
    assert.match(src, /\/funder-api/, `${name} must link to /funder-api`);
  }
});
