// AgentRouter.js
// Routing layer for The Grants Master agent workflow

  const input = userInput.toLowerCase();
  if (/review this|is this good|can it be better|evaluate output|self-evaluate|self review|self-evaluation/.test(input)) {
    return {
      route: "EvaluatorAgent",
      reason: "User asked for review or evaluation, so EvaluatorAgent will handle the request."
    };
  }
  if (/does this fit|is this a good match|should i apply|funder fit|fit score|alignment score/.test(input)) {
    return {
      route: "FunderFitScoringAgent",
      reason: "User asked about funder fit or match, so FunderFitScoringAgent will handle the request."
    };
  }
  if (/compare drafts|which is better|evaluate these|draft comparison|side-by-side/.test(input)) {
    return {
      route: "GrantDraftComparisonAgent",
      reason: "User asked to compare drafts or evaluate them, so GrantDraftComparisonAgent will handle the request."
    };
  }
  if (/find grants|what grants fit|funding opportunities|grant matching|project details|organization type|mission|focus area|project description|funding amount|location|timeline|urgency/.test(input)) {
    return {
      route: "GrantMatchingAgent",
      reason: "User asked to find grants, match funding, or provided project details, so GrantMatchingAgent will handle the request."
    };
  }
  if (/grant details|requirements|break down|extract|plan|inputs/.test(input)) {
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
  if (/team|seat|member|invite/.test(input)) {
    return {
      route: "TeamAgent",
      reason: "User asked about team members or seats, so TeamAgent will handle seat management and team settings."
    };
  }
  return {
    route: "PlannerAgent",
    reason: "Default: No specific keywords matched, so PlannerAgent will handle the request."
  };
