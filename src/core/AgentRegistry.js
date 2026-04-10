// AgentRegistry.js





import EvaluatorAgent from '../agents/EvaluatorAgent.js';
import FunderFitScoringAgent from '../agents/FunderFitScoringAgent.js';

const registry = {
  PlannerAgent,
  DraftAgent,
  ValidatorAgent,
  PolisherAgent,
  PricingAgent,
  TeamAgent,
  GrantMatchingAgent,
  DocumentUploadAgent,
  GrantDraftComparisonAgent,
  FunderFitScoringAgent,
  EvaluatorAgent
};

export function getAgent(name) {
  return registry[name] || null;
}

export function listAgents() {
  return Object.values(registry).map(({ name, description, capabilities }) => ({ name, description, capabilities }));
}
