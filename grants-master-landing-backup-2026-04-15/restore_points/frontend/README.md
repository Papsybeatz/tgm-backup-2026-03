# The Grants Master

A modular agentic workflow engine for grant writing, validation, and SaaS deployment.

## Installation

```
npm install the-grants-master
```

## Usage Example

```js
import { getAgent, executeAgent, routeWorkflow } from 'the-grants-master';
const agent = getAgent('PlannerAgent');
const result = await executeAgent('PlannerAgent', { ...input }, memory);
```

## Architecture
- Modular agents (planning, drafting, validation, polishing, pricing, team, matching, upload)
- AgentRegistry and AgentExecutor for orchestration
- WorkflowEngine for chaining and state
- MemoryRouter for data passing
- Tier-based gating and usage metering

## Workflows
- Full Grant Workflow: Planner → Draft → Validate → Polish
- Quick Draft Workflow: Planner → Draft

## Tier Gating & Metering
- Free, Starter, Pro, Team, Agency tiers
- Usage limits and feature gating

## SaaS Deployment
- See /app for frontend/backend integration

## License
MIT
