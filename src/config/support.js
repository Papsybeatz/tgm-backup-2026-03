/**
 * The support contact, in one place.
 * ----------------------------------------------------------------------------
 * The phone number was hardcoded four times across three pages, and the email
 * twice more. That is the kind of duplication that survives exactly until the
 * first time you change it: update three of four copies, ship, and the footer
 * keeps dialling the old number for a year because nobody looks at the footer.
 *
 * Both values can now be overridden at build time with VITE_SUPPORT_EMAIL and
 * VITE_SUPPORT_PHONE. In Vercel these must be **Config**, not Secret — a
 * VITE_ value is inlined into the public bundle by definition, and Vercel
 * refuses to save one as Secret (see the note in docs or the PR that added
 * this). The defaults below are the current live values, so an unconfigured
 * build behaves exactly as it does today rather than breaking the contact.
 *
 * A malformed value falls back to the default instead of rendering. That is the
 * important half: `tel:` + undefined is a dead link that looks like a live one,
 * and a broken support link on a paid product is worse than an old number that
 * still works.
 */

/** Live values. Change these only if the underlying contact really changed. */
export const SUPPORT_EMAIL_DEFAULT = 'support@thegrantsmaster.com';
export const SUPPORT_PHONE_DEFAULT = '+15405669760';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The support email.
 *
 * @param {string|undefined} raw Override; defaults to the build-time variable.
 *   Taken as a parameter so the rule can be tested under Node, where
 *   `import.meta.env` does not exist.
 */
export function supportEmail(raw = import.meta.env?.VITE_SUPPORT_EMAIL) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  return EMAIL_SHAPE.test(value) ? value : SUPPORT_EMAIL_DEFAULT;
}

/**
 * A phone number as E.164 digits, or null when it cannot be one.
 *
 * Ten digits are read as North American and get the +1; anything longer is
 * assumed to already carry a country code. Returning null rather than a guess is
 * deliberate — a wrong number that dials is worse than no link at all.
 */
export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Render E.164 as the (XXX) XXX-XXXX people expect to read. */
export function formatPhone(e164) {
  const digits = String(e164 || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }
  return e164 || '';
}

/**
 * The resolved contact, ready to render.
 *
 * `phoneHref` is null when there is no usable number, so a caller can omit the
 * link rather than emit `tel:null`.
 */
export function supportContact(env = {}) {
  const email = supportEmail(
    'email' in env ? env.email : import.meta.env?.VITE_SUPPORT_EMAIL,
  );
  const rawPhone =
    'phone' in env ? env.phone : import.meta.env?.VITE_SUPPORT_PHONE;
  const phone = normalizePhone(rawPhone) || SUPPORT_PHONE_DEFAULT;

  return {
    email,
    phone,
    phoneDisplay: formatPhone(phone),
    phoneHref: phone ? `tel:${phone}` : null,
  };
}
