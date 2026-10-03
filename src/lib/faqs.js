// src/lib/faqs.js
//
// One source of truth for the on-page FAQ content.
//
// Why this exists: the FAQ answers were previously inline in two components,
// which meant the FAQPage structured data could only ever be a hand-copy of
// them. Search engines and AI assistants read the structured data, and a
// hand-copy drifts the moment someone edits one side. Both the pages and the
// build-time prerender read from here, so the markup can never describe a
// question the page does not actually answer.
//
// NOTE: characters here must be written as real UTF-8. The build's
// normalize-funder-api-encoding plugin only repairs FunderApiLandingPage.jsx,
// so text that moves into this module is not covered by that repair.

export const PRICING_FAQS = [
  {
    q: 'Do I need a credit card to start?',
    a: 'No — the Free plan is forever free.',
  },
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes — upgrades and downgrades are instant.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Client folders are isolated — you only reach a folder you own or have been granted access to. Your data is never used to train AI models.',
  },
  {
    q: 'Does TGM work outside New York?',
    a: 'Yes — NY is our first localized workspace, with more states coming soon.',
  },
  {
    q: 'Is TGM for consultants?',
    a: 'Yes — Agency and Agency+ are built specifically for multi-client workflows.',
  },
];

export const FUNDER_API_FAQS = [
  {
    q: 'Does TGM replace our existing grant portal?',
    a: 'No. TGM is the intelligence layer behind your portal — not a replacement. You keep Fluxx, Foundant, Submittable, or your custom system. TGM augments them with scoring and fit intelligence via API.',
  },
  {
    q: 'What happens to our data?',
    a: 'Application data is used only to return scores and fit analysis for that request. TGM does not train on your funder data or share it across clients. API-level data is isolated per funder.',
  },
  {
    q: 'How does the API handle volume?',
    a: 'Scoring is synchronous — one call per application, or one call for a whole batch. Cycle intelligence covers a full cohort in a single request.',
  },
  {
    q: 'Can we customize the rubric?',
    a: 'Yes — rubric definition is entirely yours. You set criteria names, weights, descriptions, and scoring scale. TGM applies your rubric; you own the intelligence layer.',
  },
  {
    q: 'What does the pilot look like?',
    a: 'One or two real grant cycles — you keep your existing portal. We run scoring, fit, and cycle intelligence as an overlay. You keep all the output. We document the results for your team.',
  },
];

/** FAQPage JSON-LD for a page's questions. Only ever built from the arrays above. */
export function faqPageSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
