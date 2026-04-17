import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'backend-structure-integrity',
  description: 'Validates core backend structure: entry file, express app, JSON middleware, and /api routing.',

  async run({ projectRoot, backendPath }) {
    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;

    const candidates = ['server.js', 'index.js', 'app.js']
      .map(f => path.join(root, f))
      .filter(f => fs.existsSync(f));

    const details = { root, candidates, entryFile: null };

    if (candidates.length === 0) {
      return {
        ok: false,
        message: 'No backend entry file found (server.js, index.js, or app.js).',
        details
      };
    }

    const entryFile = candidates[0];
    details.entryFile = entryFile;

    const content = fs.readFileSync(entryFile, 'utf8');

    const hasExpressImport =
      content.includes("from 'express'") || content.includes("require('express')");
    const hasAppInit = /const\s+app\s*=\s*express\(\)/.test(content);
    const hasJsonMiddleware =
      content.includes('app.use(express.json(') ||
      content.includes('app.use(express.urlencoded(');
    const hasApiRouting =
      content.includes("app.use('/api") || content.includes('app.use("/api');

    const ok = hasExpressImport && hasAppInit && hasJsonMiddleware && hasApiRouting;

    return {
      ok,
      message: ok
        ? 'Backend structure looks valid (express app, JSON middleware, /api routing).'
        : 'Backend structure is incomplete or misconfigured.',
      details: {
        ...details,
        hasExpressImport,
        hasAppInit,
        hasJsonMiddleware,
        hasApiRouting
      }
    };
  }
};
