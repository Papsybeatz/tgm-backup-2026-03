import fs from 'fs';
import path from 'path';

const prismaEngineMatrix = [
  { range: '>=7.0.0', node: '>=20.19.0' },
  { range: '>=6.0.0 <7.0.0', node: '>=18.0.0 <21.0.0' },
  { range: '>=5.0.0 <6.0.0', node: '>=16.0.0 <21.0.0' },
];

function isNodeCompatibleWithPrisma(nodeVersion: string, prismaVersion: string): boolean {
  // Simple version check (expand as needed)
  if (prismaVersion.startsWith('7.')) return nodeVersion >= 'v20.19.0';
  if (prismaVersion.startsWith('6.')) return nodeVersion >= 'v18.0.0' && nodeVersion < 'v21.0.0';
  if (prismaVersion.startsWith('5.')) return nodeVersion >= 'v16.0.0' && nodeVersion < 'v21.0.0';
  return true;
}

export async function checkPrismaEngineIntegrity() {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // 1. Node version
  const nodeVersion = process.version;

  // 2. Read package.json
  let pkg: any = {};
  try {
    pkg = JSON.parse(
      await fs.promises.readFile(path.join(process.cwd(), 'package.json'), 'utf8')
    );
  } catch (e) {
    issues.push('Could not read package.json');
  }
  const prismaVersion = pkg.devDependencies?.prisma || pkg.dependencies?.prisma;
  const prismaClientVersion =
    pkg.dependencies?.['@prisma/client'] || pkg.devDependencies?.['@prisma/client'];

  // 3. Compare against matrix
  if (prismaVersion && !isNodeCompatibleWithPrisma(nodeVersion, prismaVersion)) {
    issues.push(`Node ${nodeVersion} is not compatible with Prisma ${prismaVersion}.`);
    suggestions.push(`Align Node to the required range for Prisma ${prismaVersion} (e.g. >=20.19.0 for Prisma 7).`);
  }

  // 4. Engine mode
  const manifestPath = path.join(
    process.cwd(),
    'node_modules',
    '@prisma',
    'client',
    'runtime',
    'manifest.json'
  );
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
    if (manifest.engineType === 'client') {
      issues.push('Prisma is configured to use engine type "client".');
      suggestions.push('Remove engineType/client config from PrismaClient constructor or set engineType to "binary".');
    }
  }

  // 5. Binary engine presence
  const enginePath = path.join(
    process.cwd(),
    'node_modules',
    '.prisma',
    'client',
    process.platform === 'win32' ? 'query-engine-windows.exe' : 'query-engine'
  );
  if (!fs.existsSync(enginePath)) {
    issues.push('Prisma binary engine not found at .prisma/client.');
    suggestions.push('Reinstall dependencies and run `npx prisma generate`.');
  }

  // 6. Env flags
  if (process.env.PRISMA_CLIENT_ENGINE_TYPE === 'client') {
    issues.push('PRISMA_CLIENT_ENGINE_TYPE=client is set in environment.');
    suggestions.push('Unset PRISMA_CLIENT_ENGINE_TYPE or set to "binary".');
  }
  if (process.env.PRISMA_ACCELERATE_URL) {
    suggestions.push('PRISMA_ACCELERATE_URL is set. If not using Accelerate, unset this variable.');
  }

  // 7. Multiple Node installations
  // (Optional: implement with child_process.execSync('where node'))

  return {
    status: issues.length ? 'FAIL' : 'PASS',
    issues,
    suggestions,
    meta: {
      nodeVersion,
      prismaVersion,
      prismaClientVersion,
    },
  };
}
