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
  return {
    ...defaultDatabase(),
    ...parsed,
  };
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
