export function selectProvider({ tier, providers }) {
  // Free / standard: Groq → OpenAI fallback
  const freeChain = ["groq", "openai"];

  // Premium: OpenAI → Groq fallback
  const premiumChain = ["openai", "groq"];

  const chain = tier === "premium" ? premiumChain : freeChain;

  return chain.filter((p) => providers[p]);
}
