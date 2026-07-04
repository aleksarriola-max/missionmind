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

  it('falls back to simulation when the health probe never resolves', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const out = await generate('Q', { fallback: () => 'SIM', timeoutMs: 50 });
    expect(out).toBe('SIM');
    expect(getLastSource()).toBe('simulated');
  });
});

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
