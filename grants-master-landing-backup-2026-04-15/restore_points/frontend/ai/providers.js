import OpenAI from "openai";
import Groq from "groq-sdk";

export function createProviders(env) {
  const providers = {};

  if (env.OPENAI_API_KEY) {
    providers.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  if (env.GROQ_API_KEY) {
    providers.groq = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  return providers;
}
