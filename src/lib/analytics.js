/**
 * Funnel analytics for the public checkup.
 * ----------------------------------------------------------------------------
 * Eight events, in funnel order. The point is to be able to answer "where does
 * the checkup page lose people" with a number instead of an opinion — the same
 * gap that let the rate-limit wall survive three wrong diagnoses.
 *
 * THE PRIVACY RULE, AND HOW IT IS ENFORCED
 *
 * A visitor's letter is the most sensitive thing this product touches, and the
 * checkup is anonymous by design. So no payload may ever contain letter text, a
 * file name, or an email address. That is enforced here structurally, not by
 * asking callers to be careful:
 *
 *   1. `ALLOWED_PROPS` is an allowlist. A property that is not on it is dropped
 *      before anything leaves the browser, so passing `{ letterText }` is a
 *      no-op rather than a leak.
 *   2. `FORBIDDEN_KEY` is a second, redundant pass over the key name. It catches
 *      the day someone adds a plausible-looking key to the allowlist that is
 *      not safe — belt and braces, deliberately overlapping.
 *   3. Values are restricted to primitives. Objects and arrays are dropped
 *      outright: they are how a letter would realistically ride out inside an
 *      otherwise innocuous property.
 *   4. String values must be token-shaped — short, single-line, few words, not
 *      an address. `source` is an allowed key, but `source: "<whole letter>"`
 *      is dropped rather than truncated, because 64 characters of somebody's
 *      opening paragraph is still a leak.
 *
 * `tests/analytics-privacy.test.js` feeds real letter text and a real email
 * address through every event and asserts neither appears in the payload.
 *
 * WHAT IS DELIBERATELY OFF
 *
 * PostHog's autocapture and session recording are both disabled. Autocapture
 * reads DOM text, and session replay records the screen — on this page both
 * would capture the pasted letter itself, which is precisely what the rule
 * above exists to prevent. Session replay is the most tempting tool for finding
 * drop-off and it is the wrong tool here. (This contradicts the launch
 * checklist, which suggested replay before the privacy cost was clear.)
 *
 * No third-party SDK is bundled. The provider is loaded only when
 * VITE_POSTHOG_KEY is set at build time, so the events are inert until a key
 * exists rather than shipping a dependency nobody has configured.
 */

/** The eight funnel steps, in the order a visitor meets them. */
export const FUNNEL_EVENTS = {
  CHECKUP_VIEW: 'checkup_view',
  LETTER_UPLOADED: 'letter_uploaded',
  REWRITE_CLICKED: 'rewrite_clicked',
  REWRITE_SHOWN: 'rewrite_shown',
  SIGNUP_CLICKED: 'signup_clicked',
  SIGNUP_COMPLETED: 'signup_completed',
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIBED: 'subscribed',
};

/**
 * The only property names that may leave the browser.
 *
 * Every one of these is a number, a boolean, or a short controlled token. Note
 * that `score` and `words` describe the letter without containing it.
 */
export const ALLOWED_PROPS = new Set([
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

/**
 * Redundant guard over the key name. Kept even though the allowlist already
 * excludes these, because the allowlist is the thing that gets edited.
 */
export const FORBIDDEN_KEY =
  /letter|draft|content|text|body|email|mail|filename|file|name|message|prompt|completion|response|token|address|phone|password/i;

/** Long enough for a Stripe price id or a band label; far too short for prose. */
const MAX_STRING_LENGTH = 64;
/** A band label is two words ("Needs Work"). Six is generous; a letter is hundreds. */
const MAX_STRING_WORDS = 6;
/** A value that reads as an address is dropped, whatever key it arrived under. */
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/**
 * Allowed string values are tokens, not text.
 *
 * `source` and `band` are legitimately strings, which makes them the one place
 * a letter could ride out underneath a permitted key. So a value survives only
 * if it reads like a label: short, single-line, few words, and not an address.
 * Anything else is DROPPED rather than truncated — a truncated letter is still
 * a letter, and 64 characters of somebody's opening paragraph is a leak.
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

let sink = null;
let buffered = [];
let initialised = false;

/**
 * Reduce any caller-supplied object to something safe to transmit.
 *
 * Exported because the guarantee is worth testing directly, and because a
 * reviewer should be able to read the whole rule in one place.
 */
export function sanitizeProps(props) {
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
      continue;
    }
    // Objects, arrays, functions: dropped. Not an oversight.
  }

  return clean;
}

/**
 * Send one sanitised event to whichever provider is present.
 *
 * Never throws. Analytics is the least important thing on this page, and a
 * broken tracker must not be able to break a visitor's score.
 */
function emit(event, properties) {
  try {
    if (sink) {
      sink({ event, properties });
      return;
    }
    if (typeof window === 'undefined') return;

    if (typeof window.posthog?.capture === 'function') {
      window.posthog.capture(event, properties);
      return;
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, properties);
      return;
    }

    // Provider not loaded yet (or not configured). Hold a few events so a slow
    // script tag does not cost the first page view.
    buffered.push({ event, properties });
    if (buffered.length > 50) buffered.shift();
  } catch {
    // Deliberately swallowed.
  }
}

/**
 * Record a funnel step.
 *
 * @param {string} event  one of FUNNEL_EVENTS
 * @param {object} [props] must survive `sanitizeProps`; anything else is dropped
 */
export function track(event, props) {
  if (!event) return;
  emit(event, sanitizeProps(props));
}

/**
 * Where the funnel lives, for the ops dashboard to link to.
 *
 * Returns null when nothing is configured. A link to a project nobody has set up
 * is worse than no link: it looks like a working control and lands on an empty
 * page. The parameter exists so the rule can be tested — `import.meta.env` is
 * undefined under Node, so the default is not reachable from a test.
 *
 * The scheme check is not paranoia about our own build: this value comes from a
 * build-time environment variable, and a mistyped `javascript:` URL rendered
 * into an anchor is a script-execution vector on an admin page.
 */
export function analyticsDashboardUrl(
  raw = import.meta.env?.VITE_POSTHOG_PROJECT_URL
) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Test seam: capture payloads instead of sending them. Pass null to reset. */
export function setAnalyticsSink(fn) {
  sink = typeof fn === 'function' ? fn : null;
}

/** Test seam: read and clear the pre-provider buffer. */
export function drainBufferedEvents() {
  const pending = buffered;
  buffered = [];
  return pending;
}

/**
 * Load the provider, if one is configured. Safe to call more than once.
 *
 * Autocapture and session recording are off on purpose — see the header.
 */
export function initAnalytics() {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;

  const key = import.meta.env?.VITE_POSTHOG_KEY;
  if (!key || typeof window.posthog !== 'undefined') return;

  const host = import.meta.env?.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

  try {
    const script = document.createElement('script');
    script.async = true;
    script.src = `${host}/static/array.js`;
    script.onload = () => {
      try {
        if (typeof window.posthog?.init !== 'function') return;
        window.posthog.init(key, {
          api_host: host,
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          disable_session_recording: true,
          person_profiles: 'identified_only',
        });
        drainBufferedEvents().forEach(({ event, properties }) => {
          window.posthog.capture(event, properties);
        });
      } catch {
        // Swallowed: a failed provider must not surface to a visitor.
      }
    };
    document.head.appendChild(script);
  } catch {
    // Swallowed.
  }
}
