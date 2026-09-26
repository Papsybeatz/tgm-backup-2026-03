/**
 * Steve mode — kill switch
 * ----------------------------------------------------------------------------
 * Lets us flip between the new concierge panel and the original assistant
 * panel without a code revert or a redeploy.
 *
 * Resolution order (first match wins):
 *   1. ?steve=legacy | ?steve=concierge  — sticky; remembered in localStorage
 *   2. localStorage.steveMode
 *   3. import.meta.env.VITE_STEVE_MODE   — build-time default
 *   4. 'concierge'
 *
 * To revert instantly in production without touching code, append
 * `?steve=legacy` to any dashboard URL.
 */
export type SteveMode = 'concierge' | 'legacy';

const STORAGE_KEY = 'steveMode';

function isMode(value: unknown): value is SteveMode {
  return value === 'concierge' || value === 'legacy';
}

export function resolveSteveMode(): SteveMode {
  if (typeof window !== 'undefined') {
    try {
      const fromQuery = new URLSearchParams(window.location.search).get('steve');
      if (isMode(fromQuery)) {
        window.localStorage.setItem(STORAGE_KEY, fromQuery);
        return fromQuery;
      }
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isMode(stored)) return stored;
    } catch {
      /* private mode / storage disabled — fall through to env */
    }
  }

  const envValue = (import.meta as any)?.env?.VITE_STEVE_MODE;
  return isMode(envValue) ? envValue : 'concierge';
}

/** Escape hatch for support: clear the sticky override. */
export function clearSteveModeOverride() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
