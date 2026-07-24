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

## Enterprise automation endpoints

- `POST /funder/register` with `plan_tier: "enterprise"`
  - Auto-provisions:
    - org-level API key
    - SSO metadata
    - dedicated org bucket
    - default enterprise rubric template
    - default retention policy
    - default SLA profile
    - virtual account manager profile
  - Returns a complete onboarding packet in one response.

- `POST /enterprise/config` (enterprise only)
  - Updates enterprise config (for example, `sla_profile.alert_webhook_url`).

- `POST /enterprise/rubric/parse` (enterprise only)
  - Accepts rubric payload:
    - `format: "json" | "csv" | "pdf"`
    - `content: string`
  - Returns parsed `rubric_json`, validation report, and `rubric_draft_id`.

- `POST /enterprise/rubric/confirm` (enterprise only)
  - Deploys a parsed rubric draft to the live enterprise funder profile.

- `GET /enterprise/sla/heartbeat` (enterprise only)
  - Returns SLA health + p95 latency + rolling error rate.

- `POST /enterprise/support/ticket` (enterprise only)
  - Creates a priority enterprise support ticket assigned to the virtual account manager queue.

- `POST /enterprise/reports/monthly` (enterprise only)
  - Generates monthly enterprise report:
    - usage
    - score distribution
    - fit distribution
    - cycle analytics
    - SLA compliance

## Auth model

- Funder registration mints a dedicated `api_key`.
- All intelligence endpoints require `x-api-key`.
- API keys are bound to a single funder and cannot access other funder IDs.

## Deterministic guardrails

- Eligibility checks are hard-pass/hard-fail logic.
- Budget sanity checks flag excessive admin ratio and weak program allocation.
- Rubric weights are numerically applied after criterion-level scoring.

## Deploy to Railway (separate service)

### Step 1 — Create a new Railway service

In your Railway project:
1. Click **New Service → Empty Service**
2. Name it: `TGM Funder Intelligence API`
3. Under **Settings → Source**: connect to the `Papsybeatz/tgm-backup-2026-03` repo
4. Set **Root Directory** to: `backend/funder-intelligence-api`
5. Railway auto-detects `package.json` and runs `npm start` → `node server.js`

### Step 2 — Set environment variables in Railway dashboard

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |

> Railway injects `PORT` automatically — do NOT set it manually.

### Step 3 — Deploy and confirm health check

Railway will hit `GET /health` — it must return:
```json
{ "service": "funder-intelligence-api", "status": "ok" }
```

### Step 4 — Run the production smoke test

```bash
node backend/funder-intelligence-api/smoke-test.js https://your-railway-url.up.railway.app
```

Covers all 9 checks: health, register, score, fit, batch, cycle, webhook, auth protection. Prints `PASS/FAIL` per endpoint and outputs a real `funder_id` + `api_key` for your first pilot.

### Step 5 — Test with Postman / Thunder Client

Import: `docs/funder-intelligence-api.postman.json`

The collection auto-saves `funder_id`, `api_key`, `batch_id`, and `cycle_id` between requests so the full workflow runs in sequence.

## ⚠️ Filesystem note

The current datastore (`data/sidecar-db.json`) is file-based. Railway's filesystem is ephemeral — data resets on redeploy. For the **pilot phase** this is fine (re-register funders after each deploy). When you onboard paying funders, swap the datastore to a Postgres table via Railway's managed Postgres.

## Local run

```bash
npm run start:funder-api
```

## Local unit test

```bash
npm run test:funder-api
```

## Local smoke test against a live deployment

```bash
node backend/funder-intelligence-api/smoke-test.js https://your-railway-url.up.railway.app
```
