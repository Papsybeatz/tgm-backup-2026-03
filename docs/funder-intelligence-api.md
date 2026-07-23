# Funder Intelligence API (Sidecar)

This subsystem is a standalone sidecar API that runs in parallel with the existing TGM user application.

## Why this exists

- Zero disruption to current users, signups, billing, and draft flows.
- Separate API surface for funders and grant platforms.
- Dedicated sidecar datastore for funders, rubrics, API keys, cycle analytics, and webhook configs.

## Runtime separation

- Existing TGM backend stays on its current server and routes.
- Sidecar service runs independently:
  - Entry point: `backend/funder-intelligence-api/server.js`
  - Default port: `4500` (`FUNDER_INTELLIGENCE_PORT` overrides)
  - Health: `GET /health`

## V1 endpoints

- `POST /funder/register`
  - Register funder profile + rubric definition.
  - Returns `funder_id`, `api_key`, and `validation_report`.

- `POST /application/score` (requires `x-api-key`)
  - Rubric-based scoring with per-criterion scores, overall score, confidence, explanation, reviewer flags, risk score.

- `POST /application/funder-fit` (requires `x-api-key`)
  - Funder-fit intelligence with eligibility checks, fit score, reasons, and recommended band (`reject`, `review`, `fast-track`).

- `POST /batch/score` (requires `x-api-key`)
  - Batch scoring with cohort analytics:
    - Score distribution
    - Alignment clusters
    - Risk clusters
    - Shortlist suggestions
    - Bias detection signals

- `POST /cycle/intelligence` (requires `x-api-key`)
  - Portfolio/cycle layer with shortlist recommendations, alignment heatmap, and over/under-funding signals.

- `POST /webhook/config` (requires `x-api-key`)
  - Configure callback endpoint + suggested-status mapping.
  - Returns test event payload for integration verification.

## Auth model

- Funder registration mints a dedicated `api_key`.
- All intelligence endpoints require `x-api-key`.
- API keys are bound to a single funder and cannot access other funder IDs.

## Deterministic guardrails

- Eligibility checks are hard-pass/hard-fail logic.
- Budget sanity checks flag excessive admin ratio and weak program allocation.
- Rubric weights are numerically applied after criterion-level scoring.

## Local run

```bash
npm run start:funder-api
```

## Sidecar test

```bash
npm run test:funder-api
```
