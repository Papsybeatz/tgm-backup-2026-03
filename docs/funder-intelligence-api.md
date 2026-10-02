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

---

## Deploying the sidecar alongside the backend

This service is **not** part of the main backend process. It is a standalone
Express app with its own `package.json` and its own `railway.json`, and it must
run as a **second Railway service in the same project**.

| | Main backend | Funder Intelligence sidecar |
|---|---|---|
| Root directory | repo root | `backend/funder-intelligence-api` |
| Start command | `node server.js` (from `railway.json`) | `node server.js` (from its own `railway.json`) |
| Health check | — | `/health` |
| Listens on | `process.env.PORT` | `process.env.PORT`, then `FUNDER_INTELLIGENCE_PORT`, then `4500` |
| Persists to | Postgres (`DATABASE_URL`) | a JSON file on disk (see volume note) |

The sidecar's HTTP surface, for reference:

| Route | Auth | Used by |
|---|---|---|
| `GET /health` | none | Railway health check |
| `POST /internal/funders/provision` | `x-internal-secret` | `adminFunders.js` |
| `POST /internal/cycles/activate` | `x-internal-secret` | `webhooks/stripe.js` (`activateFunderCycle`) |
| `POST /funder/register` | `x-internal-secret` | key minting (see below) |
| `GET /funder/...`, `POST /funder-fit` | `x-api-key` | `funderReviewer.js`, funder API clients |

### ⚠️ The volume is not optional

The sidecar stores everything — funders, API keys, cycles, entitlements — in a
single JSON file:

```js
path.join(__dirname, '..', 'data', 'sidecar-db.json')
```

That path is built from `__dirname` and there is **no environment variable to
override it**. Railway's container filesystem is ephemeral, so without a volume
every deploy wipes the file.

**Attach a Railway volume mounted at the sidecar's `data/` directory** (i.e.
`/app/data` when the root directory is `backend/funder-intelligence-api`).

This matters more than it looks. The `FUNDER_INTELLIGENCE_REVIEWER_KEY` you set
on the backend is an API key that lives *inside this file*. Wipe the file and the
key you configured becomes orphaned — reviewer calls start returning 401 and the
key must be re-minted. The volume is what keeps the backend's configuration
valid.

## Environment variables across both services

**Sidecar service:**

| Variable | Required | Value |
|---|---|---|
| `FUNDER_INTELLIGENCE_INTERNAL_SECRET` | yes | Long random string you generate. Gates every `/internal/*` route and `/funder/register`. |
| `NODE_ENV` | yes | `production` |
| `PORT` | — | Injected by Railway. Do not set it manually. |

**Main backend service:**

| Variable | Required | Value |
|---|---|---|
| `FUNDER_INTELLIGENCE_BASE_URL` | yes | The sidecar's public URL, e.g. `https://<sidecar>.up.railway.app`. No trailing slash. |
| `FUNDER_INTELLIGENCE_INTERNAL_SECRET` | yes | **Exactly the same string** as on the sidecar. |
| `FUNDER_INTELLIGENCE_REVIEWER_KEY` | yes for reviewer mode | An API key **minted by the sidecar** — not a value you invent. See below. |

`FUNDER_INTELLIGENCE_REVIEWER_KEY` is the one that is easy to get wrong. It is
not a generated secret: it is a funder API key issued by the sidecar, because the
reviewer is just another API client authenticating with `x-api-key`. The string
`REVIEWER_KEY` appears in exactly one file — `backend/routes/funderReviewer.js`.

## Minting the reviewer key

1. Deploy the sidecar with `FUNDER_INTELLIGENCE_INTERNAL_SECRET` set, and wait
   for `/health` to return healthy.
2. Register a platform funder through `POST /funder/register`, sending the
   internal secret in the `x-internal-secret` header. The response contains an
   `api_key` (`tgm_fi_pk_...`).
3. Put that key into `FUNDER_INTELLIGENCE_REVIEWER_KEY` on the backend service
   and redeploy.

Confirm with `GET /api/funder/reviewer/status` (requires a signed-in session):
it returns `{ "configured": true }` once both the base URL and the key resolve.

## What breaks at each step

Each of these fails differently, which is why the staged order matters.

| State | Symptom |
|---|---|
| Nothing configured | `/api/funder/reviewer/*` → **503 `sidecar_not_configured`**. Funder checkout still creates a Stripe session, but after payment the webhook cannot activate the cycle — **the customer pays and no cycle activates.** |
| Sidecar running, `BASE_URL` unset | Identical to the above. The backend does not know where the sidecar is. |
| `BASE_URL` set, secret missing or mismatched | `/internal/*` → **401**. Provisioning and cycle activation fail. Reviewer still 503. This is the deceptive one: the service is reachable, so it looks configured. |
| Secret correct, `REVIEWER_KEY` unset | Reviewer worklist → **503 `reviewer_not_configured`**. Provisioning and cycle activation now work. |
| All three set | Reviewer worklist returns a real worklist. |
| All three set, **no volume** | Works until the next deploy. Then the JSON file is wiped, funders and cycles vanish, and the configured reviewer key becomes orphaned → reviewer calls return 401. |

**Until the sidecar is reachable and the secret matches, keep the funder plans
un-purchasable.** `create-funder-session` creates real Stripe sessions in live
mode, and the failure lands *after* the charge — the worst shape a payment bug
can take.

## Known gap: the smoke test cannot register a funder

`smoke-test.js` calls `/funder/register`, which is gated by
`requireInternalSecret`, but the script sends only an `x-api-key` header and
contains no reference to the internal secret at all. As written it will get a 401
at the registration step.

Step 2 of "Minting the reviewer key" above therefore has to be done with a direct
HTTP call (curl, Postman) rather than `npm run smoke-test`. Fixing the smoke
script to accept the internal secret — the other scripts take the base URL as
`argv[2]`, so an `argv[3]` or an env var would be consistent — is worth doing
before this is handed to anyone else.
