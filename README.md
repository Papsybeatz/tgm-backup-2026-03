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

## Backend Railway config
- Backend service root: `backend`
- Railway config: `backend/railway.json`
- Backend env example: `backend/.env.example`
- Recommended Brevo route:
  - `BREVO_API_KEY` = secret, set in Railway dashboard
  - `BREVO_FROM_EMAIL` = `support@thegrantsmaster.com`
  - `BREVO_FROM_NAME` = `The Grants Master`
  - `BREVO_FUNDER_LIST_ID` = dedicated Brevo list for funder API requests
  - keep `BREVO_LIST_ID` only as fallback for older/shared flows

## Funder Intelligence API (Sidecar)
- Separate subsystem: `backend/funder-intelligence-api`
- Runs in parallel with existing TGM user flows
- Docs: `docs/funder-intelligence-api.md`
- Start: `npm run start:funder-api`

## License
MIT
