/**
 * Pins the annual pricing arithmetic.
 *
 * Why this exists: the yearly total used to be DERIVED from the monthly price
 * (×12, then ×0.83), which produced $288.84 for Grant Writer. Stripe prices are
 * whole dollars, so the checkout would have charged $289 while the page rendered
 * "$288.84 billed yearly" — two surfaces of the same product disagreeing about
 * the number the customer pays. That is the same defect class as advertising a
 * feature with no code behind it.
 *
 * The yearly total is now the source of truth and the monthly-equivalent is
 * derived from it. These tests hold that direction in place, because reversing
 * it is a one-line change that looks harmless.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MODULE_PATH = path.join(__dirname, '..', '..', 'src', 'config', 'discounts.js');
const discountsPromise = import(MODULE_PATH);

const SELLABLE = [
  { tier: 'Grant Writer', monthly: 29, yearly: 289 },
  { tier: 'Grant Consultant', monthly: 79, yearly: 787 },
  { tier: 'Grant Agency', monthly: 149, yearly: 1484 },
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
  //   289 / 12 = 24.0833 -> 24.08
  //   787 / 12 = 65.5833 -> 65.58
  //  1484 / 12 = 123.6667 -> 123.67
  // Deriving it the old way (monthly x 0.83) gives 24.07 and 65.57, which is
  // how the page and the checkout drifted apart in the first place.
  assert.equal(annualMonthlyPrice(29), 24.08);
  assert.equal(annualMonthlyPrice(79), 65.58);
  assert.equal(annualMonthlyPrice(149), 123.67);
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
  for (const { tier, monthly } of SELLABLE) {
    const rate = annualDiscountRate(monthly);
    assert.equal(
      Math.round(rate * 100),
      17,
      `${tier}: the real saving is ${(rate * 100).toFixed(2)}%, so "Save 17%" overstates it`,
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
