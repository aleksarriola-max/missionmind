# Phase 0 — Granite Foundation (Design)

**Date:** 2026-07-02
**Project:** MissionMind (IBM Bob AI Challenge — "Advance Space Exploration with AI")
**Status:** Approved design, pending implementation plan
**Phase:** 0 of 6 (enabling foundation for all real-AI features)

## 1. Goal

Give MissionMind a real, working path to **IBM Granite on watsonx.ai**, replacing today's
hardcoded string-matching "AI." Do it so that:

- the watsonx API key never reaches the browser,
- the whole thing runs from a single `npm run dev` on localhost,
- and a flaky network can **never** break a live demo (transparent fallback to the existing
  simulation).

This phase ships one real end-to-end Granite call (from the Knowledge Brain) as proof-of-life.
Every later phase (agentic copilot, multi-agent room, nowcasting, flight rules, counterfactuals,
polish) builds on the `granite` service defined here.

## 2. Scope

**In scope**
- A local proxy that holds credentials server-side and forwards to watsonx.ai.
- IBM Cloud IAM token exchange + caching.
- Client `granite` service: `generate`, `generateStream`, `embed`.
- Three-trigger fallback to simulation + an honest live/simulated badge.
- Wire exactly one existing feature (Knowledge Brain "Ask AI") through the new service.
- Config via `.env` (+ committed `.env.example`), README setup note.
- Unit tests for the service fallback logic and the proxy request builder / token cache.

**Out of scope (later phases)**
- The agentic Anomaly→Action copilot (Phase 1) — stays simulated for now.
- Any multi-step agent orchestration, embeddings-backed search UI, new pages.
- Deployment / serverless hosting (local-only for now; proxy kept portable).
- Streaming *UI* — the transport supports streaming, but no page consumes it yet.

## 3. Architecture

```
Browser (React)                     Vite dev server (Node)                 IBM watsonx.ai
─────────────────                   ──────────────────────                 ──────────────
src/services/granite.js  ──POST──▶  /api/granite/generate  ──┐
  generate / generateStream         /api/granite/embed        ├─ graniteProxy.js
  embed                             (Vite middleware plugin)   │    · IAM token cache
  fallback + badge state            same origin, no CORS       │    · build request
                                                               └──▶ ml/v1/text/generation
                                                                    ml/v1/text/embeddings
```

- **Proxy hosting: Vite dev-server middleware (Approach A).** A small plugin in
  `vite.config.js` mounts `/api/granite/*` handlers inside the existing dev server. Single
  command, same-origin (no CORS), key stays in the Node process.
- **Portability:** all proxy logic lives in a standalone, framework-agnostic
  `server/graniteProxy.js` (a `(req) => Response`-style handler). The Vite plugin is a thin
  adapter. Later this same module can be wrapped by a Vercel/Netlify serverless function with
  no logic changes.

## 4. Components

### 4.1 `server/graniteProxy.js` (Node, server-side only)
Framework-agnostic core. Responsibilities:
- **`getIamToken()`** — POST `WATSONX_API_KEY` to IBM Cloud IAM
  (`https://iam.cloud.ibm.com/identity/token`, grant `urn:ibm:params:oauth:grant-type:apikey`).
  Cache the returned `access_token` in module memory with its `expiration`; refresh when within
  ~5 min of expiry. Never logged.
- **`handleGenerate({ input, system, parameters, stream })`** — build the watsonx body
  `{ model_id: GRANITE_MODEL_ID, input: <composed prompt>, project_id: WATSONX_PROJECT_ID,
  parameters }` and POST to `${WATSONX_URL}/ml/v1/text/generation?version=2024-05-31`
  (or `.../text/generation_stream` when `stream`). Returns text, or pipes SSE when streaming.
- **`handleEmbed({ inputs })`** — POST to `${WATSONX_URL}/ml/v1/text/embeddings` with
  `{ model_id: <embedding model>, inputs, project_id }`. Returns `number[][]`.
- **`isConfigured()`** — true iff all required env vars are present. Surfaced to the client via a
  `GET /api/granite/health` endpoint returning `{ configured: boolean, model }` so the client can
  decide up front whether to run in `granite` or `simulated` mode.
- **Request builder is a pure function** (`buildGenerationRequest(opts, cfg)`) so it can be
  unit-tested without network.

### 4.2 `vite.config.js` plugin
`graniteDevServer()` — a Vite plugin whose `configureServer(server)` mounts
`server.middlewares.use('/api/granite', ...)` and dispatches to `graniteProxy.js`. Parses JSON
body, sets SSE headers when streaming, returns JSON otherwise. Handles its own errors → 502 with
a small JSON error the client treats as a fallback trigger.

