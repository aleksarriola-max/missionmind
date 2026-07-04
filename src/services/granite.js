// src/services/granite.js
// Single client interface for IBM Granite. Transparently falls back to the
// app's existing simulation on mock mode, missing creds, or any failure, and
// records the source of the last answer for the honesty badge.

let _lastSource = 'simulated';
export function getLastSource() { return _lastSource; }

let _healthPromise = null;
export function __resetForTest() { _healthPromise = null; _lastSource = 'simulated'; }

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function serverConfigured(timeoutMs = 6000) {
  if (import.meta.env.VITE_GRANITE_MODE === 'mock') return false;
  if (!_healthPromise) {
    _healthPromise = withTimeout(fetch('/api/granite/health'), timeoutMs)
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => Boolean(d.configured))
      .catch(() => false);
  }
  return _healthPromise;
}

export async function generate(prompt, { system, maxTokens = 512, temperature = 0.2, fallback, timeoutMs = 6000 } = {}) {
  const fallbackToSim = () => { _lastSource = 'simulated'; return fallback ? fallback() : ''; };
  if (!(await serverConfigured(timeoutMs))) return fallbackToSim();
  try {
    const res = await withTimeout(
      fetch('/api/granite/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prompt, system, parameters: { maxTokens, temperature } }),
      }),
      timeoutMs,
    );
    if (!res.ok) return fallbackToSim();
    const data = await res.json();
    if (!data || !data.text) return fallbackToSim();
    _lastSource = 'granite';
    return data.text;
  } catch {
    return fallbackToSim();
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
