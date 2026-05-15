const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const modelsRepository = require('./models.repository');

// ─── Provider Configuration ──────────────────────────────────────────────────
const PROVIDERS = {
  openai:      { envKey: 'OPENAI_API_KEY' },
  anthropic:   { envKey: 'ANTHROPIC_API_KEY' },
  google:      { envKey: 'GEMINI_API_KEY' },
  gemini:      { envKey: 'GEMINI_API_KEY' },
  groq:        { envKey: 'GROQ_API_KEY' },
  nvidia:      { envKey: 'NVIDIA_API_KEY' },
  openrouter:  { envKey: 'OPENROUTER_API_KEY' },
};

/**
 * Synchronize models for a given provider.
 * Falls back to environment variables if no apiKey is explicitly passed.
 */
async function syncModels(provider, apiKey) {
  if (!provider) throw new Error('Provider is required.');

  const normalizedProvider = provider.toLowerCase().trim();
  const config = PROVIDERS[normalizedProvider];
  if (!config) throw new Error(`Unsupported provider: ${provider}`);

  const finalApiKey = apiKey || process.env[config.envKey];
  if (!finalApiKey) {
    throw new Error(`API key missing for ${provider}. Set ${config.envKey} in .env`);
  }

  let modelNames = [];
  switch (normalizedProvider) {
    case 'openai':     modelNames = await fetchOpenAIModels(finalApiKey);     break;
    case 'anthropic':  modelNames = await fetchAnthropicModels(finalApiKey);  break;
    case 'google':
    case 'gemini':     modelNames = await fetchGoogleModels(finalApiKey);     break;
    case 'groq':       modelNames = await fetchGroqModels(finalApiKey);       break;
    case 'nvidia':     modelNames = await fetchNvidiaModels(finalApiKey);     break;
    case 'openrouter': modelNames = await fetchOpenRouterModels(finalApiKey); break;
  }

  modelNames = modelNames.filter(Boolean).sort();
  if (modelNames.length === 0) throw new Error(`No models found for provider: ${provider}`);

  const count = await modelsRepository.syncProviderModels(normalizedProvider, modelNames);
  return { provider: normalizedProvider, modelsUpdated: count, models: modelNames };
}

/**
 * Sync all providers that have a valid API key in .env.
 */
async function syncAllProviders() {
  const results = [];
  for (const [provider, config] of Object.entries(PROVIDERS)) {
    if (provider === 'gemini') continue; // skip alias, 'google' handles it
    if (process.env[config.envKey]) {
      try {
        const result = await syncModels(provider);
        results.push({ provider, status: 'success', count: result.modelsUpdated });
      } catch (err) {
        results.push({ provider, status: 'error', error: err.message });
      }
    }
  }
  return results;
}

// ─── Provider Fetchers ────────────────────────────────────────────────────────

async function fetchOpenAIModels(apiKey) {
  const openai = new OpenAI({ apiKey });
  const list = await openai.models.list();
  // Filter to only GPT/o-series models (skip dall-e, tts, whisper etc)
  return list.data
    .map(m => m.id)
    .filter(id => id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4'));
}

async function fetchAnthropicModels(apiKey) {
  const anthropic = new Anthropic({ apiKey });
  const list = await anthropic.models.list();
  return list.data.map(m => m.id);
}

async function fetchGoogleModels(apiKey) {
  const response = await axios.get(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
  );
  if (!response.data?.models) return [];
  return response.data.models
    .map(m => m.name.replace('models/', ''))
    .filter(name => name.startsWith('gemini')); // Only gemini models
}

async function fetchGroqModels(apiKey) {
  const groq = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
  const list = await groq.models.list();
  return list.data.map(m => m.id);
}

async function fetchNvidiaModels(apiKey) {
  // NVIDIA NIM uses OpenAI-compatible API
  const nvidia = new OpenAI({
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });
  const list = await nvidia.models.list();
  return list.data.map(m => m.id);
}

async function fetchOpenRouterModels(apiKey) {
  const response = await axios.get('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://multi-agent-system.local',
    },
  });
  if (!response.data?.data) return [];
  return response.data.data.map(m => m.id);
}

module.exports = { syncModels, syncAllProviders, PROVIDERS };