### 4.3 `src/services/granite.js` (client)
The single interface every AI feature imports.

```js
// text completion. `fallback` is a zero-arg fn returning the feature's existing
// sim answer; it is invoked (and lastSource set to 'simulated') on any failure.
await generate(prompt, { system, maxTokens = 512, temperature = 0.2, fallback }) // → string
// token stream (async iterable); used from Phase 1 on. Same `fallback` contract.
for await (const token of generateStream(prompt, { system, fallback, ... })) { ... }
// embeddings; used from Phase 6 on
await embed(texts) // → number[][]

// status for the badge
getLastSource() // → 'granite' | 'simulated'
```

- Calls the local `/api/granite/*` endpoints.
- **Mode + fallback (the demo-safety heart):** each call resolves to `granite` output unless one
  of three triggers forces `simulated`:
  1. `import.meta.env.VITE_GRANITE_MODE === 'mock'` (force sim for a guaranteed clean run),
  2. the proxy reports unconfigured (no creds) — detected via a `/api/granite/health` probe
     cached for the session,
  3. a runtime error or a ~6s timeout on the real call.
- On any fallback, the call **still resolves successfully** using a caller-supplied `fallback`
  function (the feature passes its existing sim logic, e.g. `matchTopic`). The service records
  `lastSource = 'simulated'` for that call so the UI badge can reflect it.
- No secrets or URLs live in the client — only the same-origin `/api/granite/*` paths.

### 4.4 Honesty badge
A tiny presentational component `src/components/AiSourceBadge.jsx` — renders `GRANITE` (cyan) or
`SIMULATED` (muted) based on the source of the response it's shown next to. Used on the Knowledge
Brain answer in this phase; reusable everywhere later.

## 5. Proof-of-life wiring (Knowledge Brain)

`KnowledgeBrain.jsx` `askKB()` changes from calling `matchTopic(query)` directly to:

```js
const answer = await generate(query, {
  system: SPACE_OPS_SYSTEM_PROMPT,     // grounds Granite as an ARES-7 ops assistant
  fallback: () => matchTopic(query),   // existing sim, used on any failure
});
setAiAnswer(answer);
setAiSource(getLastSource());          // drives <AiSourceBadge />
```

- Keeps the existing loading state.
- The system prompt gives Granite the mission context (ARES-7, Sol 412, the doc corpus summaries)
  so answers are grounded and on-theme.
- Chosen because it is self-contained and low-stakes; it exercises the entire path
  (proxy → IAM → Granite → fallback → badge) without pre-building Phase 1's agent.

## 6. Configuration & secrets

- `.env` (gitignored): `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`,
  `GRANITE_MODEL_ID` (default `ibm/granite-3-8b-instruct`), optional `GRANITE_EMBED_MODEL_ID`.
- `.env.example` (committed) documents each var with placeholder values.
- `VITE_GRANITE_MODE` (optional, client): `auto` (default) | `mock`.
- If the server is unconfigured, the app runs fully in simulated mode — the repo works for anyone
  without credentials.
- README gains a short "Enabling IBM Granite" section.

## 7. Error handling

- Proxy: IAM failure, watsonx non-200, or timeout → 502 + `{ error }`. Never leak the key or raw
  upstream errors to the client.
- Client: any non-OK response or timeout → invoke the caller's `fallback`, set
  `lastSource='simulated'`. A failure is never surfaced as a thrown error to the UI.
- The existing `ErrorBoundary` remains the last line of defense for unexpected render errors.

## 8. Testing

- `server/graniteProxy.test.js` — `buildGenerationRequest` shapes the correct body from options
  + config; IAM token cache returns the cached token before expiry and refreshes after. Pure /
  injected-fetch, no live network.
- `src/services/granite.test.js` — mock mode returns the fallback and reports `simulated`; a
  simulated fetch failure falls back and reports `simulated`; a successful fetch reports
  `granite`. Uses an injected/stubbed fetch.
- Run under the existing Vitest setup (`npm test`).

## 9. Success criteria

1. With valid `.env`, asking a question in the Knowledge Brain returns a **real Granite answer**
   and the badge reads `GRANITE`.
2. With `VITE_GRANITE_MODE=mock`, no creds, or the proxy killed mid-request, the same question
   still returns a sensible answer and the badge reads `SIMULATED` — no error, no broken UI.
3. `npm run dev` is the only command needed; the key never appears in any browser payload.
4. `npm run lint`, `npm test`, and `npm run build` all pass.

## 10. Downstream (what this unblocks)

- **Phase 1** consumes `generateStream` for the agent's live reasoning trace.
- **Phase 6** consumes `embed` for real semantic incident search.
- All AI features get the same fallback + badge behavior for free by importing `granite`.
