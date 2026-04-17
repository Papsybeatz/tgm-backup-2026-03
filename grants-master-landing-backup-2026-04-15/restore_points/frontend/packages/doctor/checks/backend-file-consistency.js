import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'backend-file-consistency',
  description:
    'Scans backend for orphaned files, duplicates, backups, mixed module systems, and case-sensitivity issues.',

  async run({ projectRoot, backendPath }) {
    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;
    const apiDir = path.join(root, 'api');

    const details = {
      root,
      apiDir,
      orphanedFiles: [],
      duplicateFiles: [],
      backupFiles: [],
      mixedModuleFiles: [],
      caseConflicts: [],
      circularImports: [],
      unreachableFiles: []
    };

    // 1. Collect all JS files in backend
    const walk = dir => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let files = [];

      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(walk(full));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          files.push(full);
        }
      }

      return files;
    };

    const allFiles = walk(root);

    // 2. Detect backup files
    for (const file of allFiles) {
      if (file.match(/\.(old|backup|copy)\.js$/i)) {
        details.backupFiles.push(file);
      }
    }

    // 3. Detect duplicate basenames
    const baseMap = {};
    for (const file of allFiles) {
      const base = path.basename(file).toLowerCase();
      baseMap[base] = baseMap[base] || [];
      baseMap[base].push(file);
    }

    for (const [base, files] of Object.entries(baseMap)) {
      if (files.length > 1) {
        details.duplicateFiles.push({ base, files });
      }
    }

    // 4. Detect mixed ESM/CommonJS
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const usesESM = content.includes('import ') || content.includes('export ');
      const usesCJS = content.includes('require(') || content.includes('module.exports');

      if (usesESM && usesCJS) {
        details.mixedModuleFiles.push(file);
      }
    }

    // 5. Detect case-sensitivity conflicts
    const lowerMap = {};
    for (const file of allFiles) {
      const lower = file.toLowerCase();
      lowerMap[lower] = lowerMap[lower] || [];
      lowerMap[lower].push(file);
    }

    for (const [lower, files] of Object.entries(lowerMap)) {
      if (files.length > 1 && new Set(files).size > 1) {
        details.caseConflicts.push(files);
      }
    }

    // 6. Detect circular imports (simple heuristic)
    const importGraph = {};
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const imports = [...content.matchAll(/from ['"`](.*?)['"`]/g)].map(m => m[1]);
      importGraph[file] = imports;
    }

    const visited = new Set();
    const stack = new Set();

    const dfs = file => {
      if (stack.has(file)) return true;
      if (visited.has(file)) return false;

      visited.add(file);
      stack.add(file);

      for (const imp of importGraph[file]) {
        const resolved = allFiles.find(f => f.endsWith(imp + '.js'));
        if (resolved && dfs(resolved)) {
          details.circularImports.push([file, resolved]);
        }
      }

      stack.delete(file);
      return false;
    };

    for (const file of allFiles) dfs(file);

    const ok =
      details.backupFiles.length === 0 &&
      details.duplicateFiles.length === 0 &&
      details.mixedModuleFiles.length === 0 &&
      details.caseConflicts.length === 0 &&
      details.circularImports.length === 0;

    return {
      ok,
      message: ok
        ? 'Backend file structure is clean and consistent.'
        : 'Backend file structure has inconsistencies.',
      details
    };
  }
};
