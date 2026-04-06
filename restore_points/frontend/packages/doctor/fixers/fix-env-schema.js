import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

const REQUIRED_DEFAULTS = {
  NODE_ENV: 'development',
  PORT: '5173',
  BACKEND_PORT: '4000',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  BACKEND_ORIGIN: 'http://localhost:4000',
  OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY_HERE',
  GROQ_API_KEY: 'YOUR_GROQ_API_KEY_HERE',
  AI_PROVIDER: 'openai',
  AI_MODEL: 'gpt-4.1-mini'
};

export default {
  id: 'fix-env-schema',
  description: 'Creates or normalizes .env, injects required keys with safe defaults/placeholders.',

  async run({ projectRoot, backendPath, checkResult }) {
    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;
    const envPath = path.join(root, '.env');
    const logs = [];

    let lines = [];
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      lines = raw.split(/\r?\n/);
      logs.push('Loaded existing .env file.');
    } else {
      logs.push('No .env found. Creating a new one.');
    }

    const kv = {};
    const preservedComments = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('#')) {
        preservedComments.push(line);
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        // skip invalid lines; they’ll be replaced by normalized entries
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!key) continue;

      kv[key] = value;
    }

    for (const [key, def] of Object.entries(REQUIRED_DEFAULTS)) {
      if (!Object.prototype.hasOwnProperty.call(kv, key)) {
        kv[key] = def;
        logs.push(`Injected missing key ${key} with default/placeholder value.`);
      }
    }

    const outLines = [];
    outLines.push('# Auto-normalized by Enterprise Doctor env-schema-integrity');
    outLines.push('# Review and replace placeholder API keys before production.');
    outLines.push('');

    for (const c of preservedComments) {
      outLines.push(c);
    }
    if (preservedComments.length) outLines.push('');

    for (const [key, value] of Object.entries(kv)) {
      outLines.push(`${key}=${value}`);
    }

    outLines.push('');

    fs.writeFileSync(envPath, outLines.join('\n'));
    logs.push(`Wrote normalized .env to ${envPath}.`);

    return {
      ok: true,
      message: '.env schema repaired and normalized.',
      logs,
      envPath
    };
  }
};
