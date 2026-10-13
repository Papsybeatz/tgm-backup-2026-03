/**
 * Server-side analytics — the one funnel event the browser cannot be trusted
 * with.
 * ----------------------------------------------------------------------------
 * Seven of the eight funnel events are client-side, because they describe what
 * a visitor did on a page. `subscribed` is different: it is a claim about
 * revenue, and the browser is the worst possible witness. Firing it from the
 * post-checkout page would count everyone who reached that page — including
 * anyone who abandoned the payment — and inflate the only number that decides
 * anything.
 *
 * So it fires here, from the Stripe webhook, at the moment the tier is actually
 * granted. This is the same place access is given, which makes it the only
 * honest source.
 *
 * WHY THERE IS NO SDK
 *
 * PostHog's capture endpoint is a plain HTTPS POST, so this needs no dependency
 * and no bundle. It is also deliberately fire-and-forget: the webhook grants
 * paid access, and analytics must never be able to fail a payment. Every path
 * here resolves; nothing throws.
 *
 * THE PRIVACY RULE
 *
 * The webhook is holding an email address and a Stripe customer id at the call
 * site. Neither may leave. `sanitizeProps` is an allowlist with a redundant
 * forbidden-key pass and primitive-only values — the same rule as the client
 * module in src/lib/analytics.js, duplicated because that one is an ES module
 * that reads Vite's `import.meta.env` and cannot be required from Node.
 * `tests/server-analytics-privacy.test.js` pins both copies to the same rule.
 *
 * Inert without POSTHOG_API_KEY, which is the intended default: wiring the
 * event should not require having configured a provider.
 */

const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || '';

const ALLOWED_PROPS = new Set([
  'score',
  'words',
  'band',
  'delta',
  'fromScore',
  'toScore',
  'fromBand',
  'toBand',
  'source',
  'reason',
  'priceId',
  'context',
  'step',
  'outcome',
  'tier',
]);

const FORBIDDEN_KEY =
  /letter|draft|content|text|body|email|mail|filename|file|name|message|prompt|completion|response|token|address|phone|password/i;

const MAX_STRING_LENGTH = 64;
const MAX_STRING_WORDS = 6;
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/**
 * Allowed string values are tokens, not text — the same rule as the client
 * copy in src/lib/analytics.js. A value survives only if it reads like a label:
 * short, single-line, few words, and not an address. Anything else is dropped
 * rather than truncated.
 */
function safeString(value) {
  if (typeof value !== 'string') return null;
  if (EMAIL_LIKE.test(value)) return null;
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;
  if (collapsed.length > MAX_STRING_LENGTH) return null;
  if (collapsed.split(' ').length > MAX_STRING_WORDS) return null;
  return collapsed;
}

/**
 * Reduce any caller-supplied object to something safe to transmit.
 *
 * The webhook has `email` and `customerId` in scope a few lines from the call
 * site. This is what stops them being passed by accident.
 */
function sanitizeProps(props) {
  const clean = {};
  if (!props || typeof props !== 'object') return clean;

  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(key)) continue;
    if (FORBIDDEN_KEY.test(key)) continue;
    if (value === null || value === undefined) continue;

    if (typeof value === 'number') {
      if (Number.isFinite(value)) clean[key] = value;
      continue;
    }
    if (typeof value === 'boolean') {
      clean[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      const safe = safeString(value);
      if (safe !== null) clean[key] = safe;
    }
    // Objects, arrays, functions: dropped.
  }

  return clean;
}

/**
 * Send one event. Resolves to a boolean; never rejects.
 *
 * @param {object} params
 * @param {string} params.event
 * @param {string} params.distinctId  pseudonymous — a database id, never an email
 * @param {object} [params.properties]
 */
async function captureEvent({ event, distinctId, properties }) {
  if (!event || !distinctId || !POSTHOG_API_KEY) return false;

  try {
    const res = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        distinct_id: String(distinctId).slice(0, MAX_STRING_LENGTH),
        properties: sanitizeProps(properties),
        timestamp: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    // Deliberately swallowed — see the header. A failed event must not surface
    // anywhere near the code path that grants paid access.
    return false;
  }
}

/**
 * Funnel step 8: a subscription actually became active.
 *
 * @param {object} params
 * @param {number|string} params.userId  the account that was granted access
 * @param {string} params.tier           the internal tier key
 * @param {string} [params.priceId]      Stripe price id, not personal data
 * @param {string} [params.interval]     'monthly' | 'annual' | 'one_time'
 * @param {string} [params.context]      e.g. 'checkout'
 */
async function trackSubscribed({ userId, tier, priceId, interval, context }) {
  if (!userId) return false;
  return captureEvent({
    event: 'subscribed',
    distinctId: `user_${userId}`,
    properties: { tier, priceId, interval, context },
  });
}

module.exports = {
  captureEvent,
  trackSubscribed,
  sanitizeProps,
  ALLOWED_PROPS,
  // Exported so the parity test can prove this copy and the client copy are
  // still the same policy rather than two that have quietly diverged.
  FORBIDDEN_KEY,
};
