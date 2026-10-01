# Orphaned modules — isolated, not deleted

These files are not imported by anything in the live tree. They are kept
here, out of `src/` and `backend/`, so the build never sees them but
nothing is lost while TGM is still being completed.

## Why not delete

Some of these are stale mockups (placeholder names, `alert("coming soon")`,
hardcoded demo data). Others are an abandoned architecture — an agent
system, a memory layer, a routing layer. Both are worth keeping until the
product is finished and we are sure none of it is wanted.

## How these were identified

A file is an orphan when no other source file imports or requires it and it
is not an entry point. The scan covers `from './x'`, `require('./x')`,
`import('./x')` and bare `import './x'` side-effect imports, matching by
module basename. Matching is conservative in the safe direction: a basename
collision marks *both* files as referenced, so a dead file may be left in
place, but a live file is never moved. Every candidate was then checked for
any textual mention elsewhere before being moved.

## What is here

66 files:

- `backend/middleware/` — 1 file(s)
- `backend/routes/` — 3 file(s)
- `backend/utils/` — 4 file(s)
- `src/` — 1 file(s)
- `src/agents/` — 1 file(s)
- `src/components/` — 37 file(s)
- `src/components/guards/` — 1 file(s)
- `src/components/tiles/` — 8 file(s)
- `src/components/workspace/` — 1 file(s)
- `src/config/` — 1 file(s)
- `src/ed/frontendChecks/` — 1 file(s)
- `src/hooks/` — 1 file(s)
- `src/lib/` — 1 file(s)
- `src/pages/` — 1 file(s)
- `src/pages/api/lead-magnet/` — 1 file(s)
- `src/routing/` — 1 file(s)
- `src/utils/` — 2 file(s)

## Restoring

One file:

```bash
git mv _orphaned/src/components/TeamPanel.jsx src/components/TeamPanel.jsx
```

Everything:

```bash
bash _orphaned/restore.sh
```

## Caveats

- Relative imports inside these files still point at their original
  locations, so they resolve again the moment a file is moved back.
- `_orphaned/` is outside the Vite entry graph and outside the Tailwind
  content globs (`./index.html`, `./src/**`), so nothing here is built or
  scanned while parked.
- Not isolated, but worth a decision: the root `index.js` is an unused NPM
  entry point that re-exports `src/agents/*`. Because it still references
  them, those agents were not classified as orphans — but nothing imports
  `index.js` either, so the whole cluster is unreachable from the app.
