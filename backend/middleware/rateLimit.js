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
// 20/minute is far above any real conversation (~2-4 turns/min) but stops a loop.
const steveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many messages to Steve. Please wait a moment and try again.',
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
  funderIntakeLimiter,
  uploadLimiter,
  passwordResetLimiter,
};
