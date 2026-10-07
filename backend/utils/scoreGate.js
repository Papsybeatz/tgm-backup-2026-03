/**
 * Checkmate scoring gate — Model A.
 * ----------------------------------------------------------------------------
 * The paid unlock is the FIX, not the diagnosis.
 *
 * Free gets a real score, the per-criterion breakdown and the named gaps. The
 * recommended fixes are withheld until Starter+ (scoring_detailed). This is
 * what the pricing page and the marketing campaign promise ("$29 unlocks the
 * fixes"), so it is enforced here, on the server — a client-side lock is not a
 * paywall, and a signed-in free user can call the API directly.
 *
 * Free is also capped at FREE_SCORE_LIMIT scores. The count comes from the
 * AiLog table (action: 'score'), which is the product's existing usage ledger,
 * so no new table or column is needed.
 *
 * The cap is 6, not 3: Free now gets six daily uses so a visitor can stay
 * attached long enough to convert. The anonymous daily limiter in
 * middleware/rateLimit.js mirrors this number (public-score test pins them
 * equal).
 */
const { hasFeature, TIERS } = require('../middleware/tierAuth');

const FREE_SCORE_LIMIT = 6;
const SCORE_ACTION = 'score';

/**
 * Can this tier run another Checkmate score?
 *
 * @param {string} tier        the user's tier key
 * @param {number} priorScores how many scores this user has already run
 * @returns {{allowed: boolean, reason?: string, limit?: number, used: number, remaining: number}}
 */
function checkScoreQuota(tier, priorScores) {
  const used = Number.isFinite(priorScores) ? Math.max(0, Math.floor(priorScores)) : 0;

  // Mirror hasFeature(): an unrecognised tier is treated as Free rather than as
  // a paid tier, so a bad tier string cannot buy unmetered scoring.
  const effective = TIERS[tier] ? tier : 'free';

  // Paid tiers are unmetered. Only Free carries a cap.
  if (effective !== 'free') return { allowed: true, used, remaining: Infinity };

  if (used >= FREE_SCORE_LIMIT) {
    return {
      allowed: false,
      reason: 'free_score_limit',
      limit: FREE_SCORE_LIMIT,
      used,
      remaining: 0,
    };
  }

  return { allowed: true, used, remaining: FREE_SCORE_LIMIT - used };
}

/**
 * Apply the tier gate to a Checkmate report.
 *
 * Free keeps the diagnosis (score, label, criteria, weaknesses) and loses the
 * fixes. Starter+ keeps everything. `fixesLocked` lets the UI render the lock
 * without guessing from an empty array.
 */
function applyScoreGate(tier, report = {}) {
  if (hasFeature(tier, 'scoring_detailed')) {
    return { ...report, fixes: report.fixes || [], fixesLocked: false };
  }
  return { ...report, fixes: [], fixesLocked: true };
}

module.exports = { FREE_SCORE_LIMIT, SCORE_ACTION, checkScoreQuota, applyScoreGate };
