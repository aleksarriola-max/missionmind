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
