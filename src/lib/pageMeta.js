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
  '/checkup': {
    title: 'Free Grant Proposal Checkup — Checkmate Score',
    description:
      'Upload a grant proposal and get a free Checkmate score out of 100, the six criteria behind it, and the gaps costing you points. No account needed.',
    changefreq: 'monthly',
    priority: '0.9',
  },
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
 * Static, crawlable body content for each public page.
 *
 * Why this exists: this is a client-rendered SPA, so every prerendered HTML
 * file had an empty <div id="root"></div>. Crawlers that do not execute JS saw
 * a page with no H1, no definition, no internal links and no footer, which is
 * what the audit measured. scripts/prerender-meta.mjs injects this block into
 * the prerendered body; React replaces it on mount, so users still get the app.
 *
 * Each entry opens with a definition ("X is …") and a short intro, both
 * written in short sentences, and links to related pages so no public page is
 * an orphan. Keep the copy factual — no ratings or claims we cannot support.
 */
export const PAGE_CONTENT = {
  '/checkup': {
    h1: 'Score your grant proposal before a funder does',
    definition:
      'The Checkmate checkup is a free grant proposal review that scores a draft out of 100 and names the gaps costing you points.',
    intro:
      'Upload a PDF or Word draft and get the six criteria behind the score in about a minute. No account, no credit card, and the document is never stored.',
    related: [
      ['/pricing', 'Pricing and plans'],
      ['/', 'The Grants Master home'],
    ],
  },
  '/': {
    h1: 'The Grants Master — AI grant writing and pre-submission scoring',
    definition:
      'The Grants Master is an AI grant-writing platform that drafts funder-ready proposals and scores them before you submit.',
    intro:
      'Steve writes each section from your organization details. Checkmate grades the draft against funder criteria and shows the gaps. You review, edit, and export to PDF or Word.',
    related: [
      ['/pricing', 'Pricing and plans'],
      ['/features', 'Features'],
      ['/new-york-grants', 'New York grants'],
    ],
  },
  '/pricing': {
    h1: 'Pricing and plans',
    definition:
      'The Grants Master pricing is a set of monthly plans, plus a one-time Founding Member lifetime option.',
    intro:
      'Free includes one saved draft and basic scoring, while Starter adds unlimited drafts and full Checkmate scoring. Pro adds team seats, and Agency adds client folders and white-label reports.',
    related: [
      ['/features', 'Features'],
      ['/trust', 'Trust and security'],
      ['/contact', 'Contact the team'],
    ],
  },
  '/features': {
    h1: 'Features: Steve AI drafting and Checkmate scoring',
    definition:
      'The Grants Master features are AI drafting, pre-submission scoring, funder alignment, and compliance checks in one workspace.',
    intro:
      'Steve drafts structured proposals section by section. Checkmate scores each draft and names the missing components. Funder matching suggests where the proposal fits best.',
    related: [
      ['/pricing', 'Pricing and plans'],
      ['/funder-api', 'Funder Intelligence API'],
      ['/consultants', 'For consultants and agencies'],
    ],
  },
  '/new-york-grants': {
    h1: 'New York grants, simplified',
    definition:
      'New York grants are state, city, and private funding opportunities open to organizations in or serving New York.',
    intro:
      'The Grants Master collects NYSCA, NYSED, ESD, and NYC Arts opportunities in one place. Each listing shows deadlines, eligibility, and a Grant Fit Score for your organization.',
    related: [
      ['/new-york-grants/checklist', 'NY grant application checklist'],
      ['/features', 'Features'],
      ['/pricing', 'Pricing and plans'],
    ],
  },
  '/funder-api': {
    h1: 'Funder Intelligence API',
    definition:
      'The Funder Intelligence API is a rubric-based scoring service that lets grantmakers evaluate applications against their own criteria.',
    intro:
      'Send an application and a rubric, and the API returns criterion-level scores, funder-fit signals, and cohort analytics. It integrates with Fluxx, Foundant, and Submittable.',
    related: [
      ['/features', 'Features'],
      ['/pricing', 'Pricing and plans'],
      ['/contact', 'Contact the team'],
    ],
  },
  '/consultants': {
    h1: 'For grant consultants and agencies',
    definition:
      'The Grants Master for consultants is a multi-client mode that keeps each nonprofit work in its own folder.',
    intro:
      'Client folders isolate every organization. White-label Checkmate reports carry your brand. Bulk scoring and role-based permissions let a team work across clients without mixing them up.',
    related: [
      ['/pricing', 'Pricing and plans'],
      ['/features', 'Features'],
      ['/contact', 'Contact the team'],
    ],
  },
  '/about': {
    h1: 'About The Grants Master',
    definition:
      'The Grants Master is built by Gee Oh Dee (Tech) LLC, a software company in Roanoke, Virginia.',
    intro:
      'Thomas Clottey, a full stack and AI software developer, founded the company and leads the build. The team is small and the product is early, so this page stays specific about what works today.',
    related: [
      ['/contact', 'Contact the team'],
      ['/trust', 'Trust and security'],
      ['/customers', 'Customers and proof'],
    ],
  },
  '/trust': {
    h1: 'Trust and security',
    definition:
      'The Grants Master trust model is built on independently audited infrastructure rather than custom security claims.',
    intro:
      'Railway hosts the backend, Vercel serves the frontend, Supabase stores the database, and GitHub holds the source. Stripe processes payments, and all data is encrypted in transit and at rest.',
    related: [
      ['/privacy', 'Privacy policy'],
      ['/about', 'About The Grants Master'],
      ['/contact', 'Contact the team'],
    ],
  },
  '/new-york-grants/checklist': {
    h1: 'New York grant application checklist',
    definition:
      'A grant application checklist is a pre-submission list that catches the errors funders reject proposals for.',
    intro:
      'This checklist covers eligibility, budget, attachments, and the wording mistakes that cost points. Work through it after the draft is complete and before anyone else reads it.',
    related: [
      ['/new-york-grants', 'New York grants'],
      ['/features', 'Features'],
      ['/pricing', 'Pricing and plans'],
    ],
  },
  '/customers': {
    h1: 'Customers and proof',
    definition:
      'The Grants Master is early, and this page shows what the team can prove today.',
    intro:
      'There are no invented testimonials and no fabricated logos here. When real customer results exist, they will be published with permission.',
    related: [
      ['/about', 'About The Grants Master'],
      ['/trust', 'Trust and security'],
      ['/pricing', 'Pricing and plans'],
    ],
  },
  '/request-access': {
    h1: 'Request access',
    definition:
      'Requesting access is the step that starts a The Grants Master workspace for your organization.',
    intro:
      'Tell us about your organization and what you need to write. The team reviews each request and replies with next steps.',
    related: [
      ['/pricing', 'Pricing and plans'],
      ['/contact', 'Contact the team'],
      ['/features', 'Features'],
    ],
  },
  '/lead-magnet/grant-workflow-blueprint': {
    h1: 'Free grant workflow blueprint',
    definition:
      'The grant workflow blueprint is a six-step system for running a proposal from funder research through submission.',
    intro:
      'Each step names the work, the time it takes, and the output it produces. Follow the steps in order and the reusable content library grows with every proposal.',
    related: [
      ['/features', 'Features'],
      ['/new-york-grants/checklist', 'NY grant application checklist'],
      ['/signup', 'Create your free account'],
    ],
  },
  '/contact': {
    h1: 'Contact The Grants Master',
    definition:
      'Contacting The Grants Master is the fastest way to reach the team about plans, the Funder Intelligence API, or a New York grant.',
    intro:
      'Send a message and the team replies directly. There is no phone tree and no ticket queue.',
    related: [
      ['/about', 'About The Grants Master'],
      ['/pricing', 'Pricing and plans'],
      ['/funder-api', 'Funder Intelligence API'],
    ],
  },
  '/signup': {
    h1: 'Create your free account',
    definition:
      'Signing up is free and gives you one saved draft with basic scoring in The Grants Master.',
    intro:
      'No credit card is required. Score a draft with Checkmate and see where it would lose points before you submit.',
    related: [
      ['/pricing', 'Pricing and plans'],
      ['/features', 'Features'],
      ['/login', 'Log in'],
    ],
  },
  '/login': {
    h1: 'Log in to The Grants Master',
    definition:
      'Logging in is how you open your The Grants Master workspace and the drafts saved to it.',
    intro:
      'Enter the email and password you signed up with. If you forgot the password, use the reset link.',
    related: [
      ['/signup', 'Create your free account'],
      ['/pricing', 'Pricing and plans'],
      ['/contact', 'Contact the team'],
    ],
  },
  '/privacy': {
    h1: 'Privacy policy',
    definition:
      'This privacy policy explains what data The Grants Master collects, how it is used, and how you can have it deleted.',
    intro:
      'It covers account details, drafts, and usage data. Drafts are never used to train AI models. You can request deletion at any time.',
    related: [
      ['/terms', 'Terms of service'],
      ['/trust', 'Trust and security'],
      ['/contact', 'Contact the team'],
    ],
  },
  '/terms': {
    h1: 'Terms of service',
    definition:
      'These terms of service are the rules for using The Grants Master, including accounts, billing, and liability.',
    intro:
      'They apply to everyone who uses the service. Read them alongside the privacy policy.',
    related: [
      ['/privacy', 'Privacy policy'],
      ['/trust', 'Trust and security'],
      ['/contact', 'Contact the team'],
    ],
  },
};

/**
 * Site-wide links rendered into the prerendered footer of every public page.
 * This is what keeps About and Contact reachable in the footer and stops any
 * public page from becoming an orphan.
 */
export const SITE_NAV = [
  ['/', 'Home'],
  ['/pricing', 'Pricing and plans'],
  ['/features', 'Features'],
  ['/new-york-grants', 'New York grants'],
  ['/new-york-grants/checklist', 'NY grant checklist'],
  ['/funder-api', 'Funder Intelligence API'],
  ['/consultants', 'For consultants and agencies'],
  ['/about', 'About'],
  ['/trust', 'Trust and security'],
  ['/customers', 'Customers'],
  ['/request-access', 'Request access'],
  ['/contact', 'Contact'],
  ['/signup', 'Sign up'],
  ['/login', 'Log in'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
];

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
