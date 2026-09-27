# Railway service configuration — consolidated

## Why this file exists

Railway was building from the **repo root**, not `backend/`. The build log showed:

```
copy / /app            ← the whole repo, 81.6 MB
$ npm install          ← at /app (repo root)
$ node server.js       ← the ROOT server.js
→ Custom start command detected, skipping Caddy start
```

That last line proved which config was in effect: the **root** `railway.json`.
Everything I had put in `backend/railway.json` — including a pre-deploy hook —
was **dead config that nothing read**. That is why two attempts at fixing
migrations produced no change at all.

## Current state

Both files are now **byte-identical**, so behaviour cannot change whichever one
Railway resolves:

| File | Used when the service root is |
|---|---|
| `railway.json` (repo root) | the repo root — the case today |
| `backend/railway.json` | `backend` — the intended end state |

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

The root file is **transitional**. Once the Root Directory is `backend`, it is
unused and gets deleted — leaving one file.

---

## Step 1 — you: set the Root Directory to `backend`

Railway → your service → **Settings → Source → Root Directory** → enter `backend` → save.

Railway will redeploy from `backend/`.

### Why this is safe here

I scanned the whole backend tree for external packages and confirmed
`backend/package.json` declares every one it uses:

```
@prisma/client  bcryptjs  cookie-parser  cors  dayjs  docx  dotenv  express
express-rate-limit  mammoth  multer  pdf-parse  pdfkit  prisma  stripe  validator
word-extractor
```

**`backend/` is self-contained.** The move also removes the need for the
`prisma` schema pin in the root `package.json`, because from `backend/` the
schema is just `prisma/schema.prisma`.

### What improves

- Build context drops from ~82 MB to the backend only.
- `postinstall: prisma generate` runs against the correct schema **by default**,
  with no pin required.
- `backend/railway.json` — the better-configured file, which has the healthcheck
  the root one lacks — becomes the one in force.
- `startCommand` resolves to `backend/server.js` directly instead of a
  one-line handoff.

## Step 2 — verify (you)

**a. The deploy succeeded and passes its healthcheck.** Railway shows the
healthcheck hitting `/health`; it should return `{"status":"ok"}`.

**b. Application logs contain one of:**
```
[SCHEMA] OK — Steve's tables are usable
[SCHEMA] Steve's tables are STILL unusable: <reason>
```

**c. Session persistence is live:**
```bash
curl https://tgm-backup-2026-03-production-ea59.up.railway.app/api/assistant/session?userId=testuser
```
- a `cuid` id (e.g. `clx8f2…`) → **persistence works**
- `mem_testuser` → still the in-memory fallback; send me the `[SCHEMA]` line

**d. The concierge still works end to end:**
```bash
cd backend && node scripts/smoke-steve.js
```
Expect `All checks passed` and exit 0.

**e. The build is smaller.** The new build log should no longer show an 81 MB
`copy / /app`.

## Step 3 — me: delete the root `railway.json`

Once Step 2 passes, the root config is unused and I remove it, leaving a single
source of truth. Say the word and I'll push it.

---

## Rollback

Everything is captured in `restore_points/railway/`. Full instructions are in
`restore_points/railway/RESTORE.md`.

**Set the Root Directory back** (Railway → Settings → Source → Root Directory →
clear it). Because both config files are identical, reverting the directory
restores the previous deploy exactly.

**Restore the files if needed:**
```bash
cp restore_points/railway/railway.root.json railway.json
cp restore_points/railway/railway.backend.json backend/railway.json
```

## Do NOT re-add `preDeployCommand` yet

It was removed deliberately. Two migrations in `backend/prisma/migrations` were
**generated for SQLite** and use `DATETIME`, which is not a Postgres type:

| Migration | Problem |
|---|---|
| `20260410184551_add_subscription_fields` | 8 × `DATETIME` |
| `20260411123000_drafts_userid` | 2 × `DATETIME` |

So `npx prisma migrate deploy` fails against your Postgres database, and a
failing pre-deploy can fail the whole deployment. Schema repair runs at boot via
`backend/utils/ensureSchema.js` instead — idempotent, and it coexists with the
migrations because those were rewritten with `IF NOT EXISTS`.

A pre-deploy hook becomes correct again **only after** the history is baselined:

```bash
cd backend
npx prisma migrate resolve --applied 20260410184551_add_subscription_fields
npx prisma migrate resolve --applied 20260411123000_drafts_userid
npx prisma migrate status
```

That records those two as already-applied, which is true — the tables they
describe already exist in production. Only then does `migrate deploy` have a
consistent history to work from.
