// backend/utils/logger.js
//
// DEPRECATED — kept only so existing imports keep resolving.
//
// This used to own a 200-entry in-memory ring buffer. It was lost on every
// Railway restart, was not shared across instances, and only four AI routes
// ever wrote to it, while the persisted ErrorLog table sat empty. Everything
// now goes through utils/logging.js and lands in the database.
//
// New code should import from './logging' directly.

const { logError, logAiAction } = require('./logging');

module.exports = { logError, logAiAction };
