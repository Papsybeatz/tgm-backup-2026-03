/**
 * The funder sidecar's datastore must not lose data silently.
 * ----------------------------------------------------------------------------
 * The datastore is a JSON file. On Railway that file lives on the CONTAINER's
 * filesystem, which is discarded on every deploy — so registered funders, org
 * API keys, cycles and entitlements all vanish on a routine redeploy.
 *
 * The real fix is a mounted volume, which is a deployment setting rather than a
 * code change. What these tests protect is the part code owns:
 *
 *   1. the path is settable, so a volume can be pointed at;
 *   2. the ephemeral case is LOUD — at boot, and on /health — because the
 *      failure is otherwise silent and the symptom (a customer's key stops
 *      working after an unrelated deploy) is very hard to read backwards.
 *
 * Env-dependent behaviour is exercised in a child process: the module resolves
 * its path once at load, so it has to be required with the environment already
 * set. Testing it by mutating process.env mid-run would prove nothing about
 * production.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const SIDECAR_DIR = path.join(__dirname, '..', 'funder-intelligence-api');

/** Require the datastore in a fresh process with `env`, and print persistenceInfo(). */
function persistenceUnder(env) {
  const script = `
    const { persistenceInfo } = require(${JSON.stringify(path.join(SIDECAR_DIR, 'lib', 'datastore.js'))});
    process.stdout.write(JSON.stringify(persistenceInfo()));
  `;
  const out = execFileSync(process.execPath, ['-e', script], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

test('with no path configured, the datastore reports itself as ephemeral', () => {
  const info = persistenceUnder({ SIDECAR_DB_DIR: '', SIDECAR_DB_PATH: '' });
  assert.equal(info.mode, 'ephemeral');
  assert.equal(info.durable, false, 'the default must not claim to be durable');
  // The default sits inside the app tree, which is exactly why it does not
  // survive a container replacement.
  assert.ok(
    info.path.includes(path.join('funder-intelligence-api', 'data')),
    `the default path should be inside the app tree, got ${info.path}`,
  );
});

test('SIDECAR_DB_DIR points the whole datastore at a mount path', () => {
  const info = persistenceUnder({ SIDECAR_DB_DIR: '/data', SIDECAR_DB_PATH: '' });
  assert.equal(info.mode, 'configured');
  assert.equal(info.durable, true);
  assert.equal(info.path, path.join('/data', 'sidecar-db.json'));
});

test('SIDECAR_DB_PATH overrides the file itself', () => {
  const info = persistenceUnder({
    SIDECAR_DB_DIR: '/data',
    SIDECAR_DB_PATH: '/mnt/volume/funder-db.json',
  });
  assert.equal(info.durable, true);
  assert.equal(info.path, '/mnt/volume/funder-db.json');
});

test('a configured path creates its own directory, not the default one', () => {
  // The bug this guards: `mkdir(dataDir)` with a configured file path elsewhere
  // would create the wrong directory and every write would fail with ENOENT —
  // turning a persistence fix into a total outage.
  const src = fs.readFileSync(path.join(SIDECAR_DIR, 'lib', 'datastore.js'), 'utf8');
  assert.match(
    src,
    /mkdir\(path\.dirname\(databasePath\)/,
    'ensureDatabase must create the directory of the RESOLVED path',
  );
  assert.doesNotMatch(
    src,
    /mkdir\(dataDir/,
    'it must not create the default directory when a path was configured',
  );
});

test('/health reports the persistence mode, so the answer needs no log access', () => {
  // Reading a boot log only happens after the loss. /health makes the same
  // answer visible from a browser.
  const app = fs.readFileSync(path.join(SIDECAR_DIR, 'app.js'), 'utf8');
  assert.match(app, /require\('\.\/lib\/datastore'\)/);
  const health = app.slice(app.indexOf("app.get('/health'"));
  assert.ok(health, '/health route not found');
  assert.match(health.slice(0, 600), /persistence: persistence\.mode/);
});

test('the boot path warns loudly about an ephemeral datastore', () => {
  const server = fs.readFileSync(path.join(SIDECAR_DIR, 'server.js'), 'utf8');
  assert.match(server, /persistenceInfo\(\)/);
  assert.match(server, /DATASTORE IS EPHEMERAL/);
  // A warning that does not name the fix is just noise, so the remedy and the
  // variable to set are part of the message.
  assert.match(server, /SIDECAR_DB_DIR/);
  assert.match(server, /LOST on every deploy/);
});
