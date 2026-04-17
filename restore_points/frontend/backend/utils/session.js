// utils/session.js
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

function generateSessionToken() {
  return uuidv4();
}

function getSessionExpiry() {
  return dayjs().add(7, 'days').toISOString();
}

module.exports = {
  generateSessionToken,
  getSessionExpiry,
};
