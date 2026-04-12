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

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each user to 5 uploads per hour
  // use default key generator (based on IP) to avoid IPv6 key generator issues
  message: 'Too many uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  agentLimiter,
  uploadLimiter,
};
