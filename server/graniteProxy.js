// server/graniteProxy.js
// Framework-agnostic watsonx.ai proxy logic. No Vite/Express imports so this
// module is portable to a serverless function later. Uses Node's global fetch.

const API_VERSION = '2024-05-31';
// eslint-disable-next-line no-unused-vars
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
