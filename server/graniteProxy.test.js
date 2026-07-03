import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { readConfig, isConfigured, buildGenerationRequest, getIamToken, _resetTokenCache } from './graniteProxy.js';

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
