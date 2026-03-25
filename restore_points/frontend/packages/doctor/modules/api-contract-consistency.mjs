// doctor/modules/api-contract-consistency.mjs

import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export const name = 'api-contract-consistency';

export async function run({ fix = false, projectRoot }) {
  const report = {
    name,
    errors: [],
    fixes: [],
    passed: false,
  };

  try {
    const validation = await validate(projectRoot);

    if (validation.errors.length > 0) {
      report.errors.push(...validation.errors);

      if (fix) {
        const fixResults = await applyFixes(validation, projectRoot);
        report.fixes.push(...fixResults);
      }
    }

    report.passed = report.errors.length === 0;
    return report;

  } catch (err) {
    report.errors.push(`Module crashed: ${err.message}`);
    return report;
  }
}

async function validate(projectRoot) {
  const errors = [];
  const contractPath = path.join(projectRoot, 'api.contract.json');
  const routesPath = path.join(projectRoot, 'backend', 'routes');

  // 1. Contract file exists
  if (!fs.existsSync(contractPath)) {
    errors.push('Missing api.contract.json');
    return { errors };
  }

  // 2. Load contract
  let contract;
  try {
    contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } catch {
    errors.push('api.contract.json is not valid JSON');
    return { errors };
  }

  // 3. Scan Express routes
  const routeFiles = fs.readdirSync(routesPath).filter(f => f.endsWith('.js'));
  const discoveredRoutes = [];

  for (const file of routeFiles) {
    const fileContent = fs.readFileSync(path.join(routesPath, file), 'utf8');
    const matches = fileContent.match(/router\.(get|post|put|delete)\(['"`](.*?)['"`]/g) || [];

    matches.forEach(m => {
      const [, method, route] = m.match(/router\.(get|post|put|delete)\(['"`](.*?)['"`]/);
      discoveredRoutes.push({ method, route });
    });
  }

  // 4. Compare contract vs discovered routes
  const contractRoutes = contract.routes || [];

  for (const r of discoveredRoutes) {
    const exists = contractRoutes.some(c => c.method === r.method && c.route === r.route);
    if (!exists) {
      errors.push(`Route missing from contract: [${r.method.toUpperCase()}] ${r.route}`);
    }
  }

  for (const c of contractRoutes) {
    const exists = discoveredRoutes.some(r => r.method === c.method && r.route === c.route);
    if (!exists) {
      errors.push(`Contract entry has no matching route: [${c.method.toUpperCase()}] ${c.route}`);
    }
  }

  return { errors, contract, discoveredRoutes };
}

async function applyFixes(validation, projectRoot) {
  const fixes = [];

  // Example auto-fix: create missing contract entries
  const contractPath = path.join(projectRoot, 'api.contract.json');
  const contract = validation.contract;

  validation.discoveredRoutes.forEach(r => {
    const exists = contract.routes.some(c => c.method === r.method && c.route === r.route);
    if (!exists) {
      contract.routes.push({
        method: r.method,
        route: r.route,
        response: { type: 'object', fields: {} }
      });
      fixes.push(`Added contract entry for ${r.method.toUpperCase()} ${r.route}`);
    }
  });

  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
  return fixes;
}
