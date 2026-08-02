const { readDatabase, withDatabase } = require('./datastore');
const { createId } = require('./utils');

async function requireApiKey(req, res, next) {
  const apiKey = String(req.header('x-api-key') || '').trim();
  if (!apiKey) {
    return res.status(401).json({ message: 'Missing x-api-key header.' });
  }

  const db = await readDatabase();
  const keyRecord = db.apiKeys[apiKey];
  if (!keyRecord) {
    return res.status(401).json({ message: 'Invalid API key.' });
  }

  if (keyRecord.revoked_at) {
    return res.status(401).json({ message: 'API key has been revoked.' });
  }
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return res.status(401).json({ message: 'API key has expired.' });
  }

  const funder = db.funders[keyRecord.funder_id];
  if (!funder) {
    return res.status(401).json({ message: 'API key is linked to an unknown funder.' });
  }

  const now = new Date().toISOString();
  req.auth = {
    funder_id: keyRecord.funder_id,
    funder,
    api_key: apiKey,
    key_scope: keyRecord.key_scope || 'production',
  };

  await withDatabase((nextDb) => {
    if (nextDb.apiKeys[apiKey]) {
      nextDb.apiKeys[apiKey].last_used_at = now;
    }
    nextDb.auditLogs.push({
      id: createId('log'),
      type: 'api_key_used',
      funder_id: keyRecord.funder_id,
      created_at: now,
    });
    return nextDb;
  });

  return next();
}

module.exports = {
  requireApiKey,
};
