// Doctor check: Validate Groq + OpenAI keys and models
import { createProviders } from "../../../ai/providers.js";

export const id = "ai-provider-integrity";
export const description = "Validates Groq and OpenAI API keys, models, quota, and network.";

export async function run(context) {
  const env = process.env;
  const providers = createProviders(env);
  const results = [];

  // Groq check
  if (providers.groq) {
    try {
      const groqResult = await providers.groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: "ping" }],
      });
      results.push({
        provider: "groq",
        status: "ok",
        output: groqResult.choices?.[0]?.message?.content || "",
      });
    } catch (err) {
      results.push({
        provider: "groq",
        status: "error",
        error: err.message,
        details: err?.response?.data || err?.toString(),
      });
    }
  } else {
    results.push({ provider: "groq", status: "missing", error: "Groq not configured" });
  }

  // OpenAI check
  if (providers.openai) {
    try {
      const openaiResult = await providers.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "ping" }],
      });
      results.push({
        provider: "openai",
        status: "ok",
        output: openaiResult.choices?.[0]?.message?.content || "",
      });
    } catch (err) {
      results.push({
        provider: "openai",
        status: "error",
        error: err.message,
        details: err?.response?.data || err?.toString(),
      });
    }
  } else {
    results.push({ provider: "openai", status: "missing", error: "OpenAI not configured" });
  }

  return {
    summary: results.map(r => `${r.provider}: ${r.status}`).join(", "),
    results,
  };
}
