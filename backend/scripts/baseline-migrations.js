#!/usr/bin/env node
/**
 * Baseline the Prisma migration history.
 * ----------------------------------------------------------------------------
 * `prisma migrate deploy` cannot work against this database until the history is
 * reconciled. Three migrations are unusable:
 *
 *   20260410184551_add_subscription_fields   generated for SQLite (DATETIME is
 *                                            not a Postgres type)
 *   20260411123000_drafts_userid             same
 *   20260411124500_drafts_userid_postgres    ALTER TABLE "Drafts" ADD COLUMN
 *                                            without IF NOT EXISTS, and it names
 *                                            a table the schema calls "Draft"
 *
 * The tables they describe already exist in production — users, drafts and
 * billing all work. So the correct fix is not to run them but to record them as
 * applied, which is what "baselining" means: make the history agree with reality.
 *
 * This script checks first and only resolves what is actually missing, so it is
 * safe to run more than once.
 *
 * Usage, in the Railway service shell:
 *   cd backend && node scripts/baseline-migrations.js
 */
const { execFileSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Unusable on Postgres, and already reflected in the live database. */
const NEEDS_BASELINE = [
  '20260410184551_add_subscription_fields',
  '20260411123000_drafts_userid',
  '20260411124500_drafts_userid_postgres',
];

function prismaCli(args) {
  try {
    const out = execFileSync('npx', ['prisma', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, output: out };
  } catch (error) {
    return { ok: false, output: `${error.stdout || ''}${error.stderr || ''}` || error.message };
  }
}

async function appliedMigrations() {
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    );
    return new Set(rows.map((r) => r.migration_name));
  } catch (error) {
    // The table does not exist yet on a database that has never used migrations.
    console.log('  (_prisma_migrations not readable yet:', String(error.message || error).slice(0, 120) + ')');
    return new Set();
  }
}

async function main() {
  console.log('\nPrisma migration baseline\n' + '='.repeat(50));

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — run this inside the service container.');
    process.exit(1);
  }

  console.log('\n1. Migrations already recorded as applied:');
  const applied = await appliedMigrations();
  console.log(applied.size ? [...applied].map((m) => `   - ${m}`).join('\n') : '   (none recorded)');

  console.log('\n2. Recording the unusable ones as applied:');
  const resolved = [];
  for (const name of NEEDS_BASELINE) {
    if (applied.has(name)) {
      console.log(`   = ${name}  already recorded, skipping`);
      continue;
    }
    const result = prismaCli(['migrate', 'resolve', '--applied', name]);
    if (result.ok) {
      console.log(`   + ${name}  marked applied`);
      resolved.push(name);
    } else {
      console.log(`   ! ${name}  could not be marked`);
      console.log(`     ${String(result.output).trim().split('\n').slice(-3).join('\n     ')}`);
    }
  }

  console.log('\n3. Migration status after baselining:');
  const status = prismaCli(['migrate', 'status']);
  console.log(String(status.output).trim().split('\n').map((l) => `   ${l}`).join('\n'));

  console.log('\n4. Can migrate deploy run now?');
  const deploy = prismaCli(['migrate', 'deploy']);
  const tail = String(deploy.output).trim().split('\n').slice(-6).join('\n   ');
  console.log(`   ${tail}`);

  console.log('\n' + '='.repeat(50));
  console.log(deploy.ok
    ? 'SUCCESS — `prisma migrate deploy` works again. A preDeployCommand can be re-added.'
    : 'NOT YET — migrate deploy still fails. Send the output above; if it names a\nmigration not in the baseline list, that one needs baselining too.');
  console.log(`Resolved this run: ${resolved.length ? resolved.join(', ') : 'nothing needed resolving'}\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('\nBaseline failed:', error?.message || error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
