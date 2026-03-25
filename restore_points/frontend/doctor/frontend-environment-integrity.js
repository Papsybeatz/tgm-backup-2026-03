// Frontend Environment Integrity Module for Enterprise Doctor

export const FrontendEnvironmentIntegrityModule = {
  id: 'frontend-env-integrity-gmv',
  label: 'Frontend Environment Integrity (GrantsMasterVite)',
  scope: ['frontend', 'vite', 'react', 'runtime'],
  severity: 'critical',
  projectRoot: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite',
  description:
    'Ensures a single React runtime, consistent Vite cache, and a clean dependency graph for GrantsMasterVite. Prevents invalid hook call errors, hoisting, stale prebundles, and Windows-locked node_modules issues.'
};

export const ctx = {
  projectRoot: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite',
  packageJsonPath: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite/package.json',
  lockfilePath: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite/package-lock.json',
  nodeModulesPath: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite/node_modules',
  viteConfigPath: 'D:/Grantsmasterlanding/grants-master-landing/GrantsMasterVite/vite.config.js',
  packageManager: 'npm',
  devCommand: 'npm run dev -- --force',
  installCommand: 'npm install'
};

/**
 * @typedef {Object} FrontendEnvContext
 * @property {string} projectRoot
 * @property {string} packageJsonPath
 * @property {string=} lockfilePath
 * @property {string} nodeModulesPath
 * @property {string} viteConfigPath
 */

// --- Diagnostics ---

import fs from 'fs/promises';
import path from 'path';

export async function checkReactVersionConsistency(ctx) {
  const pkg = JSON.parse(await fs.readFile(ctx.packageJsonPath, 'utf8'));
  const react = pkg.dependencies?.react;
  const reactDom = pkg.dependencies?.['react-dom'];
  if (react !== '18.2.0') return { status: 'fail', details: `react is ${react || 'missing'}, expected 18.2.0`, suggestedFixId: 'set-react-18' };
  if (reactDom !== '18.2.0') return { status: 'fail', details: `react-dom is ${reactDom || 'missing'}, expected 18.2.0`, suggestedFixId: 'set-react-dom-18' };
  return { status: 'ok', details: 'react and react-dom are both 18.2.0' };
}

export async function checkMultipleReactCopies(ctx) {
  const reactPkgs = [];
  async function scan(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'react' || entry.name === 'react-dom') {
          const pkgPath = path.join(dir, entry.name, 'package.json');
          try {
            const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
            reactPkgs.push({ name: entry.name, version: pkg.version, path: pkgPath });
          } catch {}
        } else {
          await scan(path.join(dir, entry.name));
        }
      }
    }
  }
  await scan(ctx.nodeModulesPath);
  const bad = reactPkgs.filter(r => r.version !== '18.2.0');
  if (bad.length) return { status: 'fail', details: `Non-18.2.0 React/DOM found: ${bad.map(b => `${b.name}@${b.version}`).join(', ')}`, suggestedFixId: 'dedupe-react' };
  return { status: 'ok', details: 'Only React 18.2.0 present in node_modules' };
}

export async function checkHoistedReact(ctx) {
  let dir = path.resolve(ctx.projectRoot);
  const found = [];
  while (dir !== path.dirname(dir)) {
    for (const mod of ['react', 'react-dom']) {
      const modPath = path.join(dir, 'node_modules', mod);
      try {
        await fs.access(modPath);
        if (dir !== ctx.projectRoot) found.push(modPath);
      } catch {}
    }
    dir = path.dirname(dir);
  }
  if (found.length) return { status: 'fail', details: `Hoisted React found: ${found.join(', ')}`, suggestedFixId: 'remove-hoisted-react' };
  return { status: 'ok', details: 'No hoisted React detected above GrantsMasterVite' };
}

