// ED Module: prismaClientDiagnostics.js
// Automated checks for Prisma client health and resolution
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export async function runPrismaDiagnostics() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const backendRoot = path.resolve(__dirname, '..');
  const prismaClientPath = path.join(backendRoot, 'node_modules', '@prisma', 'client');
    // Load ED config for schema path
    const configPath = path.resolve(__dirname, '../config.json');
    let edConfig = {};
    if (fs.existsSync(configPath)) {
      edConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    const prismaSchemaPath = path.resolve(process.cwd(), edConfig.prismaSchemaPath || '../../prisma/schema.prisma');
    console.log('Resolved schema path from config:', prismaSchemaPath);
  const prismaDbPath = path.join(backendRoot, 'dev.db');

  // 1. Check Prisma client files
  const clientFiles = ['index.js', 'schema.prisma', 'runtime', 'package.json'];
  let missingFiles = [];
  for (const file of clientFiles) {
    if (!fs.existsSync(path.join(prismaClientPath, file))) {
      missingFiles.push(file);
    }
  }

  // 2. Check schema
  const schemaExists = fs.existsSync(prismaSchemaPath);

  // 3. Check database file (SQLite)
  const dbExists = fs.existsSync(prismaDbPath);

  // 4. Check working directory
  const cwd = process.cwd();

  // 5. Check DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || '';

  // 6. Check Prisma client import resolution
  let resolvedClientPath = null;
  try {
    resolvedClientPath = require.resolve('@prisma/client');
  } catch (err) {
    resolvedClientPath = err.message;
  }

  // 7. Check for duplicate Prisma installations
  let duplicateWarning = '';
  try {
    const execSync = (await import('child_process')).execSync;
    const output = execSync('npm ls @prisma/client', { cwd: backendRoot }).toString();
    if (output.split('@prisma/client').length > 2) {
      duplicateWarning = 'Multiple @prisma/client versions detected.';
    }
  } catch (err) {
    duplicateWarning = 'Could not check for duplicate Prisma installations.';
  }

  // 8. Output diagnostics
  return {
    prismaClientPath,
    missingFiles,
    schemaExists,
    dbExists,
    cwd,
    databaseUrl,
    resolvedClientPath,
    duplicateWarning,
  };
}
export default { runPrismaDiagnostics };
