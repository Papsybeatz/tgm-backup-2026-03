require('dotenv').config();
const app = require('./app');
const { persistenceInfo } = require('./lib/datastore');

// Railway injects PORT automatically. FUNDER_INTELLIGENCE_PORT is the local override.
const PORT = Number(process.env.PORT || process.env.FUNDER_INTELLIGENCE_PORT || 4500);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[FUNDER-API] Funder Intelligence API running on port ${PORT}`);
  console.log(`[FUNDER-API] Health: GET /health`);
  console.log(`[FUNDER-API] Register: POST /funder/register`);

  // Shout about ephemeral storage at boot, while it can still be fixed. The
  // failure this prevents is silent: everything works, then a redeploy wipes
  // every registered funder and org API key, and the symptom shows up days
  // later as a customer whose key stopped working.
  const persistence = persistenceInfo();
  if (!persistence.durable) {
    console.warn('[FUNDER-API] ============================================================');
    console.warn(`[FUNDER-API] DATASTORE IS EPHEMERAL: ${persistence.path}`);
    console.warn('[FUNDER-API] Registered funders, org API keys, cycles and entitlements');
    console.warn('[FUNDER-API] are LOST on every deploy, because this path is on the');
    console.warn('[FUNDER-API] container filesystem. Mount a volume and set SIDECAR_DB_DIR');
    console.warn('[FUNDER-API] to its mount path before taking funder money.');
    console.warn('[FUNDER-API] GET /health reports "persistence" for the same answer.');
    console.warn('[FUNDER-API] ============================================================');
  } else {
    console.log(`[FUNDER-API] Datastore configured at ${persistence.path}`);
  }
});