export async function checkViteOptimizedCache(ctx) {
  const viteCacheDir = path.join(ctx.nodeModulesPath, '.vite');
  let cacheExists = false;
  try {
    await fs.access(viteCacheDir);
    cacheExists = true;
  } catch {}
  if (!cacheExists) return { status: 'ok', details: '.vite cache does not exist' };
  // Optionally: check for React 19 references, timestamps, etc.
  return { status: 'warn', details: '.vite cache exists, consider clearing if issues persist' };
}

export async function checkViteConfig(ctx) {
  const configText = await fs.readFile(ctx.viteConfigPath, 'utf8');
  if (!/dedupe:\s*\[([^\]]*['"]react['"][^\]]*)\]/.test(configText)) {
    return { status: 'fail', details: 'No resolve.dedupe for react/react-dom', suggestedFixId: 'add-vite-dedupe' };
  }
  if (/alias\s*:\s*\{[^}]*react[^}]*:[^}]*['"][^'"{]*\.{2}/.test(configText)) {
    return { status: 'fail', details: 'Alias points outside GrantsMasterVite', suggestedFixId: 'fix-vite-alias' };
  }
  return { status: 'ok', details: 'Vite config dedupe and alias are correct' };
}

export async function checkDependencyGraph(ctx) {
  if (!ctx.lockfilePath) return { status: 'warn', details: 'No lockfile found' };
  const lockText = await fs.readFile(ctx.lockfilePath, 'utf8');
  const reactVersions = Array.from(lockText.matchAll(/react(-dom)?@.*\n\s+version: (\d+\.\d+\.\d+)/g)).map(m => m[2]);
  const unique = [...new Set(reactVersions)];
  if (unique.length > 1) return { status: 'fail', details: `Multiple React versions in lockfile: ${unique.join(', ')}`, suggestedFixId: 'dedupe-lockfile' };
  if (unique.some(v => v !== '18.2.0')) return { status: 'fail', details: `Non-18.2.0 React in lockfile: ${unique.join(', ')}`, suggestedFixId: 'set-react-18' };
  return { status: 'ok', details: 'Only React 18.2.0 in lockfile' };
}

// --- Auto-repair actions ---

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// --- Repo-specific Auto-Repair Actions ---

export async function fixReactVersion(ctx) {
  const pkg = JSON.parse(await fs.readFile(ctx.packageJsonPath, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies.react = '18.2.0';
  pkg.dependencies['react-dom'] = '18.2.0';
  // Add npm overrides block for singleton enforcement
  pkg.overrides = { ...(pkg.overrides || {}), react: '18.2.0', 'react-dom': '18.2.0' };
  await fs.writeFile(ctx.packageJsonPath, JSON.stringify(pkg, null, 2));
  console.log(`[${timestamp()}] Set react/react-dom to 18.2.0 and added overrides in package.json`);
}

export async function fixMultipleReactCopies(ctx) {
  const reactPkgs = [];
  async function scan(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'react' || entry.name === 'react-dom') {
          const pkgPath = path.join(dir, entry.name, 'package.json');
          try {
            const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
            if (pkg.version !== '18.2.0') {
              const backup = path.join(dir, `${entry.name}_backup_${timestamp()}`);
              await fs.rename(path.join(dir, entry.name), backup);
              console.log(`[${timestamp()}] Renamed ${entry.name} at ${dir} to ${backup}`);
            }
          } catch {}
        } else {
          await scan(path.join(dir, entry.name));
        }
      }
    }
  }
  await scan(ctx.nodeModulesPath);
}

export async function fixHoistedReact(ctx) {
  let dir = path.resolve(ctx.projectRoot);
  while (dir !== path.dirname(dir)) {
    for (const mod of ['react', 'react-dom']) {
      const modPath = path.join(dir, 'node_modules', mod);
      try {
        await fs.access(modPath);
        if (dir !== ctx.projectRoot) {
          const backup = `${modPath}_hoisted_backup_${timestamp()}`;
          await fs.rename(modPath, backup);
          await fs.writeFile(backup + '/_ED_NOTE.txt', `Renamed by Enterprise Doctor on ${timestamp()} to neutralize hoisted React.`);
          console.log(`[${timestamp()}] Renamed hoisted ${mod} at ${modPath} to ${backup}`);
        }
      } catch {}
    }
    dir = path.dirname(dir);
  }
}

