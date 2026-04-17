// ED Self-Healing Prisma Engine V2
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
process.chdir(backendRoot);
const require = createRequire(import.meta.url);

function resolvePrismaClient() {
  try {
    return require.resolve('@prisma/client');
  } catch (err) {
    return null;
  }
}

function validatePrismaClient(backendRoot) {
  const clientPath = path.join(backendRoot, 'node_modules', '@prisma', 'client');
  const required = ['index.js', 'schema.prisma', 'runtime', 'package.json'];
  const missing = required.filter(f => !fs.existsSync(path.join(clientPath, f)));
  return {
    clientPath,
    missing,
    valid: missing.length === 0
  };
}

function ensureDatabase(backendRoot) {
  const dbPath = path.join(backendRoot, 'dev.db');
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
    try {
      execSync('npx prisma db push', { cwd: backendRoot, stdio: 'inherit' });
    } catch (err) {
      console.error('[ED] prisma db push failed:', err.message);
    }
  }
  return fs.existsSync(dbPath);
}

function ensureStateDir() {
  const stateDir = path.join(backendRoot, 'ed', 'state');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  return stateDir;
}

function writeStateFile(name, data) {
  const stateDir = ensureStateDir();
  fs.writeFileSync(path.join(stateDir, name), JSON.stringify(data, null, 2));
}

export async function selfHealPrismaV2() {
  // Step 1: Validate schema
    // Load ED config for schema path
    const configPath = path.resolve(__dirname, "../config.json");
    let edConfig = {};
    if (fs.existsSync(configPath)) {
      edConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    const schemaPath = path.resolve(process.cwd(), edConfig.prismaSchemaPath || "../../prisma/schema.prisma");
    console.log("ED resolving schema at (from config):", schemaPath);
  if (!fs.existsSync(schemaPath)) {
    console.error('[ED] Missing schema.prisma in backend/prisma');
    writeStateFile('prismaIntegrity.json', { error: 'Missing schema.prisma' });
    return false;
  }

  // Step 2: Ensure database
  const dbOk = ensureDatabase(backendRoot);
  if (!dbOk) {
    writeStateFile('prismaIntegrity.json', { error: 'Database file missing' });
    return false;
  }

  // Step 3: Validate Prisma client folder
  let validation = validatePrismaClient(backendRoot);
  if (!validation.valid) {
    console.warn('[ED] Prisma client missing files:', validation.missing);
    // Step 4: Auto-repair
    try {
      fs.rmSync(validation.clientPath, { recursive: true, force: true });
    } catch {}
    try {
      execSync('npm install @prisma/client', { cwd: backendRoot, stdio: 'inherit' });
      execSync('npx prisma generate', { cwd: backendRoot, stdio: 'inherit' });
    } catch (err) {
      console.error('[ED] Auto-repair failed:', err.message);
      writeStateFile('prismaIntegrity.json', { error: 'Auto-repair failed', details: err.message });
      return false;
    }
    // Step 5: Revalidate
    validation = validatePrismaClient(backendRoot);
    if (!validation.valid) {
      console.error('[ED] Prisma client still invalid:', validation.missing);
      writeStateFile('prismaIntegrity.json', { error: 'Prisma client still invalid', missing: validation.missing });
      return false;
    }
  }

  // Step 6: Confirm Prisma client resolution
  const resolved = resolvePrismaClient();
  if (!resolved) {
    console.error('[ED] Could not resolve @prisma/client');
    writeStateFile('prismaIntegrity.json', { error: 'Could not resolve @prisma/client' });
    return false;
  }
  console.log('[ED] Prisma client is healthy:', resolved);
  writeStateFile('prismaIntegrity.json', { status: 'healthy', resolved });
  return true;
}

export default { selfHealPrismaV2 };
