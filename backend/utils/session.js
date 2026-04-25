// utils/session.js
const crypto = require('crypto');
const dayjs = require('dayjs');

function generateSessionToken() {
  return crypto.randomUUID();
}

function getSessionExpiry() {
  return dayjs().add(7, 'days').toISOString();
}

module.exports = { generateSessionToken, getSessionExpiry };
