// Doctor check: Validate correct Groq key for environment
import { createProviders } from "../../../ai/providers.js";

export const id = "groq-key-validation";
export const description = "Validates Groq API key matches environment and is functional.";

export async function run(context) {
  const env = process.env;
  const expectedEnv = env.NODE_ENV === "production" ? "prod" : "dev";
  const key = env.GROQ_API_KEY || "";
  const keyType = key.includes("prod") ? "prod" : key.includes("dev") ? "dev" : "unknown";
  const providers = createProviders(env);
  let status = "ok";
  let message = "";

  if (!key) {
    status = "error";
    message = "Missing GROQ_API_KEY.";
  } else if (keyType !== expectedEnv) {
    status = "error";
    message = `Key type (${keyType}) does not match environment (${expectedEnv}).`;
  } else {
    try {
      const result = await providers.groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: "ping" }],
      });
      message = result.choices?.[0]?.message?.content || "Model responded.";
    } catch (err) {
      status = "error";
      message = err.message || "Groq model failed.";
    }
  }

  return {
    name: "groq-key-validation",
    status,
    message,
    details: { keyType, expectedEnv, keyLoaded: !!key }
  };
}
