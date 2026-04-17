import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'backend-route-map',
  description: 'Scans backend for router files, mounted paths, and consistency (Hybrid mode).',

  async run({ projectRoot, backendPath }) {
    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;
    const apiDir = path.join(root, 'api');

    const details = {
      root,
      apiDir,
      routerFiles: [],
      mountedRouters: [],
      unmountedRouters: [],
      miswiredRouters: [],
      duplicateMounts: [],
      entryFile: null
    };

    // 1. Identify backend entry file
    const candidates = ['server.js', 'index.js', 'app.js']
      .map(f => path.join(root, f))
      .filter(f => fs.existsSync(f));

    if (candidates.length === 0) {
      return {
        ok: false,
        message: 'No backend entry file found.',
        details
      };
    }

    const entryFile = candidates[0];
    details.entryFile = entryFile;

    const entryContent = fs.readFileSync(entryFile, 'utf8');

    // 2. Scan /api directory for router files
    if (fs.existsSync(apiDir)) {
      const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const full = path.join(apiDir, file);
        const content = fs.readFileSync(full, 'utf8');

        const hasRouter = content.includes('express.Router(');
        const exportsRouter =
          content.includes('export default router') ||
          content.includes('module.exports = router');

        details.routerFiles.push({
          file,
          full,
          hasRouter,
          exportsRouter
        });
      }
    }

    // 3. Detect mounted routers in entry file
    const mountRegex = /app\.use\(['"`](.*?)['"`],\s*(.*?)\)/g;
    let match;
    while ((match = mountRegex.exec(entryContent)) !== null) {
      details.mountedRouters.push({
        path: match[1],
        variable: match[2]
      });
    }

    // 4. Hybrid logic
    for (const rf of details.routerFiles) {
      const isMounted = details.mountedRouters.some(m =>
        m.variable.includes(path.basename(rf.file, '.js'))
      );

      if ((rf.hasRouter || rf.exportsRouter) && !isMounted) {
        details.unmountedRouters.push(rf.file);
      }

      if (!rf.hasRouter && rf.exportsRouter) {
        details.miswiredRouters.push(rf.file);
      }
    }

    // 5. Duplicate mounts
    const mountCounts = {};
    for (const m of details.mountedRouters) {
      mountCounts[m.path] = (mountCounts[m.path] || 0) + 1;
    }
    details.duplicateMounts = Object.entries(mountCounts)
      .filter(([_, count]) => count > 1)
      .map(([path]) => path);

    const ok =
      details.unmountedRouters.length === 0 &&
      details.miswiredRouters.length === 0 &&
      details.duplicateMounts.length === 0;

    return {
      ok,
      message: ok
        ? 'Backend route map is consistent.'
        : 'Backend route map has inconsistencies.',
      details
    };
  }
};
