// scripts/prerender-meta.mjs
//
// Emits one real HTML file per public route so crawlers that never execute JS
// still see that page's own <title>, description and canonical.
//
// Why this exists: pageMeta.js fixed the *titles* by rewriting <head> at
// runtime, which Google sees because it runs the JS. It did not fix the
// description, because index.html is a single static file and Vercel rewrites
// every non-asset path to it. So /pricing, /features and /funder-api all served
// the homepage's description in the raw HTML — exactly what the second audit
// caught. A runtime fix cannot solve this; the bytes on the wire have to differ.
//
// Vercel checks the filesystem before applying rewrites, so dist/pricing/index.html
// is served for /pricing without touching vercel.json.
//
// This script fails loudly if any tag it expects is missing, so a change to
// index.html cannot silently turn this into a no-op.

import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const TEMPLATE = path.join(DIST, 'index.html');

if (!fs.existsSync(TEMPLATE)) {
  console.error('[prerender] dist/index.html not found — run vite build first');
  process.exit(1);
}

// pageMeta.js is ESM in a CommonJS package, so bundle it before importing.
const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });
const bundledMeta = path.join(CACHE_DIR, 'pageMeta.mjs');

await build({
  entryPoints: [path.join(ROOT, 'src', 'lib', 'pageMeta.js')],
  outfile: bundledMeta,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});

const bundledFaqs = path.join(CACHE_DIR, 'faqs.mjs');
await build({
  entryPoints: [path.join(ROOT, 'src', 'lib', 'faqs.js')],
  outfile: bundledFaqs,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});

const { PAGE_META, PAGE_CONTENT, SITE_NAV, SITE_URL } = await import(
  pathToFileURL(bundledMeta).href
);
const { PRICING_FAQS, FUNDER_API_FAQS, faqPageSchema } = await import(
  pathToFileURL(bundledFaqs).href
);

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Replace exactly once, or throw — a silent miss is the bug we are fixing.
 *
 * Count with a global clone: a non-global .match() returns the match PLUS its
 * capture groups, so a lone match reports length 3 and looks like a duplicate.
 */
function replaceOnce(html, pattern, replacement, label) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = html.match(new RegExp(pattern.source, flags));
  if (!matches || matches.length !== 1) {
    throw new Error(
      `[prerender] expected exactly 1 match for ${label}, found ${matches ? matches.length : 0}`
    );
  }
  return html.replace(pattern, replacement);
}

/**
 * The crawlable body block injected into <div id="root">. React replaces this
 * on mount, so it exists only for clients that do not execute JS. It carries
 * exactly one H1, a definition sentence, a short intro, related links, and a
 * footer nav, which is what the audit scores.
 */
function renderPrerenderBlock(content) {
  const related = content.related
    .map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`)
    .join('');
  const nav = SITE_NAV.map(
    ([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`
  ).join('');

  return [
    '<div data-prerender="true" style="font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;max-width:760px;margin:0 auto;padding:32px 20px;color:#0A0F1A;line-height:1.6">',
    '<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#003A8C">The Grants Master</p>',
    `<h1 style="font-size:34px;line-height:1.15;margin:0 0 16px">${esc(content.h1)}</h1>`,
    `<p style="font-size:17px;margin:0 0 12px">${esc(content.definition)}</p>`,
    `<p style="font-size:15px;color:#374151;margin:0 0 24px">${esc(content.intro)}</p>`,
    '<nav aria-label="Related pages" style="margin:0 0 24px">',
    '<h2 style="font-size:16px;margin:0 0 8px">Related pages</h2>',
    `<ul style="margin:0;padding-left:20px">${related}</ul>`,
    '</nav>',
    '<nav aria-label="Site" style="border-top:1px solid #E5E7EB;padding-top:16px">',
    '<h2 style="font-size:16px;margin:0 0 8px">Explore The Grants Master</h2>',
    `<ul style="margin:0;padding-left:20px;columns:2">${nav}</ul>`,
    '</nav>',
    '</div>',
  ].join('');
}

/** FAQ structured data, built from the same arrays the pages render. */
const FAQ_BY_PATH = {
  '/pricing': PRICING_FAQS,
  '/funder-api': FUNDER_API_FAQS,
};

function buildPage(template, meta, routePath) {
  const url = `${SITE_URL}${routePath === '/' ? '' : routePath}`;
  const title = esc(meta.title);
  const description = esc(meta.description);

  let html = template;
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, 'title');
  html = replaceOnce(
    html,
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    `$1${description}$2`,
    'description'
  );
  html = replaceOnce(
    html,
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
    `$1${url}$2`,
    'canonical'
  );
  html = replaceOnce(html, /(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`, 'og:url');
  html = replaceOnce(html, /(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${title}$2`, 'og:title');
  html = replaceOnce(
    html,
    /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
    `$1${description}$2`,
    'og:description'
  );
  html = replaceOnce(
    html,
    /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
    `$1${title}$2`,
    'twitter:title'
  );
  html = replaceOnce(
    html,
    /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
    `$1${description}$2`,
    'twitter:description'
  );

  const faqs = FAQ_BY_PATH[routePath];
  if (faqs) {
    const json = JSON.stringify(faqPageSchema(faqs), null, 2).replace(/<\//g, '<\\/');
    html = html.replace('</head>', `  <script type="application/ld+json">\n${json}\n  </script>\n</head>`);
  }

  const content = PAGE_CONTENT[routePath];
  if (!content) {
    throw new Error(`[prerender] no PAGE_CONTENT for ${routePath} — add it to src/lib/pageMeta.js`);
  }
  html = replaceOnce(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">${renderPrerenderBlock(content)}</div>`,
    'root'
  );

  return html;
}

const template = fs.readFileSync(TEMPLATE, 'utf8');
let written = 0;

for (const [routePath, meta] of Object.entries(PAGE_META)) {
  const html = buildPage(template, meta, routePath);
  const outFile =
    routePath === '/'
      ? TEMPLATE
      : path.join(DIST, routePath.replace(/^\//, ''), 'index.html');

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  written += 1;
  console.log(
    `[prerender] ${routePath} -> ${path.relative(ROOT, outFile)}${FAQ_BY_PATH[routePath] ? ' (+FAQPage)' : ''}`
  );
}

// A prerendered file that nothing routes to is worse than no prerender: the
// build stays green while every path still serves index.html. Measured on
// production — both a catch-all rewrite and handle:filesystem swallowed these
// files, so the rewrite that exposes them has to be verified, not assumed.
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const rewriteSources = new Set((vercel.rewrites || []).map((r) => r.source));
const unrouted = Object.keys(PAGE_META).filter((p) => p !== '/' && !rewriteSources.has(p));
if (unrouted.length) {
  console.error(
    `[prerender] vercel.json has no rewrite exposing these prerendered routes: ${unrouted.join(', ')}`
  );
  process.exit(1);
}

console.log(`[prerender] wrote ${written} route(s) with per-page metadata`);
console.log(`[prerender] all ${written - 1} non-root route(s) are exposed by vercel.json rewrites`);
