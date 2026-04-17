// packages/doctor/checks/ai-route-integrity.js
import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'ai-route-integrity',
  description: 'Ensures backend AI route (/api/ai) exists, is imported, and mounted correctly.',

  async run({ projectRoot }) {
    const apiFile = path.join(projectRoot, 'api', 'ai.js');
    const serverFile = path.join(projectRoot, 'server.js');
    const indexFile = path.join(projectRoot, 'index.js');

    const entryFile = fs.existsSync(serverFile) ? serverFile : indexFile;

    const results = {
      aiFileExists: fs.existsSync(apiFile),
      entryFileExists: fs.existsSync(entryFile),
      importPresent: false,
      mountPresent: false,
      entryFile,
      apiFile
    };

    if (!results.entryFileExists) {
      return {
        ok: false,
        message: 'No server entry file found (server.js or index.js).',
        details: results
      };
    }

    const entryContent = fs.readFileSync(entryFile, 'utf8');

    results.importPresent =
      entryContent.includes("require('./api/ai')") ||
      entryContent.includes("from './api/ai'");

    results.mountPresent =
      entryContent.includes("app.use('/api/ai'") ||
      entryContent.includes('app.use("/api/ai"');

    const ok =
      results.aiFileExists &&
      results.importPresent &&
      results.mountPresent;

    return {
      ok,
      message: ok
        ? 'AI route is correctly wired.'
        : 'AI route is missing or incorrectly wired.',
      details: results
    };
  }
};