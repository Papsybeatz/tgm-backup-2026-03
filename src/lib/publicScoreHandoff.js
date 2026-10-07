/**
 * Carries a Checkmate result from the anonymous /checkup funnel into /signup.
 * ----------------------------------------------------------------------------
 * The unlock click is the conversion event. Before this existed, a visitor who
 * had just earned a score arrived at a blank signup form and the result — the
 * only reason they were there — evaporated.
 *
 * Two deliberate choices:
 *
 *   1. sessionStorage, not the URL. Six criteria plus gaps and strengths do not
 *      fit a query string, and a score in the URL is tamperable and looks like
 *      spam when the link gets shared.
 *   2. The payload holds ONLY derived output the visitor already saw. The
 *      uploaded document is never written here — that promise is the whole
 *      reason a consultant would trust this page with a client's proposal.
 *
 * Session-scoped, so it dies with the tab. A stale handoff is discarded rather
 * than shown against a fresh signup.
 */

const HANDOFF_KEY = 'tgm:public-score-handoff';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const PAYLOAD_VERSION = 1;

function storage() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null; // private mode / storage disabled
  }
}

export function savePublicScoreHandoff(report) {
  const store = storage();
  if (!store || !report || typeof report.score !== 'number') return false;

  const payload = {
    v: PAYLOAD_VERSION,
    at: Date.now(),
    score: report.score,
    label: report.label || null,
    criteria: report.criteria || null,
    criteriaDefs: Array.isArray(report.criteriaDefs) ? report.criteriaDefs : null,
    evidenceFloorApplied: report.evidenceFloorApplied === true,
    missingComponents: Array.isArray(report.missingComponents)
      ? report.missingComponents.slice(0, 6)
      : [],
    strengths: Array.isArray(report.strengths) ? report.strengths.slice(0, 5) : [],
    fileName: report.fileName || null,
    words: typeof report.words === 'number' ? report.words : null,
    style: report.style || null,
  };

  try {
    store.setItem(HANDOFF_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function readPublicScoreHandoff() {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(HANDOFF_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== PAYLOAD_VERSION) return null;
    if (typeof parsed.score !== 'number') return null;

    if (typeof parsed.at !== 'number' || Date.now() - parsed.at > MAX_AGE_MS) {
      store.removeItem(HANDOFF_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPublicScoreHandoff() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(HANDOFF_KEY);
  } catch {
    /* nothing to clean up */
  }
}

export { HANDOFF_KEY };
