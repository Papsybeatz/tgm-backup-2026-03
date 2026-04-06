// WorkflowEngine.jsx
// Orchestrates multi-step flows across sub-agents for The Grants Master

const WORKFLOWS = {
  "Full Grant Workflow": [
    "PlannerAgent",
    "DraftAgent",
    "ValidatorAgent",
    "PolisherAgent"
  ],
  "Quick Draft Workflow": [
    "PlannerAgent",
    "DraftAgent"
  ],
  "Validation Only Workflow": [
    "ValidatorAgent"
  ],
  "Polish Only Workflow": [
    "PolisherAgent"
  ]
};

/**
 * Maps a user goal to a workflow and returns the ordered agent steps.
 * @param {string} goal - The user's goal or request.
 * @returns {object} Workflow routing output
 */
export function routeWorkflow(goal) {
  const g = goal.toLowerCase();
  let workflowName = "Full Grant Workflow";
  if (/quick draft|fast draft|just a draft/.test(g)) workflowName = "Quick Draft Workflow";
  else if (/validate|check|review/.test(g)) workflowName = "Validation Only Workflow";
  else if (/polish|refine|rewrite|improve/.test(g)) workflowName = "Polish Only Workflow";

  const steps = WORKFLOWS[workflowName].map((agent, idx) => ({ step: idx + 1, agent }));
  return {
    workflow: workflowName,
    steps
  };
}
