import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'fix-backend-structure',
  description: 'Repairs core backend structure: express app, JSON middleware, and /api health route.',

  async run({ projectRoot, backendPath, checkResult }) {
    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;
    const { entryFile } = checkResult.details;

    if (!entryFile || !fs.existsSync(entryFile)) {
      return {
        ok: false,
        message: 'No backend entry file to fix.',
        logs: []
      };
    }

    let content = fs.readFileSync(entryFile, 'utf8');
    const logs = [];

    if (!content.includes("from 'express'") && !content.includes("require('express'")) {
      content = `import express from 'express';\n` + content;
      logs.push('Added express import.');
    }

    if (!/const\s+app\s*=\s*express\(\)/.test(content)) {
      content = content.replace(
        /const\s+app\s*=\s*[^;]+;/,
        'const app = express();'
      );
      if (!content.includes('const app = express();')) {
        content += `\nconst app = express();\n`;
      }
      logs.push('Normalized app initialization to const app = express().');
    }

    if (!content.includes('app.use(express.json(')) {
      content = content.replace(
        'const app = express();',
        `const app = express();\napp.use(express.json({ limit: '1mb' }));`
      );
      logs.push('Added express.json() middleware.');
    }

    if (!content.includes("app.use('/api") && !content.includes('app.use("/api')) {
      content += `\napp.get('/api/health', (req, res) => {\n  res.json({ ok: true, service: 'backend', route: '/api/health' });\n});\n`;
      logs.push('Added /api/health route for baseline API availability.');
    }

    fs.writeFileSync(entryFile, content);

    return {
      ok: true,
      message: 'Backend structure repaired and /api baseline route ensured.',
      logs,
      updatedFiles: [entryFile]
    };
  }
};
