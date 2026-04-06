// WorkflowEngine.js

// Insert EvaluatorAgent after DraftAgent, ValidatorAgent, PolisherAgent
const WORKFLOWS = {
  "Full Grant Workflow": [
    "PlannerAgent",
    "DraftAgent", "EvaluatorAgent",
    "ValidatorAgent", "EvaluatorAgent",
    "PolisherAgent", "EvaluatorAgent"
  ],
  "Quick Draft Workflow": [
    "PlannerAgent",
    "DraftAgent", "EvaluatorAgent"
  ],
  "Validation Only Workflow": [
    "ValidatorAgent", "EvaluatorAgent"
  ],
  "Polish Only Workflow": [
    "PolisherAgent", "EvaluatorAgent"
  ]
};

export function routeWorkflow(goal) {
  const g = goal.toLowerCase();
  let workflowName = "Full Grant Workflow";
  if (/quick draft|fast draft|just a draft/.test(g)) workflowName = "Quick Draft Workflow";
  else if (/validate|check|review/.test(g)) workflowName = "Validation Only Workflow";
  else if (/polish|refine|rewrite|improve/.test(g)) workflowName = "Polish Only Workflow";
  const steps = WORKFLOWS[workflowName].map((agent, idx) => ({ step: idx + 1, agent }));
  return { workflow: workflowName, steps };
}


import GrantMemory from '../memory/GrantMemory.js';
import { getAgent } from '../core/AgentRegistry.js';

export class WorkflowState {
  constructor(workflowObj, userId, memory) {
    this.workflow = workflowObj.workflow;
    this.steps = workflowObj.steps;
    this.currentStep = 1;
    this.totalSteps = this.steps.length;
    this.previousOutput = null;
    this.paused = false;
    this.userId = userId;
    this.memory = memory;
  }
  get nextAgent() { return this.steps[this.currentStep - 1]?.agent || null; }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  retry() { this.currentStep = Math.max(1, this.currentStep - 2); }
  skip() { if (this.currentStep < this.totalSteps) this.currentStep++; }

  // Main workflow step execution
  async advance(output) {
    this.previousOutput = output;
    const agentName = this.nextAgent;
    if (!agentName) return;
    const agent = getAgent(agentName);
    let result = null;
    if (agentName === 'EvaluatorAgent') {
      // Evaluate previous output
      const prevAgent = this.steps[this.currentStep - 2]?.agent || '';
      result = await agent({
        output: this.previousOutput,
        context: {},
        previousAgent: prevAgent
      });
      // Save evaluation to memory
      GrantMemory.saveEvaluation(this.userId, prevAgent, result, this.memory);
      // If retry recommended, loop back to previous agent
      if (result.retryRecommended) {
        this.currentStep = Math.max(1, this.currentStep - 1); // Go back to previous agent
        return result;
      }
    } else if (agent && agent.handler) {
      result = await agent.handler(this.previousOutput, this.memory);
      this.previousOutput = result.output;
    }
    if (this.currentStep < this.totalSteps) this.currentStep++;
    return result;
  }
}
