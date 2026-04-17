// Doctor check: Validate correct OpenAI key for environment
import { createProviders } from "../../../ai/providers.js";

export const id = "openai-key-validation";
export const description = "Validates OpenAI API key matches environment and is functional.";

export async function run(context) {
  const env = process.env;
  const expectedEnv = env.NODE_ENV === "production" ? "prod" : "dev";
  const key = env.OPENAI_API_KEY || "";
  const keyType = key.includes("sk-prod") ? "prod" : key.includes("sk-dev") ? "dev" : "unknown";
  const providers = createProviders(env);
  let status = "ok";
  let message = "";

  if (!key) {
    status = "error";
    message = "Missing OPENAI_API_KEY.";
  } else if (keyType !== expectedEnv) {
    status = "error";
    message = `Key type (${keyType}) does not match environment (${expectedEnv}).`;
  } else {
    try {
      const result = await providers.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "ping" }],
      });
      message = result.choices?.[0]?.message?.content || "Model responded.";
    } catch (err) {
      status = "error";
      message = err.message || "OpenAI model failed.";
    }
  }

  return {
    name: "openai-key-validation",
    status,
    message,
    details: { keyType, expectedEnv, keyLoaded: !!key }
  };
}
