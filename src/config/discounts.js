/**
 * Discount policy — the single source of truth.
 * ----------------------------------------------------------------------------
 * Two discounts, deliberately simple ("no complications"):
 *
 *   1. ANNUAL_DISCOUNT — paying yearly saves ~17%. The same "Save 17%" anchor
 *      Grantable publishes; Instrumentl sits near 14%. Shown as a
 *      Monthly/Annual toggle with annual preselected.
 *
 *   2. NEED_BASED_DISCOUNT — 70% off for organizations with an annual operating
 *      budget under $300,000. Self-attested at checkout (a checkbox), not a
 *      document upload. Applied as a Stripe coupon so it stacks with the annual
 *      discount and needs no schema change.
 *
 * Nothing here talks to Stripe. The pricing page reads these to render copy and
 * Stage 2 maps them to coupon IDs; keeping the numbers in one place is what
 * stops the page and the checkout from disagreeing.
 */

/**
 * The advertised annual saving. It drives the "Save 17%" label and is the
 * fallback for a monthly price with no configured yearly total.
 *
 * It is a LABEL, not the arithmetic. Yearly totals are set directly (see
 * ANNUAL_TOTALS), and because Stripe holds $X.99 totals the real saving lands
 * at 16.67–16.95% — which still rounds to 17% at every configured total, but
 * never assume annualTotal() is monthly × 12 × 0.83.
 */
export const ANNUAL_DISCOUNT = 0.17;

/**
 * Annual prices, as YEARLY TOTALS. These are the source of truth.
 *
 * These are the amounts Stripe actually charges, read from the Stripe product
 * catalogue on 2026-10-10. They must stay in step with Stripe: the page renders
 * from here, so a total that differs from the Stripe price is a page quoting a
 * number the customer will not be charged. That is exactly what happened when
 * these read 289 / 787 / 1484 against Stripe's 289.99 / 787.99 / 1484.99.
 *
 * Deriving the yearly total from the monthly price is the other way to drift:
 * 17% off $29/month is $288.84, a number Stripe could not charge. Setting the
 * yearly total directly and deriving the monthly-equivalent from it keeps the
 * page and the checkout to the cent.
 *
 * Keyed by the monthly price, because that is what the pricing page holds.
 * Changing a monthly price means adding its yearly total here, or the fallback
 * below will quietly re-derive one.
 */
export const ANNUAL_TOTALS = {
  29: 289.99, // Grant Writer
  79: 787.99, // Grant Consultant
  149: 1484.99, // Grant Agency
};

export const NEED_BASED_DISCOUNT = {
  rate: 0.7,
  budgetCeiling: 300000,
  label: 'Organizations with an annual budget under $300,000 save 70%',
  attestation:
    'Our organization’s annual operating budget is under $300,000.',
};

/** Round to cents so a rendered price never shows float dust. */
const toCents = (value) => Math.round(value * 100) / 100;

/**
 * The yearly total for a monthly price.
 *
 * A configured total always wins. Anything else falls back to 17% off rounded
 * to whole dollars, so an unlisted price is still approximately right rather
 * than silently absent.
 */
export function annualTotal(monthly) {
  const configured = ANNUAL_TOTALS[monthly];
  if (typeof configured === 'number') return configured;
  return Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT));
}

/**
 * Monthly-equivalent price when billed annually.
 *
 * DERIVED from the yearly total, never from the monthly price, so it can never
 * drift from what Stripe charges.
 */
export function annualMonthlyPrice(monthly) {
  return toCents(annualTotal(monthly) / 12);
}

/**
 * The real annual saving as a fraction (0.1695 for Grant Writer), so the
 * "Save 17%" label can be checked rather than trusted.
 */
export function annualDiscountRate(monthly) {
  const full = monthly * 12;
  if (!full) return 0;
  return 1 - annualTotal(monthly) / full;
}

/** Monthly price after the need-based discount. */
export function needBasedMonthlyPrice(monthly) {
  return toCents(monthly * (1 - NEED_BASED_DISCOUNT.rate));
}
