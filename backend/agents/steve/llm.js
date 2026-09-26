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

const DEFAULT_GROQ_MODEL = process.env.GROQ_AGENT_MODEL || 'llama-3.3-70b-versatile';
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';

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

  const body = {
    model: options.model || config.model,
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

  const parsed = await requestJson(config, body, options.timeoutMs);
  const choice = parsed?.choices?.[0];
  const message = choice?.message || {};

  return {
    content: typeof message.content === 'string' ? message.content : '',
    toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
    finishReason: choice?.finish_reason || 'stop',
    raw: message,
    usage: parsed?.usage || null,
  };
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
