// utils/sanitize.js
// Input sanitization utility for Grants Master SaaS
// Strips HTML, escapes special chars, validates email, enforces max length

const validator = require('validator');

function stripHtml(input) {
  return validator.stripLow(validator.escape(validator.whitelist(input, 'a-zA-Z0-9@._- ')));
}

function sanitizeInput(input, maxLength = 256) {
  let sanitized = stripHtml(input);
  sanitized = sanitized.substring(0, maxLength);
  return sanitized;
}

function validateEmail(email) {
  return validator.isEmail(email) && email.length <= 256;
}

module.exports = {
  sanitizeInput,
  validateEmail,
};
