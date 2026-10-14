// middleware/rateLimit.js
// Rate limiting middleware for agent calls and uploads
const rateLimit = require('express-rate-limit');
const { createRateLimitStore } = require('../utils/rateLimitStore');

// Used by `visitorKey` below. Not decoration — see the note there.
const { ipKeyGenerator } = rateLimit;

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
/**
 * The rate-limit key for an anonymous visitor.
 *
 * express-rate-limit's default key is `req.ip`. Behind the Vercel -> Railway
 * chain that is NOT the visitor. `trust proxy: 1` (server.js) makes Express
 * return the LAST entry of `X-Forwarded-For`, which the edge appends, so the
 * key was an edge address. A production log read on 2026-10-12 showed ten
 * requests collapsing onto three keys — 84.17.44.226/.227/.229, Datacamp
 * Limited, Los Angeles, matching `x-railway-edge: lax1` — while the real client
 * sat in the first XFF entry.
 *
 * The damage was not a leak but a wall that refused strangers. A visitor's own
 * allowance was shared with everyone else routed through the same edge, so a
 * first-time visitor could be told they had already used their free score. The
 * proof was in the counter itself: two identical requests, identical headers,
 * seconds apart, came back with different resets (12209, then 76314). One
 * client cannot be on two counters unless the key is not the client.
 *
 * So key on the client. The first `X-Forwarded-For` entry is platform-set and
 * not forgeable — a probe sending `X-Forwarded-For: 203.0.113.201` produced an
 * `xff` of "<client>, <edge>" with the forged value gone, because Vercel
 * overwrites the header. `x-real-ip` carries the same address and is the
 * fallback for a deployment that sets only that; `req.ip` is the last resort.
 *
 * `ipKeyGenerator` is load-bearing. Without it a visitor with a routed IPv6
 * allocation gets a fresh key per address — a free bypass, handed out while
 * fixing a bug about keys. It normalises IPv6 to the /56 the address is
 * delegated from, and passes IPv4 through untouched.
 */
function visitorKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || '').split(',')[0];

  const candidate =
    (first || '').trim() || req.headers['x-real-ip'] || req.ip || '';

  return ipKeyGenerator(candidate);
}

const publicScoreLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: visitorKey,
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

/**
 * Did we refuse this response because of the *upload* rather than the product?
 *
 * The route marks those responses (see `rejectUpload` in routes/publicScore.js).
 * Only that mark refunds a daily hit.
 *
 * The refund has to be this narrow. Plain `skipFailedRequests` refunds on *any*
 * 4xx/5xx, which is too wide for a 24-hour allowance: a provider outage handed
 * the day back, and on a shared or carrier-NAT address another visitor's
 * failure refunded yours — and because `passOnStoreError` fails open (a store
 * blip skips the increment) while a failed response still decrements, a
 * transient database error could hand the day back silently too. Refusing
 * every refund is too harsh the other way, though: a visitor whose scan was
 * unreadable got nothing, and charging them a day for it is not the rule
 * either. A genuine failure — the rewrite engine down, an empty rewrite — is a
 * real attempt that consumed the product, so it keeps the day.
 */
function uploadWasRejected(res) {
  return res.locals?.uploadRejected === true;
}

/**
 * Did we fail the visitor through no fault of their own?
 *
 * Two cases, and both must hand the day back:
 *
 *   - the upload was refused (wrong type, unreadable scan), so they never got
 *     an attempt at all;
 *   - the scorer was at capacity, so the attempt was never made.
 *
 * Deliberately still NOT "any 4xx/5xx". A provider fault or a bug is a real
 * attempt that consumed the product and keeps the day. Widening this to every
 * failure is exactly what made the 24-hour wall refundable in the first place —
 * on a shared or carrier-NAT address, one stranger's outage handed the day back.
 * The capacity case is different in kind: we never called the model, so there is
 * nothing to charge for, and a visitor whose six scores were eaten by a busy
 * afternoon would be right to call the product broken.
 */
function responseRefundsTheDay(res) {
  return res.locals?.uploadRejected === true || res.locals?.scorerBusy === true;
}

const publicScoreDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 6,
  keyGenerator: visitorKey,
  store: publicScoreDailyStore,
  // express-rate-limit asks "was the request successful?" and refunds when the
  // answer is no. The question this wall actually needs answered is narrower —
  // "did the visitor get a real attempt?" — so a refused upload reads as
  // unsuccessful and is refunded, while a genuine failure reads as successful
  // and is not.
  skipFailedRequests: true,
  requestWasSuccessful: (_req, res) => !responseRefundsTheDay(res),
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

// Same narrow refund as the daily score cap above: only an upload we refused
// comes back, because a genuine failure is a real attempt and the wall is the
// product promise.
const publicRewriteDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
  keyGenerator: visitorKey,
  store: publicRewriteDailyStore,
  skipFailedRequests: true,
  requestWasSuccessful: (_req, res) => !responseRefundsTheDay(res),
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
  // Exported so a route can refund the day for an upload it refused, and so a
  // test can prove the refund is narrower than "any 4xx".
  uploadWasRejected,
  responseRefundsTheDay,
  // Exported so a test can prove two visitors get separate counters, and that
  // the fix is the key rather than luck.
  visitorKey,
};
