/**
 * Criteria-level score delta.
 * ----------------------------------------------------------------------------
 * The free funnel's hook is watching the score move, and a bare total is not
 * credible: one number rising reads as "you graded your own homework". The
 * breakdown is what makes it a measurement, so this always returns movement per
 * criterion as well as the total.
 *
 * Kept as a pure function so it can be tested without an HTTP request or a
 * database, and so the route file stays about transport.
 */
const { ORDERLESS_CRITERIA } = require('../agents/steve/scoring');

/**
 * @param {object} before  a scoreDraft report (score, criteria, criteriaDefs)
 * @param {object} after   a scoreDraft report
 * @returns {{total:number, byCriterion:Array<{key:string,label:string,from:number,to:number,delta:number}>}}
 */
function buildCriteriaDelta(before = {}, after = {}) {
  const defs = before.criteriaDefs || after.criteriaDefs || ORDERLESS_CRITERIA;
  const byCriterion = defs.map(({ key, label }) => {
    const from = Number(before.criteria?.[key] ?? 0);
    const to = Number(after.criteria?.[key] ?? 0);
    return { key, label, from, to, delta: to - from };
  });
  return {
    total: Number(after.score ?? 0) - Number(before.score ?? 0),
    byCriterion,
  };
}

module.exports = { buildCriteriaDelta };
