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
      'API access (future)',
      'Dedicated success manager',
      'Quarterly strategy reviews',
      'Early access to new features'
    ]
  },
  lifetime: {
    key: 'lifetime',
    name: 'Lifetime',
    priceMonthly: null,
    priceOnce: 149,
    billingType: 'one_time',
    stripePriceId: process.env.STRIPE_LIFETIME_PRICE_ID || 'price_1TXrTl64TrQMI3mIKgqoP3iL',
    features: [
      'All Pro features',
      'Lifetime updates',
      'Lifetime AI access',
      'Lifetime templates & scoring',
      'Priority support',
      'Lifetime Member badge'
    ]
  }
};

module.exports = { TIERS };
