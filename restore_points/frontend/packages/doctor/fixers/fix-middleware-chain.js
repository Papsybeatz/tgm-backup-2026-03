import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'fix-middleware-chain',
  description:
    'Repairs Express middleware ordering, ensures JSON/CORS presence, removes duplicates, and moves error handler to bottom.',

  async run({ projectRoot, backendPath, checkResult }) {
    const { details } = checkResult;
    const logs = [];

    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;
    const entryFile = details.entryFile;

    if (!entryFile || !fs.existsSync(entryFile)) {
      return {
        ok: false,
        message: 'No backend entry file to fix.',
        logs
      };
    }

    let content = fs.readFileSync(entryFile, 'utf8');
    const lines = content.split(/\r?\n/);

    // 1. Ensure express.json() exists and is early
    if (!details.hasJson) {
      logs.push('Adding express.json() middleware.');
      const insertIndex = lines.findIndex(l => l.includes('const app ='));
      lines.splice(insertIndex + 1, 0, `app.use(express.json({ limit: '1mb' }));`);
    }

    // 2. Ensure CORS exists
    if (!details.hasCors) {
      logs.push('Adding CORS middleware.');
      const insertIndex = lines.findIndex(l => l.includes('const app ='));
      lines.splice(insertIndex + 1, 0, `import cors from 'cors';`);
      lines.splice(insertIndex + 2, 0, `app.use(cors());`);
    }

    // 3. Remove middleware after app.listen()
    if (details.middlewareAfterListen.length > 0) {
      logs.push('Removing middleware declared after app.listen().');
      const listenIndex = lines.findIndex(l => l.includes('app.listen('));
      for (let i = lines.length - 1; i > listenIndex; i--) {
        if (lines[i].trim().startsWith('app.use(')) {
          lines.splice(i, 1);
        }
      }
    }

    // 4. Remove duplicate express.json()
    if (details.duplicateMiddleware.includes('express.json')) {
      logs.push('Removing duplicate express.json() middleware.');
      let found = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('express.json')) {
          if (!found) {
            found = true;
          } else {
            lines.splice(i, 1);
            i--;
          }
        }
      }
    }

    // 5. Ensure error handler is last
    if (!details.hasErrorHandler) {
      logs.push('Adding default error handler middleware.');
      lines.push(
        `app.use((err, req, res, next) => {`,
        `  console.error('Error:', err);`,
        `  res.status(500).json({ error: 'Internal server error' });`,
        `});`
      );
    }

    fs.writeFileSync(entryFile, lines.join('\n'));

    return {
      ok: true,
      message: 'Middleware chain repaired.',
      logs,
      updatedFiles: [entryFile]
    };
  }
};
