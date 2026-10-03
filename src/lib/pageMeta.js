// src/lib/pageMeta.js
//
// One source of truth for per-page <head> metadata.
//
// Why this exists: this is a client-rendered SPA, so every route previously
// shipped the single <title> and <meta description> hard-coded in index.html.
// Google executes the JS and would have indexed a dozen pages under one title,
// which reads to a crawler as one page with duplicates rather than a site with
// distinct pages.
//
// The sitemap and the tests both read from here, so a new page cannot silently
// ship with the homepage's title again.

export const SITE_URL = 'https://www.thegrantsmaster.com';
export const SITE_NAME = 'The Grants Master';

/** Hard ceiling so a long title is caught here rather than truncated by Google. */
export const MAX_TITLE = 60;
export const MAX_DESCRIPTION = 160;

export const DEFAULT_META = {
  title: 'The Grants Master — AI Grant Writing & Scoring',
  description:
    'Draft funder-ready grant proposals and score them before you submit. Pre-submission scoring, funder alignment, and compliance checks for nonprofits.',
};

/**
 * Public, indexable pages. Order matters: it is the sitemap order, roughly
 * most-important-first.
 */
export const PAGE_META = {
  '/': {
    title: 'The Grants Master — AI Grant Writing & Scoring',
    description:
      'Draft funder-ready grant proposals and score them before you submit. Pre-submission scoring, funder alignment, and compliance checks for nonprofits.',
    changefreq: 'weekly',
    priority: '1.0',
  },
  '/pricing': {
    title: 'Pricing & Plans — The Grants Master',
    description:
      'Free forever, Starter $29/mo, Pro $79/mo, Agency $149/mo, Agency+ $299/mo, or Lifetime for $499. Compare every tier and see exactly what is included.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/features': {
    title: 'Features — Steve AI Drafting & Checkmate Scoring',
    description:
      'Steve drafts structured, funder-ready proposals. Checkmate scores them before submission, with criteria and gaps visible on every plan.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/new-york-grants': {
    title: 'New York Grants — NYSCA, NYSED, ESD & NYC Arts',
    description:
      'New York grant opportunities, deadlines, and compliance rules in one place, each with a Grant Fit Score for your organization.',
    changefreq: 'weekly',
    priority: '0.9',
  },
  '/funder-api': {
    title: 'Funder Intelligence API — Rubric Scoring for Grantmakers',
    description:
      'Rubric-based scoring, funder-fit intelligence, and cohort and cycle analytics via API. Integrates with Fluxx, Foundant, and Submittable.',
    changefreq: 'monthly',
    priority: '0.8',
  },
  '/consultants': {
    title: 'For Grant Consultants & Agencies — Multi-Client Mode',
    description:
      'Client folders, white-label Checkmate reports, bulk scoring, and role-based permissions for consultants managing multiple nonprofits.',
    changefreq: 'monthly',
    priority: '0.8',
  },
  '/about': {
    title: 'About The Grants Master — Gee Oh Dee (Tech) LLC',
    description:
      'Built by Thomas Clottey, Full Stack / AI Software Developer, at Gee Oh Dee (Tech) LLC in Roanoke, Virginia. Why we built it, and how.',
    changefreq: 'monthly',
    priority: '0.7',
  },
  '/trust': {
    title: 'Trust & Security — The Grants Master',
    description:
      'Hosting by Railway, frontend by Vercel, database by Supabase, source control on GitHub, payments by Stripe. Encrypted in transit and at rest.',
    changefreq: 'monthly',
    priority: '0.7',
  },
  '/new-york-grants/checklist': {
    title: 'New York Grant Application Checklist',
    description:
      'A practical pre-submission checklist for New York grant applications: eligibility, budget, attachments, and the mistakes that lose points.',
    changefreq: 'monthly',
    priority: '0.7',
  },
  '/customers': {
    title: 'Customers & Proof — The Grants Master',
    description:
      'We are early and would rather earn proof than fake it. Here is what we can show today, and what we are still working to earn.',
    changefreq: 'monthly',
    priority: '0.6',
  },
  '/request-access': {
    title: 'Request Access — The Grants Master',
    description:
      'Request access to The Grants Master. Tell us about your organization and we will get you set up.',
    changefreq: 'monthly',
    priority: '0.6',
  },
  '/lead-magnet/grant-workflow-blueprint': {
    title: 'Free Grant Workflow Blueprint — The Grants Master',
    description:
      'A free step-by-step blueprint for running a grant application from funder research through submission, without missing a deadline.',
    changefreq: 'monthly',
    priority: '0.6',
  },
  '/contact': {
    title: 'Contact The Grants Master',
    description:
      'Questions about plans, the Funder Intelligence API, or a New York grant? Reach the team directly.',
    changefreq: 'yearly',
    priority: '0.5',
  },
  '/signup': {
    title: 'Create Your Free Account — The Grants Master',
    description:
      'Start free, no credit card required. Score a draft with Checkmate and see where it would lose points before you submit.',
    changefreq: 'yearly',
    priority: '0.7',
  },
  '/login': {
    title: 'Log In — The Grants Master',
    description: 'Log in to your The Grants Master account.',
    changefreq: 'yearly',
    priority: '0.3',
  },
  '/privacy': {
    title: 'Privacy Policy — The Grants Master',
    description:
      'How The Grants Master collects, uses, and protects your data, including how drafts are handled and why they are never used to train AI models.',
    changefreq: 'yearly',
    priority: '0.4',
  },
  '/terms': {
    title: 'Terms of Service — The Grants Master',
    description: 'The terms that govern your use of The Grants Master.',
    changefreq: 'yearly',
    priority: '0.4',
  },
};

/**
 * Duplicate-content aliases. These routes render the same component as their
 * target, so they must not be indexed as separate pages — the canonical points
 * at the real one and they stay out of the sitemap.
 */
export const CANONICAL_ALIASES = {
  '/plans': '/pricing',
  '/consultant-mode': '/consultants',
  '/en': '/',
  '/es': '/',
  '/fr': '/',
};

/**
 * Routes that must never be indexed: anything behind auth, plus post-submit
 * and internal tooling pages. Matched by prefix.
 */
export const NOINDEX_PREFIXES = [
  '/dashboard',
  '/workspace',
  '/admin',
  '/billing',
  '/team',
  '/clients',
  '/onboarding',
  '/upgrade',
  '/invite',
  '/reset-password',
  '/funder/reviewer',
  '/scott',
  '/lead-magnet/grant-workflow-blueprint/success',
  '/lead-magnet/grant-workflow-blueprint/pdf',
];

/** The ordered list of paths the sitemap is generated from. */
export const PUBLIC_PATHS = Object.keys(PAGE_META);

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Resolve the metadata for a pathname. Always returns a complete object — an
 * unknown route falls back to the default title and is marked noindex rather
 * than silently inheriting the homepage's.
 */
export function resolveMeta(pathname = '/') {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  if (CANONICAL_ALIASES[path]) {
    const target = CANONICAL_ALIASES[path];
    const targetMeta = PAGE_META[target] || DEFAULT_META;
    return {
      title: targetMeta.title,
      description: targetMeta.description,
      canonical: `${SITE_URL}${target === '/' ? '' : target}`,
      robots: 'noindex, follow',
    };
  }

  if (NOINDEX_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) {
    const meta = PAGE_META[path] || DEFAULT_META;
    return {
      title: meta.title,
      description: meta.description,
      canonical: `${SITE_URL}${path}`,
      robots: 'noindex, nofollow',
    };
  }

  const meta = PAGE_META[path];
  if (meta) {
    return {
      title: meta.title,
      description: meta.description,
      canonical: `${SITE_URL}${path === '/' ? '' : path}`,
      robots: 'index, follow',
    };
  }

  // Unknown route: default copy, but never claim it is indexable.
  return {
    title: DEFAULT_META.title,
    description: DEFAULT_META.description,
    canonical: `${SITE_URL}${path}`,
    robots: 'noindex, follow',
  };
}
