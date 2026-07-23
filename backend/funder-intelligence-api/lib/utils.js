const crypto = require('crypto');

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const text = normalizeText(value);
  if (!text) return [];
  return text.split(' ').filter((token) => token.length > 2);
}

function keywordCoverage(needles, haystack) {
  const uniqueNeedles = [...new Set(tokenize(needles))];
  const hayTokens = new Set(tokenize(haystack));
  if (!uniqueNeedles.length) return 0;
  const hits = uniqueNeedles.reduce((count, token) => (hayTokens.has(token) ? count + 1 : count), 0);
  return hits / uniqueNeedles.length;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function createApiKey() {
  return `tgm_fi_${crypto.randomBytes(24).toString('hex')}`;
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

module.exports = {
  average,
  clamp,
  createApiKey,
  createId,
  keywordCoverage,
  normalizeText,
  parseNumber,
  toArray,
  tokenize,
};
