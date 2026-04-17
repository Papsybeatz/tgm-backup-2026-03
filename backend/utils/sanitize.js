// utils/sanitize.js
// Input sanitization utility for Grants Master SaaS
// Strips HTML, escapes special chars, validates email, enforces max length

const validator = require('validator');

function stripHtml(input) {
  if (!input) return '';
  return validator.escape(input).replace(/[<>]/g, '');
}

function sanitizeInput(input, maxLength = 256) {
  if (!input) return '';
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
