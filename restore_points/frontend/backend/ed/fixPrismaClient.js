
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

export function fixPrismaClient() {
  const schemaPath = new URL('../../prisma/schema.prisma', import.meta.url).pathname.replace(/^\//, "").replace(/\//g, path.sep);
  console.log('Resolved schema path:', schemaPath);

  // 1. Ensure backend/prisma/schema.prisma exists
  if (!fs.existsSync(schemaPath)) {
    console.error('[ED] Missing schema.prisma at', schemaPath);
    return;
  }

  // 2. Ensure backend/.env exists and has DATABASE_URL
  const envPath = path.join(backendRoot, '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, 'DATABASE_URL="file:./dev.db"\n');
  } else {
    let envContent = fs.readFileSync(envPath, 'utf8');
    // Load ED config for schema path
    const configPath = path.resolve(__dirname, '../config.json');
    let edConfig = {};
    if (fs.existsSync(configPath)) {
      edConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    const schemaPath = path.resolve(process.cwd(), edConfig.prismaSchemaPath || '../../prisma/schema.prisma');
    console.log('Resolved schema path from config:', schemaPath);
      fs.writeFileSync(envPath, envContent);
    }
  }

  // 3. Ensure backend/node_modules/@prisma/client exists
  try {
    execSync('npm install @prisma/client prisma --save-dev', { cwd: backendRoot, stdio: 'inherit' });
  } catch (err) {
    console.error('[ED] npm install failed:', err.message);
  }

  // 4. Run prisma generate in backend
  try {
    execSync('npx prisma generate', { cwd: backendRoot, stdio: 'inherit' });
  } catch (err) {
    console.error('[ED] prisma generate failed:', err.message);
  }

  // 5. Remove frontend Prisma client if exists
  const frontendPrisma = path.join(backendRoot, '../node_modules/@prisma/client');
  if (fs.existsSync(frontendPrisma)) {
    fs.rmSync(frontendPrisma, { recursive: true, force: true });
  }

  console.log('[ED] Automated Prisma client fixes complete.');
}
