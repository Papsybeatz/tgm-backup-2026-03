// middleware/rateLimit.js
// Rate limiting middleware for agent calls and uploads
const rateLimit = require('express-rate-limit');
const { createRateLimitStore } = require('../utils/rateLimitStore');

const agentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each user to 10 agent calls per minute
  // use default key generator (based on IP) to avoid IPv6 key generator issues
  message: 'Too many agent requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Steve: every turn is a paid LLM call, and the route accepts signed-out guests
// (softAuth) — so without this, an anonymous caller can spend money at will.
//
// Calibration matters here. A real conversation runs ~2-4 turns/minute; our own
// end-to-end smoke test fires ~25 turns in well under a minute. A 20/minute cap
// therefore throttled the test suite itself — the limiter was working, but it
// broke the only gate that catches real regressions. 30 sits above both.
//
// The hourly cap is the one that actually bounds sustained abuse; the per-minute
// cap stops a hot loop.
const steveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many messages to Steve. Please wait a moment and try again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Sustained-spend guard: 400 turns/hour per IP is ~100x any real user.
const steveHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 400,
  message: 'Hourly message limit reached. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public Checkmate score — the anonymous funnel wedge.
//
// This route accepts no credentials at all, and every call is a paid LLM call,
// so it needs the same treatment as the signed-out Steve routes above. Two
// limiters, doing two different jobs:
//
//   publicScoreLimiter      stops a hot loop.
//   publicScoreDailyLimiter enforces the product's own rule — Free gets
//                           FREE_SCORE_LIMIT scores, then it is a signup. An
//                           anonymous visitor should not get more than a
//                           signed-in free user.
//
// `skipFailedRequests` belongs on this limiter and nowhere else. It is the
// right answer for a short throttle: a rejected upload (wrong type, unreadable
// scan) must not burn a burst slot. It is the wrong answer for the 24-hour
// allowances below — see the note there.
const publicScoreLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skipFailedRequests: true,
  message: 'Too many scoring requests. Please wait a moment and try again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Mirrors FREE_SCORE_LIMIT in utils/scoreGate.js. Kept as a literal because
// express-rate-limit needs it at module load, and a require cycle would be the
// only way to share it.
//
// 6, not 3: Free now gets six daily uses (drafts/scoring/rewrite) so a visitor
// can stay attached to the product long enough to convert, rather than hitting
// a wall after three. Kept equal to FREE_SCORE_LIMIT by the public-score test.
// The counter is in Postgres, not in this process. This is a rule about the
// visitor, so it has to outlive a deploy and be shared by every instance —
// otherwise "six a day" becomes "six a day per restart per instance". See
// utils/rateLimitStore.js for the atomicity and fallback behaviour.
const publicScoreDailyStore = createRateLimitStore('public-score-daily');

// Deliberately NO `skipFailedRequests` on the daily limits. On a one-minute
// throttle it means "a rejected upload must not burn a burst slot"; on a
// 24-hour allowance it means "a failed request refunds the day", which makes
// the wall refundable. On a shared or carrier-NAT address another visitor's
// failed request refunds yours, and because `passOnStoreError` fails open (a
// store blip skips the increment) while a failed response still decrements, a
// transient database error could hand the day's allowance back silently. The
// allowance measures how much of the product the visitor used, so it is spent
// whether or not that particular request succeeded.
const publicScoreDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 6,
  store: publicScoreDailyStore,
  // A database blip must not refuse every visitor on the site. Failing open is
  // the deliberate choice here, and it is logged rather than silent.
  passOnStoreError: true,
  message:
    'You have used your free Checkmate scores. Create an account to keep scoring.',
  standardHeaders: true,
  legacyHeaders: false,
});

// The funnel's rewrite is the demonstration, so it is deliberately scarcer than
// scoring: one rewrite per IP per day, then the wall (Starter makes it
// unlimited). Enforced server-side — a client flag is not a limit. The shared
// publicScoreDailyLimiter still applies on top, so the rewrite also spends one
// of the visitor's six daily uses.
// Same reasoning as the daily score cap: the wall is the product promise, so
// it cannot be held in a process that is expected to be replaced.
const publicRewriteDailyStore = createRateLimitStore('public-rewrite-daily');

// Same no-refund reasoning as the daily score cap above: the wall is the
// product promise, so a failed request must not hand the day back.
const publicRewriteDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
  store: publicRewriteDailyStore,
  passOnStoreError: true,
  message:
    'You have used your free rewrite. Create an account for unlimited rewrites.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each user to 5 uploads per hour
  // use default key generator (based on IP) to avoid IPv6 key generator issues
  message: 'Too many uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Funder API intake: 5 requests per 15 minutes per IP
const funderIntakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many funder API key requests. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  agentLimiter,
  steveLimiter,
  steveHourlyLimiter,
  funderIntakeLimiter,
  publicScoreLimiter,
  publicScoreDailyLimiter,
  publicRewriteDailyLimiter,
  uploadLimiter,
  passwordResetLimiter,
};
