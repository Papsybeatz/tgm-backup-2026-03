// middleware/rateLimit.js
// Rate limiting middleware for agent calls and uploads
const rateLimit = require('express-rate-limit');

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
  uploadLimiter,
  passwordResetLimiter,
};
