// src/config/funderAppLimits.js
//
// Applications included per funder plan, in one place.
//
// These disagreed twice on the same page: the tier cards advertised 150 / 1,000
// applications per cycle while the request form's Plan dropdown said 50 / 500,
// so a funder read two different products in one scroll.
//
// The backend is the authority. backend/routes/checkout.js falls back to 50
// (pilot) and 500 (scale), and backend/routes/webhooks/stripe.js falls back to
// 50 when a price carries no applications_allowed metadata. These values are set
// to match that, so the number published on the page is never higher than what
// the system will actually grant.
//
// If you raise these, raise the backend defaults in the same commit, or set
// applications_allowed metadata on the Stripe prices — otherwise the page starts
// promising volume the API will refuse.

export const FUNDER_APP_LIMITS = {
  pilot: 50,
  scale: 500,
};
