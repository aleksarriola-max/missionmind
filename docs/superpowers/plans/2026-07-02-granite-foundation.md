# Granite Foundation (Phase 0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give MissionMind a real, credential-safe path to IBM Granite on watsonx.ai with a bulletproof simulation fallback, proven end-to-end through the Knowledge Brain "Ask AI".

**Architecture:** A framework-agnostic proxy module (`server/graniteProxy.js`) holds all watsonx logic (IAM token caching, request shaping, generate/embed/health, streaming). A thin Vite dev-server middleware plugin mounts it at `/api/granite/*` — same origin, no CORS, key stays in Node. A client service (`src/services/granite.js`) is the single interface every AI feature imports; it transparently falls back to the app's existing simulation on mock-mode, missing creds, or any runtime failure, and records a `granite`/`simulated` source for an honesty badge.

**Tech Stack:** React 19, Vite 8 (Node 18+ global `fetch`), Tailwind v4, Vitest 2, IBM watsonx.ai Granite (`ml/v1/text/generation`, `.../generation_stream`, `.../text/embeddings`), IBM Cloud IAM.

## Global Constraints

- Node 18+ (Vite 8 requirement) — use the built-in global `fetch`; do NOT add `node-fetch` or `axios`.
- No new runtime dependencies. Dev-only deps already present: `vitest`. Do NOT add `dotenv` (use Vite's `loadEnv`), `express`, `concurrently`, or a component-test stack (`jsdom`/`@testing-library`) in this phase.
- The watsonx API key and project id MUST never appear in any client bundle or browser payload — they live only in `.env` (gitignored) and are read server-side via `loadEnv`.
- watsonx API version string: `2024-05-31` (query param `?version=2024-05-31` on every ml/v1 call).
- Default models: `WATSONX_MODEL_ID=ibm/granite-3-8b-instruct`, `WATSONX_EMBED_MODEL_ID=ibm/slate-125m-english-rtrvr`.
- Every commit message ends with the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- All work happens in `C:\Users\aleks\missionmind`. `npm run lint`, `npm test`, `npm run build` must all pass at the end.

---

## File Structure

- Create `server/graniteProxy.js` — all watsonx logic (config, request builder, IAM cache, request router, streaming). Framework-agnostic; portable to serverless later.
- Create `server/graniteProxy.test.js` — unit tests for the pure/injectable proxy logic.
- Modify `vite.config.js` — add the `graniteDevServer(env)` middleware plugin; load env via `loadEnv`.
- Create `src/services/granite.js` — client service (`generate`, `generateStream`, `embed`, `getLastSource`).
- Create `src/services/granite.test.js` — unit tests for mode/fallback/source logic.
- Create `src/components/AiSourceBadge.jsx` — `GRANITE` / `SIMULATED` badge (presentational).
- Modify `src/pages/KnowledgeBrain.jsx` — route `askKB()` through `generate()` with `matchTopic` fallback + badge.
- Create `.env.example` — documented config template (committed).
- Modify `.gitignore` — add `.env`.
- Modify `README.md` — add "Enabling IBM Granite" section.

---

## Task 0: Initialize git repository

The plan uses frequent commits; the project has no repo yet.

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Initialize the repo**

Run:
```bash
cd /c/Users/aleks/missionmind && git init
```
Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Add `.env` to `.gitignore`**

Append to `.gitignore` (keep existing lines):
```
.env
```

- [ ] **Step 3: Baseline commit of the current working app**

Run:
```bash
git add -A && git commit -m "chore: baseline commit of MissionMind before Granite foundation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: a commit is created listing the existing source files. Confirm `.env` is NOT staged (it does not exist yet, and is now ignored).

---

## Task 1: Proxy config + generation request builder (pure functions)

**Files:**
- Create: `server/graniteProxy.js`
- Test: `server/graniteProxy.test.js`
- Create: `.env.example`
- Modify: `eslint.config.js`

**Interfaces:**
- Produces:
  - `readConfig(env = process.env) → { apiKey, projectId, url, model, embedModel }` (trailing slash stripped from `url`)
  - `isConfigured(cfg) → boolean` (true iff `apiKey && projectId && url`)
  - `buildGenerationRequest({ input, system, parameters }, cfg) → { url, body }` where `body = { model_id, project_id, input, parameters }`

- [ ] **Step 1: Write the failing tests**

Create `server/graniteProxy.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { readConfig, isConfigured, buildGenerationRequest } from './graniteProxy.js';

describe('readConfig', () => {
  it('reads vars and strips a trailing slash from the url', () => {
    const cfg = readConfig({
      WATSONX_API_KEY: 'k', WATSONX_PROJECT_ID: 'p',
      WATSONX_URL: 'https://us-south.ml.cloud.ibm.com/',
    });
    expect(cfg).toMatchObject({ apiKey: 'k', projectId: 'p', url: 'https://us-south.ml.cloud.ibm.com' });
    expect(cfg.model).toBe('ibm/granite-3-8b-instruct');
    expect(cfg.embedModel).toBe('ibm/slate-125m-english-rtrvr');
  });
});

describe('isConfigured', () => {
  it('is true only when key, project, and url are all present', () => {
    expect(isConfigured({ apiKey: 'k', projectId: 'p', url: 'u' })).toBe(true);
    expect(isConfigured({ apiKey: '', projectId: 'p', url: 'u' })).toBe(false);
    expect(isConfigured({ apiKey: 'k', projectId: '', url: 'u' })).toBe(false);
  });
});

describe('buildGenerationRequest', () => {
  const cfg = { url: 'https://host', projectId: 'proj', model: 'ibm/granite-3-8b-instruct' };

  it('targets the text/generation endpoint with the version query', () => {
    const { url } = buildGenerationRequest({ input: 'hi' }, cfg);
    expect(url).toBe('https://host/ml/v1/text/generation?version=2024-05-31');
  });

  it('prepends the system prompt and sets model + project', () => {
    const { body } = buildGenerationRequest({ input: 'Q', system: 'SYS' }, cfg);
    expect(body.model_id).toBe('ibm/granite-3-8b-instruct');
    expect(body.project_id).toBe('proj');
    expect(body.input).toBe('SYS\n\nQ');
  });

  it('uses greedy decoding by default and sampling when temperature > 0', () => {
    const greedy = buildGenerationRequest({ input: 'Q' }, cfg).body.parameters;
    expect(greedy.decoding_method).toBe('greedy');
    expect(greedy.max_new_tokens).toBe(512);
    const sampled = buildGenerationRequest({ input: 'Q', parameters: { temperature: 0.7, maxTokens: 128 } }, cfg).body.parameters;
    expect(sampled.decoding_method).toBe('sample');
    expect(sampled.temperature).toBe(0.7);
    expect(sampled.max_new_tokens).toBe(128);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run server/graniteProxy.test.js`
Expected: FAIL — `readConfig`/`isConfigured`/`buildGenerationRequest` are not exported / module not found.

- [ ] **Step 3: Write the implementation**

Create `server/graniteProxy.js`:
```js
// server/graniteProxy.js
// Framework-agnostic watsonx.ai proxy logic. No Vite/Express imports so this
// module is portable to a serverless function later. Uses Node's global fetch.

const API_VERSION = '2024-05-31';
const IAM_URL = 'https://iam.cloud.ibm.com/identity/token';

export function readConfig(env = process.env) {
  return {
    apiKey: env.WATSONX_API_KEY || '',
    projectId: env.WATSONX_PROJECT_ID || '',
    url: (env.WATSONX_URL || '').replace(/\/+$/, ''),
    model: env.WATSONX_MODEL_ID || 'ibm/granite-3-8b-instruct',
    embedModel: env.WATSONX_EMBED_MODEL_ID || 'ibm/slate-125m-english-rtrvr',
  };
}

export function isConfigured(cfg) {
  return Boolean(cfg.apiKey && cfg.projectId && cfg.url);
}

export function buildGenerationRequest({ input, system, parameters = {} }, cfg) {
  const prompt = system ? `${system}\n\n${input}` : input;
  const temperature = parameters.temperature ?? 0;
  const decoding_method = temperature > 0 ? 'sample' : 'greedy';
  const p = {
    decoding_method,
    max_new_tokens: parameters.maxTokens ?? 512,
  };
  if (temperature > 0) p.temperature = temperature;
  return {
    url: `${cfg.url}/ml/v1/text/generation?version=${API_VERSION}`,
    body: { model_id: cfg.model, project_id: cfg.projectId, input: prompt, parameters: p },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run server/graniteProxy.test.js`
Expected: PASS (all cases in this file).

- [ ] **Step 5: Add a node-globals ESLint override**

`server/graniteProxy.js` (and, from Task 4, `vite.config.js`) run in Node and use `process`
and `Buffer`, which the browser-globals config flags as undefined. The project uses ESLint 10
flat config, where `/* eslint-env node */` comments are ignored — so add an override block.

In `eslint.config.js`, add this object to the exported array, immediately after the existing
`{ files: ['**/*.{js,jsx}'], ... }` block:
```js
  {
    files: ['vite.config.js', 'server/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
```
(`globals` is already imported at the top of `eslint.config.js`.)

Run: `npx eslint server/graniteProxy.js`
Expected: exit 0 (no `no-undef` on `process`).

- [ ] **Step 6: Create `.env.example`**

Create `.env.example`:
```
# IBM watsonx.ai — copy to .env and fill in from your watsonx project.
# .env is gitignored; never commit real credentials.
WATSONX_API_KEY=your-ibm-cloud-api-key
WATSONX_PROJECT_ID=your-watsonx-project-id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct
WATSONX_EMBED_MODEL_ID=ibm/slate-125m-english-rtrvr

# Client: 'auto' (default) uses Granite when the server is configured; 'mock' forces simulation.
VITE_GRANITE_MODE=auto
```

- [ ] **Step 7: Commit**

```bash
git add server/graniteProxy.js server/graniteProxy.test.js .env.example eslint.config.js
git commit -m "feat(granite): proxy config + generation request builder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: IAM token exchange + cache

**Files:**
- Modify: `server/graniteProxy.js`
- Test: `server/graniteProxy.test.js`

**Interfaces:**
- Consumes: `readConfig`
- Produces:
  - `getIamToken(cfg, { fetchImpl, now }) → Promise<string>` — exchanges the api key for a bearer token, caches it in module memory, refreshes within 5 min of expiry.
  - `_resetTokenCache()` — test-only helper to clear the module cache.

- [ ] **Step 1: Write the failing tests**

Append to `server/graniteProxy.test.js`:
```js
import { getIamToken, _resetTokenCache } from './graniteProxy.js';
import { beforeEach, vi } from 'vitest';

describe('getIamToken', () => {
  beforeEach(() => _resetTokenCache());

  const cfg = { apiKey: 'KEY' };

  it('fetches a token from IAM and returns it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ access_token: 'T1', expiration: 2_000_000_000 }),
    });
    const token = await getIamToken(cfg, { fetchImpl, now: () => 0 });
    expect(token).toBe('T1');
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][0]).toContain('iam.cloud.ibm.com');
  });

  it('returns the cached token before expiry (no second fetch)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ access_token: 'T1', expiration: 2_000_000_000 }),
    });
    await getIamToken(cfg, { fetchImpl, now: () => 0 });
    await getIamToken(cfg, { fetchImpl, now: () => 1000 });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('refetches after the token expires', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'T1', expiration: 100 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'T2', expiration: 2_000_000_000 }) });
    const t1 = await getIamToken(cfg, { fetchImpl, now: () => 0 });
    const t2 = await getIamToken(cfg, { fetchImpl, now: () => 200_000 }); // 200s > 100s expiry (ms)
    expect(t1).toBe('T1');
    expect(t2).toBe('T2');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-OK IAM response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(getIamToken(cfg, { fetchImpl, now: () => 0 })).rejects.toThrow('IAM 401');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/graniteProxy.test.js`
Expected: FAIL — `getIamToken` / `_resetTokenCache` not exported.

- [ ] **Step 3: Implement**

Append to `server/graniteProxy.js`:
```js
let _tokenCache = { token: null, expMs: 0 };
export function _resetTokenCache() { _tokenCache = { token: null, expMs: 0 }; }

export async function getIamToken(cfg, { fetchImpl = fetch, now = Date.now } = {}) {
  const skewMs = 5 * 60 * 1000;
  if (_tokenCache.token && _tokenCache.expMs - skewMs > now()) return _tokenCache.token;
  const res = await fetchImpl(IAM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: cfg.apiKey,
    }).toString(),
  });
  if (!res.ok) throw new Error(`IAM ${res.status}`);
  const data = await res.json();
  const expMs = data.expiration ? data.expiration * 1000 : now() + (data.expires_in ?? 3600) * 1000;
  _tokenCache = { token: data.access_token, expMs };
  return _tokenCache.token;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run server/graniteProxy.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add server/graniteProxy.js server/graniteProxy.test.js
git commit -m "feat(granite): IAM token exchange with in-memory cache

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Request router + generate/embed/health handlers

**Files:**
- Modify: `server/graniteProxy.js`
- Test: `server/graniteProxy.test.js`

**Interfaces:**
- Consumes: `readConfig`, `isConfigured`, `getIamToken`, `buildGenerationRequest`
- Produces:
  - `handleRequest(pathname, body, { cfg, fetchImpl }) → Promise<{ status, body }>`
    - `.../health` → `{ status:200, body:{ configured, model } }`
    - `.../generate` → `{ status:200, body:{ text } }`
    - `.../embed` → `{ status:200, body:{ embeddings } }`
    - not configured (non-health) → `{ status:503, body:{ error:'not_configured' } }`
    - upstream failure → `{ status:502, body:{ error } }`

- [ ] **Step 1: Write the failing tests**

Append to `server/graniteProxy.test.js`:
```js
import { handleRequest } from './graniteProxy.js';

describe('handleRequest', () => {
  beforeEach(() => _resetTokenCache());
  const cfg = { apiKey: 'k', projectId: 'p', url: 'https://host', model: 'ibm/granite-3-8b-instruct', embedModel: 'ibm/slate-125m-english-rtrvr' };

  it('health reports configuration without calling watsonx', async () => {
    const fetchImpl = vi.fn();
    const r = await handleRequest('/api/granite/health', {}, { cfg, fetchImpl });
    expect(r).toEqual({ status: 200, body: { configured: true, model: 'ibm/granite-3-8b-instruct' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('health reports not-configured for an empty config', async () => {
    const r = await handleRequest('/api/granite/health', {}, { cfg: { apiKey: '' }, fetchImpl: vi.fn() });
    expect(r.body.configured).toBe(false);
  });

  it('generate returns the model text', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'T', expiration: 2_000_000_000 }) }) // IAM
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ generated_text: 'HELLO' }] }) });      // generation
    const r = await handleRequest('/api/granite/generate', { input: 'hi' }, { cfg, fetchImpl });
    expect(r).toEqual({ status: 200, body: { text: 'HELLO' } });
  });

  it('embed returns a vector array', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'T', expiration: 2_000_000_000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ embedding: [0.1, 0.2] }] }) });
    const r = await handleRequest('/api/granite/embed', { inputs: ['a'] }, { cfg, fetchImpl });
    expect(r).toEqual({ status: 200, body: { embeddings: [[0.1, 0.2]] } });
  });

  it('returns 503 for generate when not configured', async () => {
    const r = await handleRequest('/api/granite/generate', { input: 'hi' }, { cfg: { apiKey: '' }, fetchImpl: vi.fn() });
    expect(r.status).toBe(503);
  });

  it('returns 502 when watsonx errors', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'T', expiration: 2_000_000_000 }) })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    const r = await handleRequest('/api/granite/generate', { input: 'hi' }, { cfg, fetchImpl });
    expect(r.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/graniteProxy.test.js`
Expected: FAIL — `handleRequest` not exported.

- [ ] **Step 3: Implement**

Append to `server/graniteProxy.js`:
```js
function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

export async function handleRequest(pathname, body, { cfg = readConfig(), fetchImpl = fetch } = {}) {
  if (pathname.endsWith('/health')) {
    return { status: 200, body: { configured: isConfigured(cfg), model: cfg.model } };
  }
  if (!isConfigured(cfg)) return { status: 503, body: { error: 'not_configured' } };
  try {
    const token = await getIamToken(cfg, { fetchImpl });
    if (pathname.endsWith('/generate')) {
      const { url, body: reqBody } = buildGenerationRequest(body, cfg);
      const r = await fetchImpl(url, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(reqBody) });
      if (!r.ok) return { status: 502, body: { error: `watsonx ${r.status}` } };
      const data = await r.json();
      return { status: 200, body: { text: data.results?.[0]?.generated_text ?? '' } };
    }
    if (pathname.endsWith('/embed')) {
      const r = await fetchImpl(`${cfg.url}/ml/v1/text/embeddings?version=${API_VERSION}`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ model_id: cfg.embedModel, project_id: cfg.projectId, inputs: body.inputs }),
      });
      if (!r.ok) return { status: 502, body: { error: `watsonx ${r.status}` } };
      const data = await r.json();
      return { status: 200, body: { embeddings: (data.results ?? []).map((x) => x.embedding) } };
    }
    return { status: 404, body: { error: 'not_found' } };
  } catch (e) {
    return { status: 502, body: { error: String(e?.message || e) } };
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run server/graniteProxy.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add server/graniteProxy.js server/graniteProxy.test.js
git commit -m "feat(granite): request router with generate/embed/health handlers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Vite dev-server middleware plugin

Wires the proxy into `/api/granite/*` on the running dev server. Verified by running the server and curling the health endpoint (this task is IO glue, not unit-tested).

**Files:**
- Modify: `vite.config.js`

**Interfaces:**
- Consumes: `handleRequest`, `readConfig`
- Produces: HTTP endpoints `/api/granite/health|generate|embed` on the Vite dev server.

- [ ] **Step 1: Rewrite `vite.config.js` to add the plugin**

Replace the contents of `vite.config.js` with:
```js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readConfig, handleRequest } from './server/graniteProxy.js'

// Mounts the Granite proxy inside the dev server: same origin (no CORS),
// credentials stay in this Node process. `env` is loaded with an empty prefix
// so non-VITE_ vars (WATSONX_*) are available server-side.
function graniteDevServer(env) {
  const cfg = readConfig(env)
  return {
    name: 'granite-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/granite', (req, res) => {
        let raw = ''
        req.on('data', (c) => (raw += c))
        req.on('end', async () => {
          let body = {}
          try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
          const pathname = (req.originalUrl || req.url || '').split('?')[0]
          const { status, body: out } = await handleRequest(pathname, body, { cfg })
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(out))
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), tailwindcss(), graniteDevServer(env)] }
})
```

- [ ] **Step 2: Verify the health endpoint responds (mock/no-creds path)**

With no `.env` yet, start the dev server and curl health.
Run (in one shell):
```bash
npm run dev -- --port 5199 &
sleep 4
curl -s http://localhost:5199/api/granite/health
```
Expected: `{"configured":false,"model":"ibm/granite-3-8b-instruct"}` (configured=false because no `.env`).
Then stop the server: `pkill -f "vite --port 5199"`.

- [ ] **Step 3: Verify configured path (optional, needs real creds)**

Create `.env` from `.env.example` and fill in real watsonx values (from your saved credentials). Then:
```bash
npm run dev -- --port 5199 &
sleep 4
curl -s http://localhost:5199/api/granite/health
curl -s -X POST http://localhost:5199/api/granite/generate -H 'Content-Type: application/json' \
  -d '{"input":"In one sentence, what is a solar array current anomaly?","system":"You are an ARES-7 mission ops assistant."}'
pkill -f "vite --port 5199"
```
Expected: health `configured:true`; generate returns `{"text":"..."}` with a real Granite sentence. If watsonx is unreachable, generate returns a 502 `{"error":...}` — that is the client's fallback trigger and is acceptable here.

- [ ] **Step 4: Confirm lint still passes**

Run: `npx eslint .`
Expected: exit 0. `vite.config.js` now uses `process`/`Buffer`; these are covered by the
`server/**` + `vite.config.js` node-globals override added in Task 1 Step 5. If lint errors on
`process` here, that override is missing — add it before continuing.

- [ ] **Step 5: Commit**

```bash
git add vite.config.js
git commit -m "feat(granite): mount proxy as Vite dev-server middleware

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Client `granite` service with fallback

**Files:**
- Create: `src/services/granite.js`
- Test: `src/services/granite.test.js`

**Interfaces:**
- Produces:
  - `generate(prompt, { system, maxTokens, temperature, fallback, timeoutMs }) → Promise<string>`
  - `embed(texts) → Promise<number[][]>`
  - `getLastSource() → 'granite' | 'simulated'`
  - `__resetForTest()` — clears the cached health probe (test-only).
- Fallback contract: on mock mode / not-configured / any failure/timeout, calls `fallback()` (if given), sets `lastSource='simulated'`, and still resolves.

- [ ] **Step 1: Write the failing tests**

Create `src/services/granite.test.js`:
```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generate, getLastSource, __resetForTest } from './granite.js';