export async function fixViteOptimizedCache(ctx) {
  const viteCacheDir = path.join(ctx.nodeModulesPath, '.vite');
  try {
    await fs.access(viteCacheDir);
    const backup = path.join(ctx.nodeModulesPath, `.vite_backup_${timestamp()}`);
    await fs.rename(viteCacheDir, backup);
    console.log(`[${timestamp()}] Renamed .vite cache to ${backup}`);
  } catch {}
}

export async function fixViteConfig(ctx) {
  let configText = await fs.readFile(ctx.viteConfigPath, 'utf8');
  if (!/dedupe:\s*\[([^\]]*['"]react['"][^\]]*)\]/.test(configText)) {
    // Naive inject: add dedupe to resolve
    configText = configText.replace(/resolve:\s*\{[^}]*\}/, match => {
      if (/dedupe:/.test(match)) return match;
      return match.replace(/\}/, ", dedupe: ['react', 'react-dom'] } ");
    });
    if (!/dedupe:/.test(configText)) {
      // No resolve block, inject one
      configText = configText.replace(/export default defineConfig\(/, `export default defineConfig({\n  resolve: { dedupe: ['react', 'react-dom'] },`);
    }
    await fs.writeFile(ctx.viteConfigPath, configText);
    console.log(`[${timestamp()}] Patched vite.config to add resolve.dedupe`);
  }
}

export async function fixDependencyGraph(ctx) {
  // Only npm for now
  const { exec } = await import('child_process');
  await new Promise((resolve, reject) => {
    exec(ctx.installCommand, { cwd: ctx.projectRoot }, (err, stdout, stderr) => {
      if (err) reject(err);
      else {
        console.log(`[${timestamp()}] Ran ${ctx.installCommand}`);
        resolve();
      }
    });
  });
  await new Promise((resolve, reject) => {
    exec(ctx.devCommand, { cwd: ctx.projectRoot }, (err, stdout, stderr) => {
      if (err) reject(err);
      else {
        console.log(`[${timestamp()}] Ran ${ctx.devCommand}`);
        resolve();
      }
    });
  });
}

// --- Orchestration (Repo-specific) ---

export async function runFrontendEnvironmentIntegrityGMV() {
  const results = [];
  results.push(await checkReactVersionConsistency(ctx));
  results.push(await checkMultipleReactCopies(ctx));
  results.push(await checkHoistedReact(ctx));
  results.push(await checkViteOptimizedCache(ctx));
  results.push(await checkViteConfig(ctx));
  results.push(await checkDependencyGraph(ctx));
  const needsFix = results.some(r => r.status !== 'ok');
  if (!needsFix) {
    return { status: 'ok', results };
  }
  await fixReactVersion(ctx);
  await fixMultipleReactCopies(ctx);
  await fixHoistedReact(ctx);
  await fixViteOptimizedCache(ctx);
  await fixViteConfig(ctx);
  await fixDependencyGraph(ctx);
  const post = [];
  post.push(await checkReactVersionConsistency(ctx));
  post.push(await checkMultipleReactCopies(ctx));
  post.push(await checkHoistedReact(ctx));
  post.push(await checkViteOptimizedCache(ctx));
  post.push(await checkViteConfig(ctx));
  post.push(await checkDependencyGraph(ctx));
  return {
    status: post.every(r => r.status === 'ok') ? 'ok' : 'degraded',
    pre: results,
    post
  };
}

/*
Agent-Ready Natural Language Contract:
Goal: Guarantee that GrantsMasterVite always runs with a single React runtime, a clean Vite cache, and a consistent dependency graph.
Actions: Diagnose, repair, and validate React versions, Vite prebundles, hoisted dependencies, and stale caches.
Safety: Never delete source files. Always rename instead of deleting. Log every change.
Success: No duplicate React copies, no stale Vite cache, no hoisting, no mismatched versions, no invalid hook calls.
*/
