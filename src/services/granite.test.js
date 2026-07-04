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
