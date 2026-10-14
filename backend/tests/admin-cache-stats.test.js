/**
 * GET /api/admin/cache-stats
 * ----------------------------------------------------------------------------
 * The endpoint exists because the retention sweep is otherwise invisible: it
 * deletes rows older than the window, so until the first row ages out, a sweep
 * that runs perfectly and a sweep that never runs look IDENTICAL from outside.
 * Both delete nothing.
 *
 * The route is behind `requireAdmin` (the founder guard), which resolves a
 * session and a user from the database, so it cannot be exercised end to end
 * here without standing up the whole auth schema. What is checked here is the
 * part that can be pinned statically: that it is guarded, that it is strictly
 * read-only, and that it reports the fields the question needs.
 *
 * The SQL itself is NOT taken on trust — the exact query this route runs is
 * executed against a real PostgreSQL in score-cache-sweep-real-db.test.js,
 * which is the only place a real server can judge `COUNT(*)::int` and
 * `MIN("updatedAt")`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADMIN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'admin.js'),
  'utf8',
);

/** The handler body, isolated so assertions cannot be satisfied elsewhere. */
const route = ADMIN_SRC.match(
  /router\.get\('\/cache-stats',[\s\S]*?\n\}\);/,
);
assert.ok(route, 'the cache-stats route was not found in routes/admin.js');
const HANDLER = route[0];

test('the endpoint is guarded by the founder check', () => {
  assert.match(
    HANDLER,
    /router\.get\('\/cache-stats',\s*requireAdmin,/,
    'an unguarded stats route would expose the site\'s usage volume to anyone',
  );
});

test('the endpoint is strictly read-only', () => {
  // The route's whole justification is that it observes. A write here would be
  // a way to damage the cache from a monitoring page.
  assert.doesNotMatch(
    HANDLER,
    /INSERT\s+INTO|UPDATE\s+"|DELETE\s+FROM|TRUNCATE|DROP\s+TABLE/i,
    'the stats endpoint must not write anything',
  );
  // It must not call the sweep either — reporting must not change the state it
  // is reporting on.
  assert.doesNotMatch(HANDLER, /maybeSweep|\.remember\(|\.writeDatabase\(/);
});

test('the endpoint reports everything needed to answer "is it pruning?"', () => {
  for (const field of [
    'rows:',
    'oldestUpdatedAt:',
    'retentionDays:',
    'cutoff:',
    'dueForPruning:',
  ]) {
    assert.ok(HANDLER.includes(field), `the response must include ${field}`);
  }
  // The window and the interval come from the cache module rather than being
  // restated here, so the endpoint cannot drift from the sweep it describes.
  assert.match(ADMIN_SRC, /require\('\.\.\/utils\/scoreCache'\)/);
  assert.match(HANDLER, /retentionDays\(\)/);
  assert.match(HANDLER, /SWEEP_EVERY/);
});

test('the cutoff is computed the same way the sweep computes it', () => {
  // If these two ever disagree, the endpoint would report "nothing due" while
  // the sweep was busy pruning — a monitoring tool lying about its subject.
  const CACHE_SRC = fs.readFileSync(
    path.join(__dirname, '..', 'utils', 'scoreCache.js'),
    'utf8',
  );
  const sweepCutoff = /new Date\(Date\.now\(\) - retentionDays\(\) \* 24 \* 60 \* 60 \* 1000\)/;
  assert.match(CACHE_SRC, sweepCutoff, 'the sweep must compute its cutoff this way');
  assert.match(
    HANDLER,
    /new Date\(Date\.now\(\) - days \* 24 \* 60 \* 60 \* 1000\)/,
    'the endpoint must compute the same cutoff from the same window',
  );
});

test('COUNT(*) is cast to int, because BigInt does not survive JSON', () => {
  // Prisma returns COUNT(*) as a BigInt. Serialising that throws
  // "Do not know how to serialize a BigInt" and the endpoint would 500 on
  // every call — a monitoring endpoint that is always down.
  assert.match(HANDLER, /COUNT\(\*\)::int/);
});

test('the endpoint reports counts and timestamps only, never cache contents', () => {
  // The table holds the model's commentary on somebody's letter. The stats
  // endpoint must not become a way to read it.
  assert.doesNotMatch(
    HANDLER,
    /SELECT[\s\S]{0,200}?"report"/,
    'the report column must never be selected',
  );
  assert.doesNotMatch(HANDLER, /SELECT[\s\S]{0,200}?"hash"/, 'the hash must not be returned');
  assert.match(HANDLER, /SELECT COUNT\(\*\)::int AS "rows", MIN\("updatedAt"\) AS "oldestUpdatedAt"/);
});

test('a database that has never cached anything reports zero instead of failing', () => {
  // A missing table is a valid state on a fresh deployment. Returning 500 would
  // send someone chasing a problem that does not exist.
  assert.match(HANDLER, /tablePresent/);
  assert.match(HANDLER, /does not exist\|undefined table/i);
});