beforeEach(() => { __resetForTest(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function stubFetch(routes) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    for (const [frag, resp] of Object.entries(routes)) if (String(url).includes(frag)) return resp();
    return { ok: false, status: 404 };
  }));
}

describe('granite.generate', () => {
  it('returns the simulated answer and marks source when VITE_GRANITE_MODE=mock', async () => {
    vi.stubEnv('VITE_GRANITE_MODE', 'mock');
    const out = await generate('Q', { fallback: () => 'SIM' });
    expect(out).toBe('SIM');
    expect(getLastSource()).toBe('simulated');
  });

  it('returns real Granite text and marks source when the server is configured', async () => {
    stubFetch({
      '/health': () => ({ ok: true, json: async () => ({ configured: true }) }),
      '/generate': () => ({ ok: true, json: async () => ({ text: 'REAL' }) }),
    });
    const out = await generate('Q', { fallback: () => 'SIM' });
    expect(out).toBe('REAL');
    expect(getLastSource()).toBe('granite');
  });

  it('falls back to simulation when the generate call fails', async () => {
    stubFetch({
      '/health': () => ({ ok: true, json: async () => ({ configured: true }) }),
      '/generate': () => ({ ok: false, status: 502 }),
    });
    const out = await generate('Q', { fallback: () => 'SIM' });
    expect(out).toBe('SIM');
    expect(getLastSource()).toBe('simulated');
  });

  it('falls back to simulation when the server is not configured', async () => {
    stubFetch({ '/health': () => ({ ok: true, json: async () => ({ configured: false }) }) });
    const out = await generate('Q', { fallback: () => 'SIM' });
    expect(out).toBe('SIM');
    expect(getLastSource()).toBe('simulated');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/services/granite.test.js`
Expected: FAIL — module `./granite.js` not found.

- [ ] **Step 3: Implement**

Create `src/services/granite.js`:
```js
// src/services/granite.js
// Single client interface for IBM Granite. Transparently falls back to the
// app's existing simulation on mock mode, missing creds, or any failure, and
// records the source of the last answer for the honesty badge.

let _lastSource = 'simulated';
export function getLastSource() { return _lastSource; }

let _healthPromise = null;
export function __resetForTest() { _healthPromise = null; _lastSource = 'simulated'; }

async function serverConfigured() {
  if (import.meta.env.VITE_GRANITE_MODE === 'mock') return false;
  if (!_healthPromise) {
    _healthPromise = fetch('/api/granite/health')
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => Boolean(d.configured))
      .catch(() => false);
  }
  return _healthPromise;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function generate(prompt, { system, maxTokens = 512, temperature = 0.2, fallback, timeoutMs = 6000 } = {}) {
  const useSim = () => { _lastSource = 'simulated'; return fallback ? fallback() : ''; };
  if (!(await serverConfigured())) return useSim();
  try {
    const res = await withTimeout(
      fetch('/api/granite/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prompt, system, parameters: { maxTokens, temperature } }),
      }),
      timeoutMs,
    );
    if (!res.ok) return useSim();
    const data = await res.json();
    if (!data || !data.text) return useSim();
    _lastSource = 'granite';
    return data.text;
  } catch {
    return useSim();
  }
}

export async function embed(texts) {
  const res = await fetch('/api/granite/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: texts }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}`);
  return (await res.json()).embeddings;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/services/granite.test.js`
Expected: PASS (all four cases).

- [ ] **Step 5: Run the full test suite (no regressions)**

Run: `npm test`
Expected: PASS — `analytics.test.js` (19), `graniteProxy.test.js`, `granite.test.js` all green.

- [ ] **Step 6: Commit**

```bash
git add src/services/granite.js src/services/granite.test.js
git commit -m "feat(granite): client service with transparent simulation fallback

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Honesty badge + wire Knowledge Brain to Granite

**Files:**
- Create: `src/components/AiSourceBadge.jsx`
- Modify: `src/pages/KnowledgeBrain.jsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `generate`, `getLastSource` (from `../services/granite.js`); existing `matchTopic` in KnowledgeBrain.
- Produces: `<AiSourceBadge source="granite" | "simulated" />`.

- [ ] **Step 1: Create the badge component**

Create `src/components/AiSourceBadge.jsx`:
```jsx
// Small honesty indicator: shows whether an AI answer came from live IBM
// Granite or the local simulation fallback.
export default function AiSourceBadge({ source }) {
  const live = source === 'granite';
  const color = live ? '#22d3ee' : '#64748b';
  const label = live ? 'GRANITE' : 'SIMULATED';
  return (
    <span
      title={live ? 'Answer generated by IBM Granite on watsonx.ai' : 'Answer from local simulation fallback'}
      className={`inline-flex items-center gap-[4px] text-[9px] font-bold tracking-[0.5px] rounded-[3px] px-[6px] py-[1px] border text-[${color}] border-[${color}44] bg-[${color}22]`}
    >
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Wire `KnowledgeBrain.jsx`**

In `src/pages/KnowledgeBrain.jsx`:

(a) Add imports near the top (after the existing imports):
```jsx
import { generate, getLastSource } from '../services/granite.js';
import AiSourceBadge from '../components/AiSourceBadge.jsx';
```

(b) Add a source state next to the existing `aiAnswer` state:
```jsx
const [aiSource, setAiSource] = useState('simulated');
```

(c) Add a grounding system prompt constant (near the `AI_KB_TOPICS` definition):
```jsx
const SPACE_OPS_SYSTEM_PROMPT =
  'You are the MissionMind knowledge assistant for the ARES-7 Mars Orbiter (Sol 412). ' +
  'Answer operator questions about spacecraft telemetry, anomalies, autonomy, and procedures ' +
  'concisely and factually, citing the relevant document or section when possible. ' +
  'If unsure, say so rather than inventing specifics.';
```

(d) Replace the body of `askKB()` with a Granite call that falls back to `matchTopic`:
```jsx
function askKB() {
  setLoading(true);
  setAiAnswer('');
  generate(query, {
    system: SPACE_OPS_SYSTEM_PROMPT,
    fallback: () => matchTopic(query),
  }).then((answer) => {
    setAiAnswer(answer);
    setAiSource(getLastSource());
    setLoading(false);
  });
}
```

(e) In the AI answer block, add the badge next to the "AI KNOWLEDGE RESPONSE" label. Find:
```jsx
              <div className="text-[10px] text-[#22d3ee] tracking-[1px] mb-1">AI KNOWLEDGE RESPONSE</div>
```
and replace with:
```jsx
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-[#22d3ee] tracking-[1px]">AI KNOWLEDGE RESPONSE</span>
                <AiSourceBadge source={aiSource} />
              </div>
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev` (default port), open `http://localhost:5173/#/knowledge`, type a question (e.g. "why is the thruster temperature rising"), click **Ask AI**.
Expected: an answer appears with a badge. Without `.env`, the badge reads **SIMULATED** and the answer matches the prior `matchTopic` behavior (no regression). With a valid `.env` and reachable watsonx, the badge reads **GRANITE** and the answer is model-generated.
Also confirm the browser Network tab shows requests only to `/api/granite/*` (same origin) — no watsonx URL and no API key in any payload.

- [ ] **Step 4: Add the README section**

Append to `README.md`:
```markdown
## Enabling IBM Granite (watsonx.ai)

MissionMind's AI features call **IBM Granite** on watsonx.ai through a local proxy
(the Vite dev server); the app falls back to a built-in simulation whenever the
proxy is unconfigured or unreachable, so it always runs.

1. Copy `.env.example` to `.env` and fill in your watsonx values
   (`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`).
2. `npm run dev` — that's it. Answers now show a **GRANITE** badge when live and
   **SIMULATED** when the fallback is used.
3. To force the reliable simulated path (e.g. for an offline demo), set
   `VITE_GRANITE_MODE=mock` in `.env`.

The API key stays server-side in the Node process and never reaches the browser.
```

- [ ] **Step 5: Confirm lint + build**

Run: `npx eslint . && npm run build`
Expected: lint exit 0; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/AiSourceBadge.jsx src/pages/KnowledgeBrain.jsx README.md
git commit -m "feat(granite): Knowledge Brain uses Granite with live/simulated badge

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Streaming transport (client parser + proxy pipe)

Builds the SSE transport Phase 1's agent trace will consume. The client parser is unit-tested here; the server pipe is IO glue validated end-to-end in Phase 1.

**Files:**
- Modify: `server/graniteProxy.js`
- Modify: `vite.config.js`
- Modify: `src/services/granite.js`
- Test: `src/services/granite.test.js`

**Interfaces:**
- Produces:
  - proxy: `streamGenerate(body, { cfg, fetchImpl }) → Promise<Response>` returning the upstream SSE `Response` (streamable body).
  - client: `generateStream(prompt, { system, fallback, timeoutMs }) → AsyncGenerator<string>` yielding text deltas; on any failure yields the fallback once and marks `simulated`.

- [ ] **Step 1: Write the failing client-parser test**

Append to `src/services/granite.test.js`:
```js
import { generateStream } from './granite.js';

function sseStream(chunks) {
  const encoder = new TextEncoder();
  return {
    ok: true,
    body: {
      getReader() {
        let i = 0;
        return {
          read: async () =>
            i < chunks.length
              ? { done: false, value: encoder.encode(chunks[i++]) }
              : { done: true, value: undefined },
        };
      },
    },
  };
}

describe('granite.generateStream', () => {
  it('yields text deltas parsed from the SSE stream', async () => {
    stubFetch({
      '/health': () => ({ ok: true, json: async () => ({ configured: true }) }),
      '/generate_stream': () =>
        sseStream([
          'data: {"results":[{"generated_text":"Hel"}]}\n\n',
          'data: {"results":[{"generated_text":"lo"}]}\n\n',
        ]),
    });
    const out = [];
    for await (const t of generateStream('Q', { fallback: () => 'SIM' })) out.push(t);
    expect(out.join('')).toBe('Hello');
    expect(getLastSource()).toBe('granite');
  });

  it('yields the fallback once when not configured', async () => {
    stubFetch({ '/health': () => ({ ok: true, json: async () => ({ configured: false }) }) });
    const out = [];
    for await (const t of generateStream('Q', { fallback: () => 'SIM' })) out.push(t);
    expect(out).toEqual(['SIM']);
    expect(getLastSource()).toBe('simulated');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/services/granite.test.js`
Expected: FAIL — `generateStream` not exported.

- [ ] **Step 3: Implement the client generator**

Append to `src/services/granite.js`:
```js
export async function* generateStream(prompt, { system, fallback, timeoutMs = 6000 } = {}) {
  const useSim = () => { _lastSource = 'simulated'; return fallback ? fallback() : ''; };
  if (!(await serverConfigured())) { yield useSim(); return; }
  let res;
  try {
    res = await withTimeout(
      fetch('/api/granite/generate_stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prompt, system }),
      }),
      timeoutMs,
    );
  } catch { yield useSim(); return; }
  if (!res.ok || !res.body) { yield useSim(); return; }
  _lastSource = 'granite';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const d = JSON.parse(payload);
        const t = d.results?.[0]?.generated_text;
        if (t) yield t;
      } catch { /* ignore keep-alive / non-JSON frames */ }
    }
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/services/granite.test.js`
Expected: PASS (streaming cases + all earlier cases).

- [ ] **Step 5: Add the proxy stream function**

Append to `server/graniteProxy.js`:
```js
// Returns the upstream watsonx SSE Response so the caller can pipe its body.
export async function streamGenerate(body, { cfg = readConfig(), fetchImpl = fetch } = {}) {
  const token = await getIamToken(cfg, { fetchImpl });
  const { body: reqBody } = buildGenerationRequest(body, cfg);
  return fetchImpl(`${cfg.url}/ml/v1/text/generation_stream?version=${API_VERSION}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(reqBody),
  });
}
```

- [ ] **Step 6: Pipe the stream in the Vite plugin**

In `vite.config.js`, update the middleware to special-case the stream route. Replace the `req.on('end', ...)` handler body with:
```js
        req.on('end', async () => {
          let body = {}
          try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
          const pathname = (req.originalUrl || req.url || '').split('?')[0]
          if (pathname.endsWith('/generate_stream')) {
            if (!readConfig(env).apiKey) { res.statusCode = 503; res.end('{"error":"not_configured"}'); return }
            try {
              const upstream = await streamGenerate(body, { cfg })
              res.statusCode = upstream.status
              res.setHeader('Content-Type', 'text/event-stream')
              res.setHeader('Cache-Control', 'no-cache')
              const reader = upstream.body.getReader()
              const pump = async () => {
                const { done, value } = await reader.read()
                if (done) { res.end(); return }
                res.write(Buffer.from(value))
                pump()
              }
              pump()
            } catch (e) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e?.message || e) })) }
            return
          }
          const { status, body: out } = await handleRequest(pathname, body, { cfg })
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(out))
        })
```
And add `streamGenerate` to the import from `./server/graniteProxy.js`:
```js
import { readConfig, handleRequest, streamGenerate } from './server/graniteProxy.js'
```

- [ ] **Step 7: Full verification**

Run: `npm test && npx eslint . && npm run build`
Expected: all tests pass; lint exit 0; build succeeds with split chunks (no 500 KB warning).

- [ ] **Step 8: Commit**

```bash
git add server/graniteProxy.js vite.config.js src/services/granite.js src/services/granite.test.js
git commit -m "feat(granite): SSE streaming transport (client parser + proxy pipe)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Definition of Done (Phase 0)

- Knowledge Brain "Ask AI" returns a real Granite answer with a **GRANITE** badge when `.env` is configured, and a **SIMULATED** answer (matching prior behavior) with no error when in mock mode, unconfigured, or when watsonx is unreachable.
- The watsonx key never appears in any browser payload (only `/api/granite/*` calls are visible).
- `npm run dev` is the only command needed to run everything.
- `npm test` (proxy + service + analytics), `npm run lint`, and `npm run build` all pass.
- `src/services/granite.js` (`generate`, `generateStream`, `embed`, `getLastSource`) is ready for Phase 1 to build the agentic copilot on.
