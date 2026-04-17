// AgentRouter.jsx
// Routing layer for The Grants Master agent workflow

/**
 * Determines which sub-agent should handle a user request.
 * @param {string} userInput - The user's request or message.
 * @returns {{route: string, reason: string}}
 */
export function routeAgent(userInput) {
  const input = userInput.toLowerCase();

  // Routing rules
  if (
    /grant details|requirements|break down|extract|plan|inputs/.test(input)
  ) {
    return {
      route: "PlannerAgent",
      reason: "User provided grant details or requirements, so PlannerAgent will extract inputs and create a plan."
    };
  }
  if (/draft|first draft|generate draft/.test(input)) {
    return {
      route: "DraftAgent",
      reason: "User asked for a draft, so DraftAgent will generate the first full draft."
    };
  }
  if (/improve|validate|check|clarity|alignment|funder fit|missing/.test(input)) {
    return {
      route: "ValidatorAgent",
      reason: "User asked to improve or validate, so ValidatorAgent will check clarity, alignment, funder fit, and missing elements."
    };
  }
  if (/refine|rewrite|polish|improve tone|structure|professionalism/.test(input)) {
    return {
      route: "PolisherAgent",
      reason: "User asked to refine, rewrite, or polish, so PolisherAgent will improve tone, structure, and professionalism."
    };
  }
  if (/pricing|billing|upgrade|stripe|payment/.test(input)) {
    return {
      route: "PricingAgent",
      reason: "User asked about pricing, billing, or upgrades, so PricingAgent will handle billing and Stripe queries."
    };
  }
  if (/team|seat|member|add|remove/.test(input)) {
    return {
      route: "TeamAgent",
      reason: "User asked about team members or seats, so TeamAgent will handle seat management and team settings."
    };
  }
  return {
    route: "UnknownAgent",
    reason: "No matching agent found."
  };
}
