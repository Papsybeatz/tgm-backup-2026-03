/**
 * Steve — LLM transport
 * ----------------------------------------------------------------------------
 * A tiny OpenAI-compatible chat client that speaks the `tools` / `tool_calls`
 * protocol, so Steve can be a real tool-calling agent rather than an if/else
 * router. Works with Groq (default, already used elsewhere in TGM) or OpenAI.
 *
 * If no key is configured the caller falls back to Steve's deterministic
 * planner — the product never hard-fails, it just loses the natural-language
 * polish.
 */
const https = require('https');

// Groq's Llama models moved to Enterprise/contact-sales; the self-serve
// production models with tool calling are the GPT-OSS pair.
const DEFAULT_GROQ_MODEL = process.env.GROQ_AGENT_MODEL || 'openai/gpt-oss-120b';
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';

/**
 * Groq's model catalogue moves. If the configured model has been retired we try
 * the next candidate rather than silently degrading to the planner forever.
 * Only model-shaped errors trigger a fallback, so a bad key or a rejected tool
 * schema still fails fast instead of tripling latency.
 */
const GROQ_MODEL_FALLBACKS = [
  'openai/gpt-oss-120b', // current self-serve production model, tool calling
  'openai/gpt-oss-20b',  // fast/cheap fallback
  'llama-3.3-70b-versatile', // Enterprise plans only; kept last in case it is available
];
const MODEL_ERROR = /model|decommission|deprecat|not\s*found|does\s*not\s*exist|no\s*such/i;

let workingModel = null; // remembered across turns once one succeeds

/** A 429 tells us exactly how long to wait; honour it rather than giving up. */
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_WAIT_MS = 15000;

function parseRetryAfterMs(message) {
  const match = String(message || '').match(/try again in ([\d.]+)\s*s/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) + 400 : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function providerConfig() {
  if (process.env.GROQ_API_KEY) {
    return {
      name: 'groq',
      host: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: DEFAULT_GROQ_MODEL,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      host: 'api.openai.com',
      path: '/v1/chat/completions',
      key: process.env.OPENAI_API_KEY,
      model: DEFAULT_OPENAI_MODEL,
    };
  }
  return null;
}

function isEnabled() {
  return providerConfig() !== null;
}

function requestJson(config, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: config.host,
        path: config.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.key}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            return reject(new Error(`LLM returned non-JSON (${res.statusCode})`));
          }
          if (res.statusCode >= 400) {
            const message = parsed?.error?.message || `LLM error ${res.statusCode}`;
            return reject(new Error(message));
          }
          resolve(parsed);
        });
      },
    );
    req.setTimeout(timeoutMs || 45000, () => {
      req.destroy(new Error('LLM request timed out'));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Run one chat completion.
 * @returns {Promise<{content: string, toolCalls: Array, finishReason: string}>}
 */
async function chat(messages, options = {}) {
  const config = providerConfig();
  if (!config) throw new Error('NO_LLM_KEY');

  const buildBody = (model) => {
    const body = {
      model,
      messages,
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.4,
      max_tokens: options.maxTokens || 1600,
    };

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
      body.tool_choice = options.toolChoice || 'auto';
    }

    if (options.json) {
      body.response_format = { type: 'json_object' };
    }

    return body;
  };

  const candidates = [];
  if (options.model) candidates.push(options.model);
  else {
    if (workingModel) candidates.push(workingModel);
    if (process.env.GROQ_AGENT_MODEL) candidates.push(process.env.GROQ_AGENT_MODEL);
    if (config.name === 'groq') GROQ_MODEL_FALLBACKS.forEach((m) => candidates.push(m));
    else candidates.push(config.model);
  }
  const models = candidates.filter((m, i) => m && candidates.indexOf(m) === i);

  const failures = [];
  for (const model of models) {
    let rateLimitRetries = 0;
    // Inner loop retries the same model when the provider tells us how long to wait.
    for (;;) {
    try {
      const parsed = await requestJson(config, buildBody(model), options.timeoutMs);
      workingModel = model;
      const choice = parsed?.choices?.[0];
      const message = choice?.message || {};

      return {
        content: typeof message.content === 'string' ? message.content : '',
        toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
        finishReason: choice?.finish_reason || 'stop',
        raw: message,
        usage: parsed?.usage || null,
        model,
      };
    } catch (error) {
      const message = String(error?.message || error);
      const retryAfterMs = parseRetryAfterMs(message);

      // Rate limited: wait the requested time and try the SAME model again. The
      // free tier is only 8k TPM, so a long conversation will hit this often.
      if (retryAfterMs !== null && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
        rateLimitRetries += 1;
        const waitMs = Math.min(retryAfterMs, MAX_WAIT_MS);
        console.warn(`[STEVE] rate limited on ${model}, retrying in ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      failures.push(`${model}: ${message}`);
      // Only a model problem is worth trying the next candidate. A bad key or a
      // rejected tool schema will fail identically on every model.
      if (!MODEL_ERROR.test(message)) break;
      console.warn(`[STEVE] model "${model}" unavailable, trying next: ${message}`);
      break;
    }
    }
  }

  // Report every attempt, not just the last — otherwise a working primary model
  // failing for one reason is masked by a redundant fallback failing for another.
  throw new Error(failures.join(' || ') || 'LLM request failed');
}

/** Pull a JSON object out of a model reply, tolerating prose or code fences. */
function extractJson(text) {
  if (!text) return null;
  const raw = String(text).trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch (e) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch (inner) {
        return null;
      }
    }
    return null;
  }
}

module.exports = {
  isEnabled,
  chat,
  extractJson,
  providerConfig,
};
