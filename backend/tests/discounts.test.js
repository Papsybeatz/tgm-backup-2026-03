/**
 * Pins the annual pricing arithmetic.
 *
 * Why this exists: the yearly total used to be DERIVED from the monthly price
 * (×12, then ×0.83), which produced $288.84 for Grant Writer — a number Stripe
 * could not charge. Two surfaces of the same product then disagreed about the
 * number the customer pays. That is the same defect class as advertising a
 * feature with no code behind it.
 *
 * The yearly total is now the source of truth and the monthly-equivalent is
 * derived from it. These tests hold that direction in place, because reversing
 * it is a one-line change that looks harmless.
 *
 * The totals themselves also have to match Stripe, and they did not: the config
 * read 289 / 787 / 1484 against Stripe's 289.99 / 787.99 / 1484.99, so every
 * annual visitor was shown a price 99 cents below what the checkout charged.
 * Deriving the monthly-equivalent correctly does not help if the input is
 * wrong — the totals are pinned to the Stripe amounts for that reason.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MODULE_PATH = path.join(__dirname, '..', '..', 'src', 'config', 'discounts.js');
const discountsPromise = import(MODULE_PATH);

// The amounts Stripe charges, read from the product catalogue. A total that
// disagrees with Stripe is a page quoting a price the customer will not pay.
const SELLABLE = [
  { tier: 'Grant Writer', monthly: 29, yearly: 289.99 },
  { tier: 'Grant Consultant', monthly: 79, yearly: 787.99 },
  { tier: 'Grant Agency', monthly: 149, yearly: 1484.99 },
];

test('the yearly totals are the locked, Stripe-chargeable numbers', async () => {
  const { annualTotal } = await discountsPromise;
  for (const { tier, monthly, yearly } of SELLABLE) {
    assert.equal(annualTotal(monthly), yearly, `${tier} yearly total`);
  }
});

test('the monthly-equivalent is derived from the yearly total, not the monthly price', async () => {
  const { annualMonthlyPrice } = await discountsPromise;
  // Derived from the yearly total:
  //   289.99 / 12 = 24.1658 -> 24.17
  //   787.99 / 12 = 65.6658 -> 65.67
  //  1484.99 / 12 = 123.7492 -> 123.75
  // Deriving it the old way (monthly x 0.83) gives 24.07 and 65.57, which is
  // how the page and the checkout drifted apart in the first place.
  assert.equal(annualMonthlyPrice(29), 24.17);
  assert.equal(annualMonthlyPrice(79), 65.67);
  assert.equal(annualMonthlyPrice(149), 123.75);
});

test('the monthly-equivalent differs from the charged total only by rounding', async () => {
  const { annualMonthlyPrice, annualTotal } = await discountsPromise;
  for (const { tier, monthly } of SELLABLE) {
    const overAYear = annualMonthlyPrice(monthly) * 12;
    const charged = annualTotal(monthly);
    // Rounding the monthly-equivalent to cents can drift by at most half a cent
    // a month. Anything larger means it stopped being derived from the total.
    assert.ok(
      Math.abs(overAYear - charged) <= 0.06,
      `${tier}: 12 x ${annualMonthlyPrice(monthly)} = ${overAYear}, charged ${charged}`,
    );
  }
});

test('"Save 17%" is honest at every configured total', async () => {
  const { annualDiscountRate } = await discountsPromise;
  // The $X.99 totals put the real saving at 16.67-16.95%, so "Save 17%" is a
  // round-up at all three. It rounds to 17% at every total, which is the
  // strongest claim the label can make; if a total ever drops below 16.5% this
  // fails rather than quietly overstating the discount.
  for (const { tier, monthly } of SELLABLE) {
    const rate = annualDiscountRate(monthly);
    assert.equal(
      Math.round(rate * 100),
      17,
      `${tier}: the real saving is ${(rate * 100).toFixed(2)}%, so "Save 17%" overstates it`,
    );
  }
});

test('the real annual saving is at least 16.5%, so the label is a round-up not a fiction', async () => {
  const { annualDiscountRate } = await discountsPromise;
  for (const { tier, monthly } of SELLABLE) {
    const rate = annualDiscountRate(monthly);
    assert.ok(
      rate >= 0.165,
      `${tier}: the real saving is only ${(rate * 100).toFixed(2)}%`,
    );
  }
});

test('an unlisted monthly price still falls back to a 17% yearly total', async () => {
  const { annualTotal } = await discountsPromise;
  // $49/month has no configured total: 49 x 12 x 0.83 = 488.04 -> $488.
  assert.equal(annualTotal(49), 488);
});

test('the need-based discount is 70% off', async () => {
  const { needBasedMonthlyPrice } = await discountsPromise;
  assert.equal(needBasedMonthlyPrice(29), 8.7);
  assert.equal(needBasedMonthlyPrice(79), 23.7);
  assert.equal(needBasedMonthlyPrice(149), 44.7);
});
