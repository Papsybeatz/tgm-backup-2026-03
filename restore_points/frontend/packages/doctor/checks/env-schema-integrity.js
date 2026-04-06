import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

const REQUIRED_KEYS = [
  'NODE_ENV',
  'PORT',
  'BACKEND_PORT',
  'FRONTEND_ORIGIN',
  'BACKEND_ORIGIN',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'AI_PROVIDER',
  'AI_MODEL',
];

export default {
  id: 'env-schema-integrity',
  description: 'Validates .env presence, required keys, and basic formatting for backend configuration.',

  async run({ projectRoot, backendPath }) {
    const root = backendPath ? path.join(projectRoot, backendPath) : projectRoot;
    const envPath = path.join(root, '.env');

    const details = {
      root,
      envPath,
      exists: fs.existsSync(envPath),
      missingKeys: [],
      duplicateKeys: [],
      invalidLines: [],
      keys: {}
    };

    if (!details.exists) {
      return {
        ok: false,
        message: '.env file is missing.',
        details
      };
    }

    const raw = fs.readFileSync(envPath, 'utf8');

    const lines = raw.split(/\r?\n/);
    const seen = new Set();

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        details.invalidLines.push(line);
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();

      if (!key) {
        details.invalidLines.push(line);
        continue;
      }

      if (seen.has(key)) {
        details.duplicateKeys.push(key);
      } else {
        seen.add(key);
      }

      details.keys[key] = value;
    }

    for (const key of REQUIRED_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(details.keys, key)) {
        details.missingKeys.push(key);
      }
    }

    const ok =
      details.exists &&
      details.missingKeys.length === 0 &&
      details.invalidLines.length === 0;

    return {
      ok,
      message: ok
        ? '.env exists and satisfies required schema.'
        : '.env is present but missing keys or has formatting issues.',
      details
    };
  }
};
