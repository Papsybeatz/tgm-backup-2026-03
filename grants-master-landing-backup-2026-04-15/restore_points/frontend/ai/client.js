
import { createProviders } from "./providers.js";
import { selectProvider } from "./router.js";
import { logAIUsage } from "./usage.js";

export function createAI(env) {
  const providers = createProviders(env);

  async function callProvider(providerName, { model, prompt }) {
    const client = providers[providerName];
    if (!client) throw new Error(`Provider ${providerName} not configured`);

    const payload = {
      model,
      messages: [{ role: "user", content: prompt }],
    };

    switch (providerName) {
      case "openai":
        return client.chat.completions.create(payload);
      case "groq":
        return client.chat.completions.create(payload);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  // Estimate cost per request (simple placeholder)
  function estimateCost(provider, model, tokensIn, tokensOut) {
    // Example: $0.002 per 1K tokens Groq, $0.03 per 1K tokens OpenAI
    const rates = {
      groq: 0.002,
      openai: 0.03
    };
    const totalTokens = tokensIn + tokensOut;
    return ((rates[provider] || 0) * totalTokens) / 1000;
  }

  return {
    async generate({ prompt, tier = "free", model, userId }) {
      const chain = selectProvider({ tier, providers });

      for (const providerName of chain) {
        try {
          const usedModel =
            model ||
            (providerName === "openai"
              ? "gpt-4.1-mini"
              : "llama3-70b-8192");
          const result = await callProvider(providerName, {
            model: usedModel,
            prompt,
          });
          // Token counting (placeholder)
          const tokensIn = prompt.length / 4; // rough estimate
          const tokensOut = (result.choices?.[0]?.message?.content?.length || 0) / 4;
          const cost = estimateCost(providerName, usedModel, tokensIn, tokensOut);
          await logAIUsage({
            userId,
            provider: providerName,
            model: usedModel,
            tokensIn,
            tokensOut,
            cost,
            timestamp: new Date().toISOString()
          });
          return {
            provider: providerName,
            output: result.choices?.[0]?.message?.content || "",
            tokensIn,
            tokensOut,
            cost
          };
        } catch (err) {
          console.error(`[AI] ${providerName} failed:`, err.message);
          continue;
        }
      }

      throw new Error("All AI providers failed");
    },
  };
}
