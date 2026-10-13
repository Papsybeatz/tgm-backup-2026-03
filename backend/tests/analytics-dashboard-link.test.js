/**
 * The ops dashboard links to the funnel; it does not absorb it.
 * ----------------------------------------------------------------------------
 * /admin/monitoring is operational — named accounts, failure logs, what is on
 * fire. The funnel is behavioural and anonymous. They stay two systems, one
 * click apart, and this file pins the "one click apart" and the "two systems"
 * halves separately, because either one alone is easy to satisfy and the pair
 * is the actual decision.
 *
 * The URL rule is tested through the real client module, loaded as ESM the same
 * way analytics-privacy.test.js does it — `import.meta.env` is undefined under
 * Node, so the helper takes its raw value as a parameter.
 *
 * Run: cd backend && node --test tests/analytics-dashboard-link.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', '..');
const CLIENT_SRC = path.join(ROOT, 'src', 'lib', 'analytics.js');
const DASHBOARD_SRC = fs.readFileSync(
  path.join(ROOT, 'src', 'pages', 'MonitoringDashboard.jsx'),
  'utf8'
);

async function loadClientModule() {
  const source = fs.readFileSync(CLIENT_SRC, 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgm-dash-'));
  const file = path.join(dir, 'analytics.mjs');
  fs.writeFileSync(file, source, 'utf8');
  return import(pathToFileURL(file).href);
}

// ---------------------------------------------------------------------------
// The URL rule
// ---------------------------------------------------------------------------

test('no configured URL means no link, not a broken one', async () => {
  const { analyticsDashboardUrl } = await loadClientModule();

  // A link to a project nobody has set up looks like a working control and
  // lands on an empty page. Absence has to be representable.
  assert.equal(analyticsDashboardUrl(undefined), null);
  assert.equal(analyticsDashboardUrl(null), null);
  assert.equal(analyticsDashboardUrl(''), null);
  assert.equal(analyticsDashboardUrl('   '), null);
  assert.equal(analyticsDashboardUrl(42), null);
  assert.equal(analyticsDashboardUrl({}), null);
});

test('a configured URL is returned as a usable href', async () => {
  const { analyticsDashboardUrl } = await loadClientModule();

  assert.equal(
    analyticsDashboardUrl('https://us.posthog.com/project/12345/insights/abcdef'),
    'https://us.posthog.com/project/12345/insights/abcdef'
  );
  assert.equal(
    analyticsDashboardUrl('https://eu.posthog.com/project/9/dashboard/7'),
    'https://eu.posthog.com/project/9/dashboard/7'
  );
});

test('only http and https survive — an admin page must not render a script href', async () => {
  const { analyticsDashboardUrl } = await loadClientModule();

  // This value comes from a build-time env var. A typo should degrade to "no
  // link", never to an anchor that executes.
  assert.equal(analyticsDashboardUrl('javascript:alert(1)'), null);
  assert.equal(analyticsDashboardUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(analyticsDashboardUrl('file:///etc/passwd'), null);
  assert.equal(analyticsDashboardUrl('not a url at all'), null);
});

test('a query string and hash survive intact', async () => {
  const { analyticsDashboardUrl } = await loadClientModule();

  const url = analyticsDashboardUrl(
    'https://us.posthog.com/project/1/insights/x?date_from=-7d&filters=abc#top'
  );
  assert.match(url, /date_from=-7d/);
  assert.match(url, /#top$/);
});

// ---------------------------------------------------------------------------
// One click apart
// ---------------------------------------------------------------------------

test('the dashboard renders a link built from the helper, not a hardcoded URL', () => {
  assert.match(
    DASHBOARD_SRC,
    /import \{ analyticsDashboardUrl \} from '\.\.\/lib\/analytics'/,
    'the link target must come from the one place that owns the config'
  );
  assert.match(DASHBOARD_SRC, /const funnelUrl = analyticsDashboardUrl\(\)/);
  assert.match(DASHBOARD_SRC, /href=\{funnelUrl\}/, 'the anchor must use it');
  assert.ok(
    !/https:\/\/[a-z.]*posthog\.com/.test(DASHBOARD_SRC),
    'no hardcoded PostHog URL — the project lives in configuration, not in code'
  );
});

test('the link opens safely in a new tab', () => {
  assert.match(DASHBOARD_SRC, /target="_blank"/);
  assert.match(
    DASHBOARD_SRC,
    /rel="noopener noreferrer"/,
    'target=_blank without noopener hands the opener to the linked page'
  );
});

test('an unconfigured dashboard says what to set instead of showing a dead link', () => {
  assert.match(DASHBOARD_SRC, /funnelUrl \?/, 'the link must be conditional');
  assert.match(
    DASHBOARD_SRC,
    /VITE_POSTHOG_PROJECT_URL/,
    'the operator has to be told which variable is missing'
  );
  assert.match(DASHBOARD_SRC, /VITE_POSTHOG_KEY/);
});

// ---------------------------------------------------------------------------
// Two systems
// ---------------------------------------------------------------------------

test('the ops dashboard links out and records nothing itself', async () => {
  // The admin page must not fire funnel events: those describe anonymous
  // visitors, and this page is behind a founder guard with named accounts on
  // screen. Importing the URL helper is fine; calling track() is not.
  assert.ok(
    !/\btrack\(/.test(DASHBOARD_SRC),
    'the ops dashboard must not emit funnel events'
  );
  assert.ok(
    !/FUNNEL_EVENTS/.test(DASHBOARD_SRC),
    'no funnel event names belong on the ops dashboard'
  );

  // And it must not reach into the visitor's browser identity to do it.
  assert.ok(
    !/posthog\.capture|window\.posthog/.test(DASHBOARD_SRC),
    'the dashboard must not call the provider directly'
  );
});

test('the link explains the separation rather than just linking', () => {
  // The reason the two are not merged is a privacy boundary, and an admin who
  // does not know that is one refactor away from copying the data across.
  assert.match(DASHBOARD_SRC, /no letter text, no\s+email and no file name/);
});
