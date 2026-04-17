import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'middleware-chain-integrity',
  description:
    'Validates Express middleware ordering, presence, duplication, and placement relative to app.listen().',

  async run({ projectRoot, backendPath }) {
    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;

    const candidates = ['server.js', 'index.js', 'app.js']
      .map(f => path.join(root, f))
      .filter(f => fs.existsSync(f));

    const details = {
      root,
      entryFile: null,
      hasJson: false,
      hasUrlencoded: false,
      hasCors: false,
      hasErrorHandler: false,
      jsonBeforeRoutes: true,
      middlewareAfterListen: [],
      duplicateMiddleware: [],
      shadowingMiddleware: []
    };

    if (candidates.length === 0) {
      return {
        ok: false,
        message: 'No backend entry file found.',
        details
      };
    }

    const entryFile = candidates[0];
    details.entryFile = entryFile;

    const content = fs.readFileSync(entryFile, 'utf8');
    const lines = content.split(/\r?\n/);

    let seenJson = false;
    let seenRoutes = false;
    let seenListen = false;

    const middlewareLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('app.listen(')) {
        seenListen = true;
      }

      if (line.startsWith('app.use(')) {
        middlewareLines.push({ line, index: i });

        if (line.includes('express.json')) {
          if (seenJson) details.duplicateMiddleware.push('express.json');
          seenJson = true;
          details.hasJson = true;
          if (seenRoutes) details.jsonBeforeRoutes = false;
        }

        if (line.includes('express.urlencoded')) {
          details.hasUrlencoded = true;
        }

        if (line.includes('cors(')) {
          details.hasCors = true;
        }

        if (seenListen) {
          details.middlewareAfterListen.push(line);
        }
      }

      if (line.startsWith('app.use(') && line.includes('/api')) {
        seenRoutes = true;
      }

      if (line.startsWith('app.use(') && line.includes('*')) {
        details.shadowingMiddleware.push(line);
      }

      if (line.startsWith('app.use(') && line.includes('(err,')) {
        details.hasErrorHandler = true;
      }
    }

    const ok =
      details.hasJson &&
      details.jsonBeforeRoutes &&
      details.middlewareAfterListen.length === 0 &&
      details.duplicateMiddleware.length === 0;

    return {
      ok,
      message: ok
        ? 'Middleware chain is valid.'
        : 'Middleware chain has ordering or structural issues.',
      details
    };
  }
};
