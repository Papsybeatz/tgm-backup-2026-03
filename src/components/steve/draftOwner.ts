/**
 * Whose letter is loaded on the right?
 * ----------------------------------------------------------------------------
 * The counter keeps two pieces of state that can disagree: the intake FORM and
 * the finished DRAFT. Nothing used to connect them, so a consultant could fill
 * in Client B's details while Client A's draft sat on the right — with helper
 * text saying "Edit, download or email the draft on the right". One click away
 * from emailing a funder the wrong organisation's letter.
 *
 * That is the one failure in this product that produces a client-facing
 * embarrassment rather than an error message, so the draft now records which
 * organisation it was written for and the form compares itself to it.
 *
 * The comparison is deliberately forgiving. Two names are only "different" when
 * both are present and they normalise differently — an empty draft owner (a
 * draft restored without its order, an anonymous guest session) must NEVER
 * produce a warning, because a false alarm on a correct draft teaches people to
 * ignore the real one.
 */

/**
 * Normalise an organisation name for comparison.
 *
 * Case, surrounding whitespace and runs of internal whitespace are ignored:
 * "Hope  Community Center" and "hope community center" are the same client, and
 * warning about that difference would be noise. Punctuation is left alone, so
 * "U-Smile" and "U Smile" still differ — they could genuinely be two clients.
 *
 * Anything that is not a string normalises to empty, which means "unknown"
 * rather than "some other client". Coercing it would turn `{}` into the very
 * real-looking name "[object object]" and raise a warning about it.
 */
export function normaliseOrg(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * True only when the form names a DIFFERENT organisation from the loaded draft.
 *
 * False when either side is unknown, which is the safe default: no warning is
 * better than a wrong warning.
 */
export function draftBelongsToAnotherOrg(
  formOrg: unknown,
  draftOrg: unknown,
): boolean {
  const fromForm = normaliseOrg(formOrg);
  const fromDraft = normaliseOrg(draftOrg);
  if (!fromForm || !fromDraft) return false;
  return fromForm !== fromDraft;
}
