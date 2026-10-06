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

test('every prerendered route is exposed by a rewrite, and unknown paths 404', () => {
  // Two requirements pull in opposite directions:
  //  - the SPA needs a fallback so a real client route survives a refresh;
  //  - an unknown path must return 404, not 200 with the app shell.
  // The fix is an explicit rewrite for every real app route and NO broad
  // catch-all, so Vercel falls through to its 404 for anything else. A broad
  // catch-all would silently undo the second requirement.
  const vercel = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8'));
  const rewrites = vercel.rewrites || [];
  const sources = rewrites.map((r) => r.source);

  assert.ok(
    rewrites.some((r) => r.destination === '/index.html'),
    'vercel.json must keep an SPA fallback rewrite for client routes'
  );

  const missing = Object.keys(parsePageMeta(META_SRC))
    .filter((p) => p !== '/')
    .filter((p) => !sources.includes(p));
  assert.deepEqual(missing, [], `prerendered routes with no rewrite: ${missing.join(', ')}`);

  const broad = sources.filter((s) => s === '/(.*)' || s.includes('(?!assets/).*'));
  assert.deepEqual(
    broad,
    [],
    `a broad catch-all turns every unknown path into a 200: ${broad.join(', ')}`
  );
});

test('every public route rewrites to its own prerendered HTML', () => {
  // The check above only asserts a rewrite EXISTS for each route — it matches on
  // `source` and never inspects `destination`. That is how /checkup shipped
  // pointing at the Railway API instead of its own page: the rule was present,
  // so the suite passed, but the route was unreachable in production.
  //
  // Every prerendered route is written to <route>/index.html by
  // scripts/prerender-meta.mjs, so that is what its rewrite must serve.
  const vercel = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8'));
  const rewrites = vercel.rewrites || [];

  const wrong = [];
  for (const p of Object.keys(parsePageMeta(META_SRC))) {
    if (p === '/') continue; // served by the root index.html, no rewrite needed
    const rule = rewrites.find((r) => r.source === p);
    const expected = `${p}/index.html`;
    if (!rule || rule.destination !== expected) {
      wrong.push(`${p} -> ${rule ? rule.destination : 'NO RULE'} (expected ${expected})`);
    }
  }

  assert.deepEqual(
    wrong,
    [],
    `public routes not serving their prerendered HTML: ${wrong.join('; ')}`
  );
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

/* ────────── crawlability, clarity and authorship (the fourth audit) ────────── */

const ROBOTS_SRC = fs.readFileSync(path.join(REPO, 'public', 'robots.txt'), 'utf8');
const VERCEL = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8'));

const PAGE_CONTENT_BLOCK = (() => {
  const block = META_SRC.match(/export const PAGE_CONTENT = \{([\s\S]*?)\n\};/);
  assert.ok(block, 'PAGE_CONTENT block not found in src/lib/pageMeta.js');
  return block[1];
})();

const countIn = (haystack, re) => (haystack.match(re) || []).length;

test('robots.txt is a real robots file with a sitemap pointer', () => {
  assert.match(ROBOTS_SRC, /^User-agent:\s*\*/m, 'robots.txt has no User-agent directive');
  assert.match(
    ROBOTS_SRC,
    /^Sitemap:\s*https:\/\/www\.thegrantsmaster\.com\/sitemap\.xml$/m,
    'robots.txt has no sitemap pointer'
  );
  assert.match(ROBOTS_SRC, /^Disallow:\s*\/dashboard$/m, 'robots.txt must disallow auth-gated routes');
});

test('vercel.json sends the security headers the audit checks', () => {
  const headers = (VERCEL.headers || []).flatMap((h) => (h.headers || []).map((x) => x.key));
  for (const key of [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
  ]) {
    assert.ok(headers.includes(key), `vercel.json is missing the ${key} header`);
  }
});

test('unknown paths serve a 404 page, not the app shell', () => {
  assert.ok(
    fs.existsSync(path.join(REPO, 'public', '404.html')),
    'public/404.html must exist so Vercel serves a 404, not the SPA shell'
  );
});

test('every public page has crawlable body content', () => {
  const paths = Object.keys(parsePageMeta(META_SRC));
  for (const p of paths) {
    assert.ok(
      PAGE_CONTENT_BLOCK.includes(`'${p}': {`),
      `${p} has no PAGE_CONTENT entry — the prerendered page would have no H1`
    );
  }
  assert.equal(countIn(PAGE_CONTENT_BLOCK, /h1:/g), paths.length, 'every page needs exactly one h1');
  assert.equal(
    countIn(PAGE_CONTENT_BLOCK, /definition:/g),
    paths.length,
    'every page needs a definition sentence'
  );
  assert.equal(
    countIn(PAGE_CONTENT_BLOCK, /related:/g),
    paths.length,
    'every page needs related links so it is not an orphan'
  );

  // The audit wants each page to OPEN with a definition ("X is …"). Three
  // pages shipped verbs like "creates"/"opens"/"set out" and were scored as
  // having no definition, so pin the shape here.
  const defs = [...PAGE_CONTENT_BLOCK.matchAll(/definition:\s*\n\s*'((?:[^'\\]|\\.)*)'/g)].map(
    (m) => m[1]
  );
  assert.equal(defs.length, paths.length, 'could not read every definition sentence');
  for (const d of defs) {
    const firstSentence = d.split(/(?<=[.!?])\s/)[0];
    assert.match(firstSentence, /\b(is|are)\b/, `definition must open with "X is …": ${d}`);
  }
});

test('the prerendered body carries one H1, a definition and related links', () => {
  // Source-level guarantee always runs; the dist assertion runs after a build.
  assert.match(PRERENDER_SRC, /PAGE_CONTENT/, 'prerender must inject PAGE_CONTENT');
  assert.match(PRERENDER_SRC, /data-prerender/, 'prerender must mark the injected block');

  const distIndex = path.join(REPO, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) return;
  const html = fs.readFileSync(distIndex, 'utf8');
  assert.equal((html.match(/<h1/g) || []).length, 1, 'prerendered homepage must have exactly one H1');
  assert.match(html, /is an AI grant-writing platform/, 'prerendered definition missing');
  assert.match(html, /<a href="\/pricing">Pricing and plans<\/a>/, 'prerendered related links missing');
});

test('the prerendered footer links About and Contact on every page', () => {
  assert.match(META_SRC, /\['\/about', 'About'\]/, 'SITE_NAV must link to About');
  assert.match(META_SRC, /\['\/contact', 'Contact'\]/, 'SITE_NAV must link to Contact');
});

test('Organization sameAs lists at least three real profiles', () => {
  const json = INDEX_SRC.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'could not extract the JSON-LD block');
  const org = JSON.parse(json[1])['@graph'].find((n) => n['@type'] === 'Organization');
  assert.ok(Array.isArray(org.sameAs), 'Organization.sameAs must be an array');
  assert.ok(
    org.sameAs.length >= 3,
    `Organization.sameAs has only ${org.sameAs.length} profile(s); the audit wants at least 3`
  );
  for (const url of org.sameAs) {
    assert.match(url, /^https:\/\//, `sameAs entry is not an absolute https URL: ${url}`);
  }
});
