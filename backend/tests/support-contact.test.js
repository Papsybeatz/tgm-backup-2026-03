/**
 * The support contact, in one place.
 * ----------------------------------------------------------------------------
 * The phone number used to be hardcoded four times across three pages, and the
 * email twice more. The failure that costs money is not a crash — it is updating
 * three of the four copies, shipping, and leaving the footer dialling a number
 * nobody answers for a year.
 *
 * Two properties are worth protecting:
 *
 *   1. the contact resolves from one place, and every page uses that place;
 *   2. a malformed value falls back to the working default rather than
 *      rendering `tel:undefined` — a dead support link that looks live.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const REPO = path.join(__dirname, '..', '..');
const MODULE = path.join(REPO, 'src', 'config', 'support.js');

/**
 * `src/config/support.js` reads `import.meta.env`, which only exists under Vite.
 * Copying it to a temporary `.mjs` lets Node import the real module instead of a
 * reimplementation that could drift from it.
 */
async function loadModule() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'support-'));
  const file = path.join(dir, 'support.mjs');
  fs.copyFileSync(MODULE, file);
  return import(pathToFileURL(file).href);
}

const page = (...parts) =>
  fs.readFileSync(path.join(REPO, 'src', 'components', ...parts), 'utf8');

test('an unconfigured build uses the live contact, not a blank', async () => {
  const m = await loadModule();
  const c = m.supportContact({});
  assert.equal(c.email, m.SUPPORT_EMAIL_DEFAULT);
  assert.equal(c.phone, m.SUPPORT_PHONE_DEFAULT);
  assert.equal(c.phoneDisplay, '(540) 566-9760');
  assert.equal(c.phoneHref, 'tel:+15405669760');
});

test('a configured email is used', async () => {
  const m = await loadModule();
  assert.equal(m.supportContact({ email: 'help@example.org' }).email, 'help@example.org');
});

test('a malformed email falls back instead of being rendered', async () => {
  const m = await loadModule();
  for (const bad of ['', '   ', 'not-an-email', 'a@b', '@example.org', null, 42, {}]) {
    assert.equal(
      m.supportEmail(bad),
      m.SUPPORT_EMAIL_DEFAULT,
      `"${String(bad)}" must fall back to the working default`,
    );
  }
});

test('ten digits are read as North American and get the country code', async () => {
  const m = await loadModule();
  assert.equal(m.normalizePhone('5405669760'), '+15405669760');
  assert.equal(m.normalizePhone('(540) 566-9760'), '+15405669760');
  assert.equal(m.normalizePhone('540-566-9760'), '+15405669760');
});

test('a number that already carries a country code is kept', async () => {
  const m = await loadModule();
  assert.equal(m.normalizePhone('+1 540 566 9760'), '+15405669760');
  assert.equal(m.normalizePhone('+44 20 7946 0958'), '+442079460958');
});

test('nonsense is refused rather than guessed at', async () => {
  const m = await loadModule();
  for (const bad of ['', '123', 'call me', null, undefined, '000']) {
    assert.equal(m.normalizePhone(bad), null, `"${String(bad)}" must not become a phone number`);
  }
});

test('a bad configured number falls back to the working default', async () => {
  // The point of the fallback: a mistyped VITE_SUPPORT_PHONE must not remove the
  // support link from a paid product. It silently keeps the number that works.
  const m = await loadModule();
  const c = m.supportContact({ phone: 'ask at the desk' });
  assert.equal(c.phone, m.SUPPORT_PHONE_DEFAULT);
  assert.equal(c.phoneHref, 'tel:+15405669760');
});

test('the display form is what a reader expects', async () => {
  const m = await loadModule();
  assert.equal(m.formatPhone('+15405669760'), '(540) 566-9760');
  assert.equal(m.formatPhone('+442079460958'), '+442079460958', 'non-NANP is passed through');
  assert.equal(m.formatPhone(null), '');
});

test('every page reads the shared contact instead of its own copy', () => {
  for (const file of ['TrustPage.jsx', 'AboutPage.jsx', 'LandingPage.jsx']) {
    const src = page(file);
    assert.match(
      src,
      /from '\.\.\/config\/support'/,
      `${file} must import the shared contact`,
    );
    assert.match(src, /supportContact\(\)/, `${file} must use it`);
  }
});

test('no hardcoded phone number or support email survives in the pages', () => {
  // This is the actual regression: the literals coming back one page at a time.
  for (const file of ['TrustPage.jsx', 'AboutPage.jsx', 'LandingPage.jsx']) {
    const src = page(file);
    assert.doesNotMatch(src, /tel:\+1?540/, `${file} still hardcodes a tel: link`);
    assert.doesNotMatch(src, /\b\(?540\)?[\s.-]?566[\s.-]?9760/, `${file} still hardcodes the number`);
    assert.doesNotMatch(
      src,
      /mailto:support@thegrantsmaster\.com/,
      `${file} still hardcodes the support address`,
    );
  }
});
