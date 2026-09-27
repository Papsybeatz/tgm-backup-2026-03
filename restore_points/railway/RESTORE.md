# Restore point — Railway service configuration

Captured before the Root Directory change. If anything about the deploy breaks,
these are the exact previous values.

## Files here

| File | What it is |
|---|---|
| `railway.root.json` | The config that was in effect while the service root was the REPO ROOT |
| `railway.backend.json` | The config in `backend/railway.json` at the time |

## What changed and why

Railway was building from the **repo root**: the build log showed `copy / /app`
(81.6 MB — the whole repo), `npm install` at `/app`, and `node server.js`
resolving to the root `server.js`, which just does `require('./backend/server')`.

Two consequences:
1. `backend/railway.json` was **dead config** — nothing read it. A pre-deploy hook
   added there never ran.
2. Every build shipped the whole repo, including `restore_points/` and the
   backup directories.

## How to revert the Root Directory

Railway → your service → **Settings → Source → Root Directory**.

- To go back to the previous behaviour: clear it (or set `/`).
- To keep the new behaviour: set it to `backend`.

Then redeploy. No other change is needed — both `railway.json` files are
identical, so either root produces the same deployment.

## How to revert the config files

```bash
cp restore_points/railway/railway.root.json railway.json
cp restore_points/railway/railway.backend.json backend/railway.json
```

## What must NOT be re-added

`preDeployCommand` was removed deliberately. Two migrations in
`backend/prisma/migrations` were generated for SQLite and use `DATETIME`, which
is not a Postgres type — so `npx prisma migrate deploy` fails and would fail the
deploy. Schema repair happens at boot via `backend/utils/ensureSchema.js`
instead. Only re-add a pre-deploy hook after the migration history is baselined
(see docs/railway-service-config.md).
