import path from 'path';
import fs from 'fs';
import { runFrontendEnvironmentIntegrityGMV } from '../../doctor/frontend-environment-integrity.js';

export const FrontendEnvIntegrityModule = {
  id: 'frontend-env-integrity-gmv',
  label: 'Frontend Environment Integrity (GrantsMasterVite)',
  description: 'Ensures a single React runtime, clean Vite cache, and consistent dependency graph.',
  run: async () => {
    const ctx = {
      projectRoot: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite',
      packageJsonPath: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite/package.json',
      lockfilePath: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite/package-lock.json',
      nodeModulesPath: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite/node_modules',
      viteConfigPath: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite/vite.config.js',
      packageManager: 'npm',
      installCommand: 'npm install',
      devCommand: 'npm run dev -- --force'
    };

    console.log('\n🔍 Running Frontend Environment Integrity (GrantsMasterVite)...\n');

    const result = await runFrontendEnvironmentIntegrityGMV(ctx);

    console.log('\n📋 Pre‑check results:');
    result.pre.forEach(r => console.log(` - ${r.status.toUpperCase()}: ${r.details}`));

    console.log('\n🛠 Post‑repair results:');
    result.post.forEach(r => console.log(` - ${r.status.toUpperCase()}: ${r.details}`));

    if (result.status === 'ok') {
      console.log('\n✅ Frontend environment is stable and consistent.\n');
      process.exit(0);
    } else {
      console.log('\n⚠ Environment improved but still degraded. Manual review recommended.\n');
      process.exit(1);
    }
  }
};
