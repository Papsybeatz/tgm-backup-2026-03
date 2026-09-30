/**
 * Baseline the Prisma migration history at boot.
 * ----------------------------------------------------------------------------
 * `prisma migrate deploy` cannot run against this database. Three migrations are
 * unusable:
 *
 *   20260410184551_add_subscription_fields   generated for SQLite (DATETIME is
 *                                            not a Postgres type)
 *   20260411123000_drafts_userid             same
 *   20260411124500_drafts_userid_postgres    ALTER TABLE "Drafts" ADD COLUMN
 *                                            without IF NOT EXISTS, and it names
 *                                            a table the schema calls "Draft"
 *
 * The tables they describe already exist in production, so the fix is to record
 * them as applied rather than run them — make the history agree with reality.
 *
 * WHY THIS RUNS AT BOOT
 * ----------------------------------------------------------------------------
 * The same operation exists as scripts/baseline-migrations.js for a service
 * shell. That shell is not reachable here: Railway offers no terminal for this
 * service and the agent has no execution tool, so a manual step simply could not
 * happen. The boot-time route is what fixed persistence when the manual
 * migration step kept failing, so the same approach applies.
 *
 * Safety:
 *   - reads _prisma_migrations first and only resolves what is genuinely missing
 *   - resolves three NAMED migrations and nothing else
 *   - a failure is logged and ignored; it never blocks startup
 *   - the schema itself is already guaranteed by utils/ensureSchema.js, so this
 *     is about restoring a usable migration history, not about creating tables
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

function runPrisma(args, timeoutMs = 90000) {
  try {
    const output = execFileSync('npx', ['prisma', ...args], {
      cwd: __dirname + '/..',
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
    });
    return { ok: true, output: String(output || '') };
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}` || error.message || '';
    return { ok: false, output: String(output) };
  }
}

function tail(text, lines = 6) {
  return String(text || '').trim().split('\n').slice(-lines).join(' | ');
}

async function baselineMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('[BASELINE] DATABASE_URL not set — skipping');
    return { skipped: true };
  }

  // What is already recorded? If this fails the table does not exist yet, which
  // is fine — migrate resolve will create it.
  let applied = new Set();
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    );
    applied = new Set(rows.map((r) => r.migration_name));
  } catch {
    /* table absent — nothing recorded yet */
  }

  const resolved = [];
  for (const name of NEEDS_BASELINE) {
    if (applied.has(name)) continue;
    const result = runPrisma(['migrate', 'resolve', '--applied', name]);
    if (result.ok) {
      resolved.push(name);
      console.log(`[BASELINE] recorded as applied: ${name}`);
    } else {
      console.error(`[BASELINE] could not record ${name}: ${tail(result.output, 3)}`);
    }
  }

  if (!resolved.length) {
    console.log(`[BASELINE] nothing to resolve (${applied.size} migrations already recorded)`);
  }

  // Now the real question: does migrate deploy work?
  const deploy = runPrisma(['migrate', 'deploy']);
  if (deploy.ok) {
    console.log(`[BASELINE] migrate deploy OK — ${tail(deploy.output, 4)}`);
  } else {
    // Names the offending migration rather than leaving it a mystery.
    console.error(`[BASELINE] migrate deploy STILL FAILING — ${tail(deploy.output, 6)}`);
  }

  return { ok: deploy.ok, resolved, output: deploy.output };
}

module.exports = { baselineMigrations, NEEDS_BASELINE };
