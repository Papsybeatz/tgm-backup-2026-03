/**
 * Discount policy — the single source of truth.
 * ----------------------------------------------------------------------------
 * Two discounts, deliberately simple ("no complications"):
 *
 *   1. ANNUAL_DISCOUNT — paying yearly saves 17%. The same "Save 17%" anchor
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

export const ANNUAL_DISCOUNT = 0.17;

export const NEED_BASED_DISCOUNT = {
  rate: 0.7,
  budgetCeiling: 300000,
  label: 'Organizations with an annual budget under $300,000 save 70%',
  attestation:
    'Our organization’s annual operating budget is under $300,000.',
};

/** Round to cents so a rendered price never shows float dust. */
const toCents = (value) => Math.round(value * 100) / 100;

/** Monthly-equivalent price when billed annually. */
export function annualMonthlyPrice(monthly) {
  return toCents(monthly * (1 - ANNUAL_DISCOUNT));
}

/** Monthly price after the need-based discount. */
export function needBasedMonthlyPrice(monthly) {
  return toCents(monthly * (1 - NEED_BASED_DISCOUNT.rate));
}

/** Yearly total when billed annually (12 × the discounted monthly). */
export function annualTotal(monthly) {
  return toCents(annualMonthlyPrice(monthly) * 12);
}
