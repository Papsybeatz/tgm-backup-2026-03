import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function checkPrismaMigrationSafety() {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const meta: any = { env: process.env.NODE_ENV };

  // 1. Check migrations folder
  import { fileURLToPath } from 'url';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsDir = path.join(__dirname, '..', '..', 'backend', 'prisma', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    issues.push('prisma/migrations folder does not exist.');
    suggestions.push('Run `prisma migrate dev` or `prisma migrate deploy` to create migrations.');
  } else {
    const folders = fs.readdirSync(migrationsDir).filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory());
    if (folders.length === 0) {
      issues.push('No migration folders found in prisma/migrations.');
      suggestions.push('Generate at least one migration before deploying.');
    } else {
      let lastTimestamp = '';
      for (const folder of folders) {
        const folderPath = path.join(migrationsDir, folder);
        if (!fs.existsSync(path.join(folderPath, 'migration.sql'))) {
          issues.push(`Missing migration.sql in ${folder}`);
        }
        // Optionally check for migration_lock.toml
        // if (!fs.existsSync(path.join(folderPath, 'migration_lock.toml'))) {
        //   issues.push(`Missing migration_lock.toml in ${folder}`);
        // }
        // Check timestamp order
        const timestamp = folder.split('_')[0];
        if (lastTimestamp && timestamp < lastTimestamp) {
          issues.push(`Migration folder ${folder} is out of order.`);
        }
        lastTimestamp = timestamp;
      }
    }
  }

  // 2. Run `prisma migrate diff` in dry mode
  try {
    const diff = execSync('npx prisma migrate diff --from-schema-datamodel backend/prisma/schema.prisma --to-url $env:DATABASE_URL --script', { encoding: 'utf8', cwd: path.join(__dirname, '..', '..') });
    if (diff && diff.includes('drift')) {
      issues.push('Schema ↔ database drift detected.');
      suggestions.push('Run `prisma migrate dev` (non-prod) or `prisma migrate deploy` (prod) to resolve drift.');
    }
    meta.diff = diff;
  } catch (e: any) {
    issues.push('Failed to run prisma migrate diff.');
    suggestions.push('Check your DATABASE_URL and Prisma CLI installation.');
    meta.diffError = e.message;
  }

  // 3. Inspect _prisma_migrations table (optional, requires DB connection)
  // Skipped for now: would require a DB client and credentials

  // 4. Apply environment policy
  const env = process.env.NODE_ENV;
  const allowMigrations = process.env.ED_ALLOW_MIGRATIONS === '1';
  if (env === 'production') {
    issues.push('Production environment detected. Only `prisma migrate deploy` is allowed.');
    if (!allowMigrations) {
      suggestions.push('Set ED_ALLOW_MIGRATIONS=1 to allow migrations in production (with caution).');
    }
  }

  return {
    status: issues.length ? 'FAIL' : 'PASS',
    issues,
    suggestions,
    meta,
  };
}
