/**
 * errorDetail — the real reason a request failed, safe to return.
 *
 * Why this exists
 * ----------------------------------------------------------------------------
 * Repeatedly this session, an endpoint logged the true cause and returned a
 * generic string to the client:
 *
 *   "The email provider rejected the message."   (real: name is missing in to)
 *   "Failed to create checkout session"          (real: No such price — wrong account)
 *   "Failed to subscribe."                       (real: bad list id)
 *
 * In every case the operator could not tell a misconfiguration from a network
 * blip without digging through logs. The reason was always known — it was just
 * thrown away at the boundary.
 *
 * This is the same defect as a swallowed promise: the system knows, and does not
 * say. Returning the reason costs nothing and turns every failure into a
 * diagnosis.
 *
 * Never returns a credential. Callers should keep their human-readable message
 * alongside this, so end users still get plain language.
 */

const SECRET_PATTERNS = [
  /sk_(?:live|test)_[A-Za-z0-9]+/g,
  /pk_(?:live|test)_[A-Za-z0-9]+/g,
  /whsec_[A-Za-z0-9]+/g,
  /rk_(?:live|test)_[A-Za-z0-9]+/g,
  /xkeysib-[A-Za-z0-9-]+/g,
  /gsk_[A-Za-z0-9]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /\beyJ[A-Za-z0-9._-]{20,}/g, // JWTs
  /\b[A-Za-z0-9_-]{40,}\b/g, // long opaque tokens
];

/** Prisma error codes carry no secrets and are worth surfacing verbatim. */
function prismaHint(error) {
  switch (error?.code) {
    case 'P2002':
      return 'unique constraint violated';
    case 'P2003':
      return 'foreign key constraint violated';
    case 'P2021':
      return 'table does not exist — a migration has not been applied';
    case 'P2022':
      return 'column does not exist — a migration has not been applied';
    case 'P1001':
      return 'cannot reach the database';
    default:
      return null;
  }
}

/**
 * @param {unknown} error
 * @param {number} [maxLength]
 * @returns {string}
 */
function errorDetail(error, maxLength = 300) {
  let text = '';

  if (error && typeof error === 'object') {
    text = String(error.message || error.error || '');
    if (!text) {
      try {
        text = JSON.stringify(error);
      } catch {
        text = String(error);
      }
    }
  } else {
    text = String(error || '');
  }

  const hint = prismaHint(error);
  if (hint) text = text ? `${text} [${hint}]` : hint;

  if (!text) text = 'No error detail available';

  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[redacted]');

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

module.exports = { errorDetail };
