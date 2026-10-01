// backend/utils/maintenance.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function pruneOldErrors(daysToKeep = 30) {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const result = await prisma.errorLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

async function syncLifetimeTierCount() {
  const claimed = await prisma.lifetimeTier.count({ where: { claimed: true } });
  return claimed;
}

module.exports = { pruneOldErrors, syncLifetimeTierCount };