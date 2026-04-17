import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'fix-backend-route-map',
  description: 'Auto-mounts unmounted routers and repairs miswired router files (Hybrid mode).',

  async run({ projectRoot, backendPath, checkResult }) {
    const { details } = checkResult;
    const logs = [];

    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;
    const entryFile = details.entryFile;
    let entryContent = fs.readFileSync(entryFile, 'utf8');

    // 1. Auto-mount unmounted routers
    for (const file of details.unmountedRouters) {
      const base = path.basename(file, '.js');
      const importLine = `import ${base}Router from './api/${file}';`;
      const mountLine = `app.use('/api/${base}', ${base}Router);`;

      if (!entryContent.includes(importLine)) {
        entryContent = importLine + '\n' + entryContent;
        logs.push(`Added import for ${file}.`);
      }

      if (!entryContent.includes(mountLine)) {
        entryContent += `\n${mountLine}\n`;
        logs.push(`Mounted router /api/${base}.`);
      }
    }

    // 2. Fix miswired routers (export missing)
    for (const file of details.miswiredRouters) {
      const full = path.join(root, 'api', file);
      let content = fs.readFileSync(full, 'utf8');

      if (!content.includes('export default router')) {
        content += `\nexport default router;\n`;
        fs.writeFileSync(full, content);
        logs.push(`Added missing export default router to ${file}.`);
      }
    }

    // 3. Write updated entry file
    fs.writeFileSync(entryFile, entryContent);

    return {
      ok: true,
      message: 'Backend route map repaired.',
      logs,
      updatedFiles: [entryFile]
    };
  }
};
