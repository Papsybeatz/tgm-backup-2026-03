const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const databasePath = path.join(dataDir, 'sidecar-db.json');

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
  await fs.promises.mkdir(dataDir, { recursive: true });
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
  databasePath,
};
