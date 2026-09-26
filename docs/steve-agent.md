# Steve — the conversational grant concierge

Steve is the "get food" concept applied to grants. You walk up, tell him what
you need, he asks for whatever is still missing one line at a time, then he
writes the grant, scores it, saves it to your workspace, and hands it over ready
to download.

This document describes the Phase 1 build: the **real tool-calling agent**
replacing the old keyword router.

---

## What changed

| Before | After |
|---|---|
| `backend/routes/assistant.js` was a 200-line `if/else` keyword router | Thin HTTP transport in front of a real agent |
| Zero LLM calls in the assistant | OpenAI-compatible tool-calling loop (Groq default) |
| `generateGrantDraft()` returned a fixed template with one sentence injected | Real per-section generation grounded in the applicant's own order ticket |
| `/api/score` was a word-count heuristic; `ScoringDrawer` was `text.length / 10` | A real 7-criteria Checkmate rubric |
| Sessions in `const sessions = {}` (lost on every deploy) | `AssistantSession` + `AssistantMessage` in Postgres |
| No handoff | "Your grant is ready for your review" — in-app card + email |

---

## Architecture

```
backend/agents/steve/
├── order.js      the order ticket: 18 lines, required vs optional, ask order, validation
├── llm.js        OpenAI-compatible transport with tools/tool_calls (Groq or OpenAI)
├── drafting.js   per-section writer + deterministic assembler fallback
├── scoring.js    Checkmate: 7-criteria rubric (LLM graded, heuristic fallback)
├── tools.js      the toolbelt the model can call
├── persist.js    saves to the real Draft table + sends the ready notification
├── store.js      AssistantSession/AssistantMessage persistence (+ memory fallback)
├── agent.js      the orchestrator: runSteveTurn() / getSessionView()
└── index.js      public surface
```

### Why the order ticket is the source of truth

The language model is never the thing that decides whether the order is
complete. `order.js` owns that. This is the difference between a chatbot and a
counter attendant:

- An empty line **can not** be skipped — Steve always knows what he still needs.
- The model never invents values. `mergeOrder` only records what was stated.
- A draft **cannot ship** while a required line is blank. `create_draft` returns
  `order_incomplete`, and a guardrail appends the missing question even if the
  model forgets to ask it.

### The turn pipeline

```
runSteveTurn()
  1. load session, persist the user message
  2. fast paths (no LLM needed):
       confirm + ticket complete -> create_draft
       download / score / improve / open editor / reset
  3. otherwise -> runToolLoop()
       system prompt (persona + ticket state + next question)
       + last ~20 messages
       -> model calls tools -> execute -> feed results back -> repeat (max 5)
  4. enforceGuardrail(): append the next question if the model didn't ask one
  5. persist message + state, return the payload
```

If the model errors mid-turn, Steve falls back to the deterministic planner.
If no LLM key is configured at all, the planner runs the whole conversation —
Steve still works, just without the natural-language polish.

### Tools exposed to the model

| Tool | Purpose |
|---|---|
| `capture_intake` | Record order-ticket lines the applicant just gave |
| `create_draft` | Write the full document, score it, save it, notify |
| `write_section` | Write or rewrite one section |
| `score_draft` | Run the Checkmate rubric |
| `apply_fixes` | Apply Checkmate's recommended fixes |
| `notify_review_ready` | Fire the review-ready handoff |
| `get_draft_status` | Read ticket + draft state |

---

## API

### `POST /api/assistant`

Auth is **optional** (`softAuth`): signed-in users get saves, exports and
notifications; signed-out users can still draft.

```json
// request
{ "userId": "...", "tier": "free", "message": "grant for an orphanage with 30 orphans", "context": { "mode": "drafting" } }

// response (superset of the legacy contract)
{
  "reply": "Got it. What's the name of the organization this grant is for?",
  "intent": "intake",
  "requiresUpgrade": false,
  "status": "intake",
  "progress": { "requiredFilled": 0, "requiredTotal": 9, "percent": 0, "lines": [ ... ] },
  "order": {},
  "draftId": null,
  "draftTitle": null,
  "score": null,
  "scoreReport": null,
  "hasDraft": false,
  "download": null,
  "suggestions": ["501(c)(3) nonprofit", "Church", "School"],
  "engine": "agent"
}
```

When a draft exists and the user is signed in:

```json
{ "download": { "pdf": "/api/drafts/<id>/export.pdf", "docx": "/api/drafts/<id>/export.docx" } }
```

### `GET /api/assistant/session`

Rehydrates the panel on page load: `progress`, `order`, `messages`,
`draftId`, `scoreReport`, `download`, `suggestions`.

### `POST /api/assistant/reset`

Clears the session and starts a fresh order.

---

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | recommended | Enables the real LLM tool-calling loop (default provider) |
| `OPENAI_API_KEY` | optional | Alternative provider; used only if `GROQ_API_KEY` is absent |
| `GROQ_AGENT_MODEL` | optional | Defaults to `llama-3.3-70b-versatile` |
| `OPENAI_AGENT_MODEL` | optional | Defaults to `gpt-4o-mini` |
| `BREVO_API_KEY` | optional | Enables the "ready for review" email |
| `APP_URL` | optional | Used in the email link and checkout paths |

### Migration

```bash
cd backend
npx prisma migrate deploy     # applies 20260926000000_assistant_concierge
```

Adds two tables: `AssistantSession` (order ticket + delivery state) and
`AssistantMessage` (transcript). If the migration has not been applied, the
store degrades to an in-memory map rather than failing.

---

## UI

`src/components/AssistantChatPanel.tsx` — a simple concierge panel:

- **Order ticket strip** — a progress bar plus an expandable list of ticket
  lines that tick on as Steve captures them ("whip cream?" → line lights up).
  This is what makes it feel like a counter rather than an interrogation.
- **Quick-reply chips** — per-slot suggestions so the applicant never has to
  guess what to type.
- **Push-to-talk mic** — Web Speech API; no dependency, no server cost.
- **Voice replies** — optional speaker toggle using `speechSynthesis`.
- **Ready-for-review card** — Checkmate score, per-criterion bars, the top
  fixes, and **Download PDF / DOCX / Open in editor**.

---

## Tests

```bash
cd backend
npm run test:steve
```

Covers: planner completes the ticket line by line; the agent loop captures the
order and writes the grant; and the guardrail refuses to ship a draft while the
ticket is incomplete.
