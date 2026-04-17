// ED CLI: Run self-healing Prisma engine
import { selfHealPrisma } from './selfHealingPrisma.js';

async function main() {
  const healthy = await selfHealPrisma();
  if (healthy) {
    console.log('[ED] Backend Prisma is healthy and ready.');
  } else {
    console.error('[ED] Backend Prisma health check failed.');
  }
}

main();
