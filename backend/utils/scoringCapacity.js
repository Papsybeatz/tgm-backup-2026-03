/**
 * What the free funnel does when the model provider is at capacity.
 * ----------------------------------------------------------------------------
 * Groq's on-demand ceiling is 8,000 tokens per minute. A single scoring call
 * carries the letter, the rubric, and the response, so roughly two to four NEW
 * letters per minute is the real ceiling for the whole site. The score cache
 * absorbs repeat letters, which hides this while testing with one document and
 * exposes it the moment real traffic arrives with new ones.
 *
 * What used to happen, traced through the code:
 *
 *   llm.js retries a rate limit twice per model, capped at 15s a wait
 *   (MAX_RATE_LIMIT_RETRIES = 2, MAX_WAIT_MS = 15000), then falls through to the
 *   next of three models, each with its own budget. Worst case that is ~90
 *   seconds of sleeping, plus request time — and the Vercel -> Railway proxy
 *   will very likely cut the connection first, so the visitor does not even get
 *   our JSON. When they do, it is a 500 saying "Scoring failed. Please try
 *   again." — indistinguishable from a crash, and it silently spent one of
 *   their six daily scores.
 *
 * That is the worst of both worlds: a long wait followed by a misleading
 * failure that also costs the visitor something.
 *
 * THE DECISION: fail fast and honestly, do not queue.
 *
 * A queue was the other candidate and it is the wrong one here, for a reason
 * that is not about effort: queuing means holding the letter somewhere until a
 * slot frees. In-process is lost on redeploy and not shared across instances;
 * durable means writing the document to a database. Either way the checkup page
 * would be lying when it says the file is read in memory and discarded — and
 * that promise is on the page, before the upload, on purpose.
 *
 * The overload is also transient by construction: the ceiling is per MINUTE, so
 * the condition clears itself in under sixty seconds. Building durable
 * infrastructure for a sub-minute condition, at the cost of the product's
 * central privacy claim, is a bad trade.
 *
 * So instead: shed load at the door, tell the truth, and refund the attempt.
 * A visitor gets an answer in about a second instead of a ninety-second hang.
 */

/** How many public scoring calls may be in flight at once, per instance. */
const DEFAULT_MAX_CONCURRENT = 2;

/** How long to tell the visitor to wait. The provider's window is one minute. */
const DEFAULT_RETRY_AFTER_SECONDS = 20;

/**
 * Provider errors that mean "too much traffic right now", not "broken".
 *
 * Matched against the assembled failure text, because llm.js reports every
 * attempt joined together rather than only the last one.
 */
const RATE_LIMIT_SIGNATURE = /rate.?limit|too many requests|\b429\b|try again in/i;

let inFlight = 0;
let maxConcurrent = DEFAULT_MAX_CONCURRENT;

/** Signals "we are at capacity", as distinct from "something is broken". */
class ScorerBusyError extends Error {
  constructor(retryAfterSeconds = DEFAULT_RETRY_AFTER_SECONDS) {
    super('SCORER_BUSY');
    this.name = 'ScorerBusyError';
    this.code = 'SCORER_BUSY';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function isScorerBusyError(error) {
  return error?.code === 'SCORER_BUSY';
}

/**
 * How long the provider asked us to wait, in seconds.
 *
 * Groq says "try again in 2.5s". llm.js already parses this to decide its own
 * retries; here it is only used to tell the visitor something truthful.
 */
function retryAfterSecondsFromMessage(message) {
  const match = String(message || '').match(/try again in ([\d.]+)\s*s/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  // Round up and add a beat: the window is a minute boundary, not a countdown.
  return Math.min(Math.ceil(seconds) + 2, 60);
}

/**
 * Read a thrown provider error and say whether it is capacity or breakage.
 *
 * @returns {{busy: boolean, retryAfterSeconds: number|null}}
 */
function classifyProviderError(error) {
  const message = String(error?.message || error || '');
  if (!RATE_LIMIT_SIGNATURE.test(message)) {
    return { busy: false, retryAfterSeconds: null };
  }
  return {
    busy: true,
    retryAfterSeconds:
      retryAfterSecondsFromMessage(message) || DEFAULT_RETRY_AFTER_SECONDS,
  };
}

/**
 * Run `fn` if there is capacity, or throw ScorerBusyError immediately.
 *
 * This is load SHEDDING, not scheduling. It exists so that the fourth visitor
 * in a burst gets a one-second honest answer rather than joining a pile that
 * all time out together. It deliberately does not wait for a slot: waiting is
 * how you turn a fast refusal into a slow one.
 *
 * Per instance, so the real limit is replicas x maxConcurrent. That is fine for
 * a shed — this protects the provider from a herd, it is not a correctness
 * mechanism. A global, priority-aware version (so anonymous traffic cannot
 * starve paying customers on the same shared ceiling) is a separate job.
 */
async function withScoringSlot(fn) {
  if (inFlight >= maxConcurrent) {
    throw new ScorerBusyError();
  }
  inFlight += 1;
  try {
    return await fn();
  } finally {
    // A leaked slot would permanently shrink capacity, so this is in a finally
    // rather than on the happy path.
    inFlight -= 1;
  }
}

/** Test seams. */
function __setMaxConcurrent(value) {
  maxConcurrent = Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_CONCURRENT;
}
function __inFlight() {
  return inFlight;
}

module.exports = {
  ScorerBusyError,
  isScorerBusyError,
  classifyProviderError,
  withScoringSlot,
  retryAfterSecondsFromMessage,
  DEFAULT_MAX_CONCURRENT,
  DEFAULT_RETRY_AFTER_SECONDS,
  __setMaxConcurrent,
  __inFlight,
};
