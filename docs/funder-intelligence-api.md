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

- Funder registration is **internal-only** — public form submissions create a `FunderLead` record that goes through admin review.
- Approved funders receive credentials after completing Stripe checkout for their first grant cycle.
- All intelligence endpoints require `x-api-key` header.
- API keys are bound to a single funder and cannot access other funder IDs.
- Production keys (`tgm_fi_pk_…`) require `cycle_id` in every scoring request.
- Sandbox keys (`tgm_fi_sb_…`) bypass cycle enforcement — use them during integration testing.

## Per-cycle billing enforcement

Every scoring request (`/application/score`, `/application/funder-fit`, `/batch/score`) must include `cycle_id` when using a production key.

**Required in request body:**
```json
{
  "funder_id": "funder_abc123",
  "cycle_id": "your-cycle-id-from-activation",
  "application": { ... }
}
```

Error responses:
- `400` — `cycle_id` missing
- `402` — No active entitlement for this cycle (checkout not completed)
- `429` — Cycle quota exhausted (`applications_used >= applications_allowed`)

**`/cycle/intelligence` and `/webhook/config` do not require `cycle_id`** — they are analytics and config endpoints.

## Internal provisioning routes (protected)

These routes are called by the main TGM backend only. They are guarded by `x-internal-secret` header.

- `POST /internal/funders/provision` — provision funder + org API key (idempotent by orgName+email)
- `POST /internal/cycles/activate` — activate a paid cycle entitlement

## Smoke test

The smoke test now requires `FUNDER_INTELLIGENCE_INTERNAL_SECRET` to be set (or passed as env var). It will activate a test cycle before running scoring tests.



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

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `FUNDER_INTELLIGENCE_INTERNAL_SECRET` | `<32-byte hex>` | **Required** — shared with main backend. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

> Railway injects `PORT` automatically — do NOT set it manually.

**Also set on the main backend service:**

| Variable | Value | Notes |
|---|---|---|
| `FUNDER_INTELLIGENCE_BASE_URL` | `https://your-sidecar.up.railway.app` | URL of the sidecar service |
| `FUNDER_INTELLIGENCE_INTERNAL_SECRET` | `<same 32-byte hex>` | Must match the sidecar |
| `ADMIN_EMAIL` | `your@email.com` | Receives lead alerts |
| `FUNDER_PILOT_CYCLE_APPLICATIONS` | `50` | Default quota for pilot plan |
| `FUNDER_SCALE_CYCLE_APPLICATIONS` | `500` | Default quota for scale plan |

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
