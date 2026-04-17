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
      '1 workspace',
      'Limited AI generations',
      'Limited grant matches',
      'Basic templates',
      'Basic scoring'
    ]
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    priceMonthly: 19,
    priceOnce: null,
    billingType: 'recurring',
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    features: [
      'Unlimited workspaces',
      'Unlimited AI rewrites',
      '10 grant matches / month',
      'Export to PDF/Word',
      'Full scoring engine',
      'Email support'
    ]
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    priceMonthly: 49,
    priceOnce: null,
    billingType: 'recurring',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    highlight: true,
    features: [
      'Everything in Starter',
      'Unlimited grant matches',
      'Advanced templates',
      'AI Strategy Assistant',
      'Budget builder',
      '1 collaborator',
      'Priority support'
    ]
  },
  agency_starter: {
    key: 'agency_starter',
    name: 'Agency Starter',
    priceMonthly: 79,
    priceOnce: null,
    billingType: 'recurring',
    stripePriceId: process.env.STRIPE_AGENCY_STARTER_PRICE_ID || 'price_agency_starter',
    features: [
      'Everything in Pro',
      '3 team seats',
      'Client folders',
      'Client-safe workspaces',
      'Agency reporting',
      'White-label exports'
    ]
  },
  agency_unlimited: {
    key: 'agency_unlimited',
    name: 'Agency Unlimited',
    priceMonthly: 249,
    priceOnce: null,
    billingType: 'recurring',
    stripePriceId: process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID || 'price_agency_unlimited',
    features: [
      'Everything in Agency Starter',
      'Unlimited team seats',
      'Unlimited clients',
      'Admin dashboard',
      'Audit logs',
      'SLA support'
    ]
  },
  lifetime: {
    key: 'lifetime',
    name: 'Lifetime',
    priceMonthly: null,
    priceOnce: 149,
    billingType: 'one_time',
    lemonVariantId: process.env.LEMONSQUEEZY_LIFETIME_VARIANT_ID || 'LS_VARIANT_LIFETIME',
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
