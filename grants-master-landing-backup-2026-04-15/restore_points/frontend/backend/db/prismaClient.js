// Unified Prisma Client instance for backend
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn', 'info'],
});

export default prisma;
export { prisma };
