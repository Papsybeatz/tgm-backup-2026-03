/** Shared pricing configuration (used by backend and frontend) */

/** @typedef {'free'|'starter'|'pro'|'agency_starter'|'agency_unlimited'|'lifetime'} TierKey */

/** @type {Record<string, any>} */
const TIERS = {
  free: {
    key: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceOnce: null,
    billingType: 'free',
    features: [
      'AI drafting (Steve)',
      'Unlimited brainstorming',
      '3 saved drafts',
      'Basic Checkmate scoring',
      'Export to PDF/Word',
      'NY Grant Readiness Checklist',
      'Access to NY Grants page',
      'Email support'
    ]
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    priceMonthly: 29,
    priceOnce: null,
    billingType: 'recurring',
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    features: [
      'Everything in Free',
      'Unlimited drafts',
      'Checkmate Pro (full scoring)',
      'Funder alignment insights',
      'Missing components detection',
      'Compliance checks',
      'Grant Fit Score',
      'Template library (single-org)',
      'Priority support'
    ]
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    priceMonthly: 79,
    priceOnce: null,
    billingType: 'recurring',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    highlight: true,
    features: [
      'Everything in Starter',
      'Team seats (up to 3)',
      'Shared workspace',
      'Team templates',
      'Team activity log',
      'Advanced Checkmate analytics',
      'NY funder intelligence',
      'NY compliance rules',
      'Document uploads',
      'Custom export formatting'
    ]
  },
  agency_starter: {
    key: 'agency_starter',
    name: 'Agency',
    priceMonthly: 149,
    priceOnce: null,
    billingType: 'recurring',
    stripePriceId: process.env.STRIPE_AGENCY_STARTER_PRICE_ID || 'price_agency_starter',
    features: [
      'Everything in Pro',
      'Multi-client dashboard',
      'Client folders',
      'Client-specific templates',
      'White-label Checkmate reports',
      'White-label proposal exports',
      'Bulk Checkmate scoring',
      'Bulk CSV export',
      'Client activity logs',
      'Team seats (up to 10)',
      'Role-based permissions',
      'Priority support'
    ]
  },
  agency_unlimited: {
    key: 'agency_unlimited',
    name: 'Agency+',
    priceMonthly: 299,
    priceOnce: null,
    billingType: 'recurring',
    stripePriceId: process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID || 'price_agency_unlimited',
    features: [
      'Everything in Agency',
      'Unlimited team seats',
      'Unlimited client folders',
      'Full white-label branding',
      'Priority support',
      'Dedicated workspace setup',
      'Multi-client dashboard',
      'White-label reports',
      'Quarterly strategy review',
      'Early access to new features'
    ]
  },
  lifetime: {
    key: 'lifetime',
    // ---------------------------------------------------------------------
    // FOUNDING MEMBER (key kept as 'lifetime' — Stripe, the DB and the webhook
    // all reference it, so the economics changed without a migration risk).
    //
    // This was $149 one-time with "All Pro features" forever. Pro is $79/mo
    // ($948/yr), so $149 bought a Pro-equivalent customer for 0.16x annual —
    // cheaper than two months, permanently. 100 sales = +$14,900 cash and
    // -$7,900/mo recurring forever: repaid in under two months, then pure loss.
    //
    // The formula that works for a launch cash instrument:
    //   1. cap the quantity      - scarcity creates urgency AND bounds liability
    //   2. price >= ~1.4x annual - a real deal, not a giveaway
    //   3. scope down one tier   - locks out Starter revenue, never Pro/Agency
    //   4. time-box it           - ends when the seats are gone
    //   5. brand it as status    - "Founding Member", not "cheap plan"
    //   6. exclude future premium features
    // ---------------------------------------------------------------------
    name: 'Founding Member',
    priceMonthly: null,
    priceOnce: 499,
    billingType: 'one_time',
    seatLimit: 100,
    tagline: 'First 100 members only',
    stripePriceId: process.env.STRIPE_LIFETIME_PRICE_ID || 'price_1TXrTl64TrQMI3mIKgqoP3iL',
    features: [
      'Everything in Starter, forever',
      'Unlimited grant letters',
      'Full Checkmate scoring',
      'Save, version history and send to email',
      'Lifetime updates to Starter features',
      'Founding Member badge and priority support'
    ],
    excludes: [
      'Team seats and shared workspace (Pro)',
      'Client folders and multi-client work (Agency)',
      'White-label output'
    ]
  }
};

module.exports = { TIERS };
