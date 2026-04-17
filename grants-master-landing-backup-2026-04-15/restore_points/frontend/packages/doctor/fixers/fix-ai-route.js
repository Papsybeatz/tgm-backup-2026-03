// packages/doctor/fixers/fix-ai-route.js
import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'fix-ai-route',
  description: 'Creates and wires the /api/ai route into the backend.',

  async run({ projectRoot, checkResult }) {
    const { aiFile, entryFile } = checkResult.details;

    // 1. Ensure api/ai.js exists
    if (!fs.existsSync(aiFile)) {
      const dir = path.dirname(aiFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(
        aiFile,
        `
import express from 'express';
const router = express.Router();

router.post('/', async (req, res) => {
  res.json({ output: "AI route is alive." });
});

export default router;
`.trim()
      );
    }

    // 2. Ensure entry file imports and mounts the router
    let entryContent = fs.readFileSync(entryFile, 'utf8');

    if (!entryContent.includes("import aiRouter")) {
      entryContent =
        `import aiRouter from './api/ai.js';\n` + entryContent;
    }

    if (!entryContent.includes("app.use('/api/ai'")) {
      entryContent = entryContent.replace(
        /app\.use\(.*\);?/,
        match => `${match}\napp.use('/api/ai', aiRouter);`
      );
    }

    fs.writeFileSync(entryFile, entryContent);

    return {
      ok: true,
      message: 'AI route created and wired successfully.',
      updatedFiles: [aiFile, entryFile]
    };
  }
};