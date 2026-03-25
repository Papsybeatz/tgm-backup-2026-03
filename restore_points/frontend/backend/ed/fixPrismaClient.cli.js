// ED CLI: Run automated Prisma client fixes
import { fixPrismaClient } from './fixPrismaClient.js';

async function main() {
  await fixPrismaClient();
}

main();
