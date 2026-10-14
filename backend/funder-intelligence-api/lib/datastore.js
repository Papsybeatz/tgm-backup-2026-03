const fs = require('fs');
const path = require('path');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Where the datastore lives.
 *
 * This is a JSON file, so it sits on whatever filesystem the process can write
 * to. On Railway that is the CONTAINER's filesystem, which is discarded on every
 * deploy — so registered funders, org API keys, cycles and entitlements all
 * vanish on a routine redeploy. That is silent data loss, and the symptom is
 * very hard to read backwards: a customer's API key stops working after a deploy
 * nobody connected to it.
 *
 * The real fix is a mounted volume, which is a deployment setting rather than a
 * code change. What the code can do is make the path settable so a volume can be
 * pointed at (SIDECAR_DB_PATH for the file, SIDECAR_DB_DIR for the directory),
 * and make the ephemeral case LOUD instead of silent. See persistenceInfo().
 */
const dataDir = process.env.SIDECAR_DB_DIR || DEFAULT_DATA_DIR;
const databasePath = process.env.SIDECAR_DB_PATH || path.join(dataDir, 'sidecar-db.json');

// Resolved once, at load, so what persistenceInfo() reports is the path this
// process actually reads and writes rather than a second guess at it.
const EXPLICIT_PATH = Boolean(process.env.SIDECAR_DB_PATH || process.env.SIDECAR_DB_DIR);

/**
 * Whether this deployment can keep its data.
 *
 * `configured` means an explicit path was given, which is what a volume mount
 * looks like from inside the process. `ephemeral` means we are writing inside
 * the app tree, which on a container platform means the data dies with the
 * container.
 *
 * Deliberately reports what was CONFIGURED rather than what is true: a process
 * cannot reliably read its own mount table. Surfacing it on /health is the point
 * — the answer becomes visible from a browser, instead of only in a boot log
 * nobody reads until after the loss.
 */
function persistenceInfo() {
  return {
    mode: EXPLICIT_PATH ? 'configured' : 'ephemeral',
    durable: EXPLICIT_PATH,
    path: databasePath,
  };
}

const defaultDatabase = () => ({
  funders: {},
  apiKeys: {},
  webhooks: {},
  batches: {},
  cycles: {},
  auditLogs: [],
  enterpriseOrgs: {},
  rubricDrafts: {},
  metrics: {
    requests: [],
    alerts: [],
  },
  supportTickets: {},
  monthlyReports: {},
  // Per-cycle entitlements: { [cycleId]: { funder_id, plan_key, applications_allowed, applications_used, status, activated_at, expires_at, stripe_payment_intent_id } }
  entitlements: {},
  // Per-cycle app usage: { [cycleId]: Set<appId> } — stored as arrays in JSON
  cycleUsage: {},
});

async function ensureDatabase() {
  // The directory of the RESOLVED path, not the default one — otherwise a
  // configured volume path would be written into a directory that was never
  // created and every write would fail.
  await fs.promises.mkdir(path.dirname(databasePath), { recursive: true });
  try {
    await fs.promises.access(databasePath);
  } catch (_error) {
    await fs.promises.writeFile(databasePath, JSON.stringify(defaultDatabase(), null, 2), 'utf8');
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await fs.promises.readFile(databasePath, 'utf8');
  const parsed = JSON.parse(raw);
  const base = defaultDatabase();
  const merged = { ...base, ...parsed };
  merged.metrics = {
    requests: Array.isArray(parsed?.metrics?.requests) ? parsed.metrics.requests : [],
    alerts: Array.isArray(parsed?.metrics?.alerts) ? parsed.metrics.alerts : [],
  };
  return merged;
}

async function writeDatabase(nextData) {
  await ensureDatabase();
  const tempPath = `${databasePath}.tmp`;
  await fs.promises.writeFile(tempPath, JSON.stringify(nextData, null, 2), 'utf8');
  await fs.promises.rename(tempPath, databasePath);
}

async function withDatabase(mutator) {
  const current = await readDatabase();
  const updated = await mutator(current);
  await writeDatabase(updated);
  return updated;
}

module.exports = {
  withDatabase,
  readDatabase,
  writeDatabase,
  persistenceInfo,
  databasePath,
  DEFAULT_DATA_DIR,
};
