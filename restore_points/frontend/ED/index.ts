
import { checkPrismaEngineIntegrity } from './modules/prismaEngineIntegrity.js';
import { checkPrismaMigrationSafety } from './modules/prismaMigrationSafety.js';
import prismaMigrationIntegrity from './modules/prisma-migration-integrity.js';

export async function runEdBootChecks() {
  const prismaCheck = await checkPrismaEngineIntegrity();
  if (prismaCheck.status === 'FAIL') {
    console.error('\n❌ Prisma Engine Integrity Check Failed');
    console.error('Issues:', prismaCheck.issues);
    console.error('Suggestions:', prismaCheck.suggestions);
    process.exit(1);
  }
  console.log('✅ Prisma Engine Integrity Check Passed');

  const migrationCheck = await checkPrismaMigrationSafety();
  if (migrationCheck.status === 'FAIL') {
    console.error('\n❌ Prisma Migration Safety Check Failed');
    console.error('Issues:', migrationCheck.issues);
    console.error('Suggestions:', migrationCheck.suggestions);
    process.exit(1);
  }
  console.log('✅ Prisma Migration Safety Check Passed');

  const migrationIntegrity = await prismaMigrationIntegrity({ root: process.cwd() });
  if (migrationIntegrity.status === 'FAIL') {
    console.error('\n❌ Prisma Migration Integrity Check Failed');
    console.error('Issues:', migrationIntegrity.issues);
    console.error('Logs:', migrationIntegrity.logs);
    console.error('Suggestions:', migrationIntegrity.suggestions);
    process.exit(1);
  }
  console.log('✅ Prisma Migration Integrity Check Passed');
}
