# Railway deploy task — Steve concierge (Phase 1)

Paste the **Task Brief** section below into the Railway AI agent. Everything it
needs is in this file.

---

## Scope — what Railway owns

| Piece | Where it runs | Deployed by |
|---|---|---|
| Backend API (`/api/*`) | **Railway** | Git push to the connected branch |
| Database (Postgres) | **Railway** | — |
| Frontend (Vite SPA) | **Vercel** | Vercel build |

The frontend proxies API calls to Railway. From `vercel.json`:

```
/api/:path*  ->  https://tgm-backup-2026-03-production-ea59.up.railway.app/api/:path*
```

So **only `/api/*` reaches Railway through the public domain.** `/health` on
`www.thegrantsmaster.com` is served by the SPA, not Railway. Probe
`/api/assistant/session` instead.

---

## Known landmines (already handled, but verify)

1. **Service root directory.** The README says the backend service root is
   `backend`. If Railway is building from the **repo root** instead, the root
   `package.json` `postinstall` used to run `prisma generate` against the
   *stale* root schema (`prisma/schema.prisma`, 9 models, no
   `AssistantSession`). That produced a Prisma client without the new models,
   and Steve silently lost persistence (falling back to memory).
   **Fixed:** the root `package.json` now pins
   `"prisma": { "schema": "backend/prisma/schema.prisma" }`.

2. **`railway.json`.** `backend/railway.json` is the real one (start
   `node server.js`, healthcheck `/health`). The root `railway.json` has no
   healthcheck and is legacy.

---

## Task Brief (paste this into the Railway agent)

> You are deploying the `steve-agent-phase1` branch of the TGM backend.
>
> **Task 1 — Apply the database migration.**
> In the backend service, run:
> ```
> cd backend && npx prisma migrate deploy
> ```
> Then confirm with `npx prisma migrate status`. All migrations must be applied,
> including `20260926000000_assistant_concierge`, which creates the
> `AssistantSession` and `AssistantMessage` tables. Report the exact migration
> status output.
>
> **Task 2 — Verify the Prisma client includes the new models.**
> Run:
> ```
> node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();console.log('session:',typeof p.assistantSession,'msg:',typeof p.assistantMessage)"
> ```
> Both must print `object`. If either prints `undefined`, the client was
> generated from the wrong schema — report it immediately and do not continue.
>
> **Task 3 — Confirm environment variables.**
> Required for the full experience; the service still works without them.
> - `GROQ_API_KEY` — enables the real tool-calling LLM loop (default model
>   `llama-3.3-70b-versatile`). Without it Steve runs the deterministic planner.
> - `BREVO_API_KEY` — enables the "your grant is ready for your review" email.
> - `APP_URL` — should be `https://www.thegrantsmaster.com`.
> - Optional: `GROQ_AGENT_MODEL`.
> Report which of these are present. **Never print their values.**
>
> **Task 4 — Deploy and verify.**
> After the deploy reports healthy, run the built-in smoke test from the
> `backend` directory:
> ```
> STEVE_BASE_URL=https://tgm-backup-2026-03-production-ea59.up.railway.app node scripts/smoke-steve.js
> ```
> It must print `All checks passed — the concierge is live and working.` and
> exit 0. Paste the full output.
>
> **Task 5 — Report.**
> State: migration applied yes/no, client models present yes/no, env vars
> present (names only), smoke test exit code, and any error text verbatim.

---

## What success looks like

```
  [PASS] API is reachable — HTTP 200
  [PASS] first turn succeeds — HTTP 200
  [PASS] asks a question instead of guessing
  [PASS] returns an order ticket — 9 required lines
  [PASS] reports its engine — engine=agent
  [PASS] order ticket completes — 9/9
  [PASS] reads the order back before writing
  [PASS] writes the grant
  [PASS] status is ready_for_review — ready_for_review
  [PASS] Checkmate returns a real score — score=NN
  [PASS] Checkmate includes criteria — Strong
  [PASS] Checkmate recommends fixes — N fixes
  [PASS] session rehydrates — N messages
  [PASS] draft survives a reload — <title>

All checks passed — the concierge is live and working.
```

`engine=agent` means the LLM loop is live. `engine=planner` means no
`GROQ_API_KEY` is set — functional, but without the natural-language polish.

---

## Rollback

The service degrades safely on its own:

- **Migration not applied** → the session store falls back to memory. No crash.
- **No `GROQ_API_KEY`** → deterministic planner. No crash.
- **No `BREVO_API_KEY`** → the in-app handoff still works; email is skipped.

To revert the backend to the old keyword router:

```
git checkout pre-steve-agent -- backend/routes/assistant.js
```

To revert everything to the pristine baseline:

```
git reset --hard pre-steve-agent
```

Full restore copies also live in `restore_points/`:

- `restore_points/backend/assistant.route.legacy.js`
- `restore_points/frontend/AssistantChatPanel.legacy.tsx`

## Frontend rollback (no redeploy needed)

Steve's panel can be switched back to the original at runtime. Append to any
dashboard URL:

```
?steve=legacy      # use the original assistant panel (sticky)
?steve=concierge   # switch back
```

The choice is remembered in `localStorage.steveMode`. For a build-time default,
set `VITE_STEVE_MODE=legacy` in Vercel and redeploy.
