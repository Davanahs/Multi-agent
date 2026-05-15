/**
 * LLM Router Service — Smart Cascading Fallback Engine
 *
 * Responsibilities:
 *  1. Pick the best available active model for a given task type
 *  2. Call that model
 *  3. If it fails, cascade to the next best model
 *  4. If ALL fail, return an error with full attempt trace
 *
 * Task-type routing priority:
 *  - planning/reasoning → gemini-pro > openai-gpt4 > anthropic > openrouter
 *  - coding             → openai-gpt4 > anthropic > gemini-pro > groq
 *  - fast/cheap         → groq > gemini-flash > nvidia > openrouter
 *  - general            → gemini > openai > anthropic > groq > nvidia > openrouter
 */

require('dotenv').config();
const OpenAI    = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const axios     = require('axios');
const db        = require('../../database');

// ─── Provider Priority by Task Type ──────────────────────────────────────────
const TASK_PRIORITY = {
  planning:  ['google', 'openai', 'anthropic', 'openrouter', 'groq', 'nvidia'],
  reasoning: ['google', 'openai', 'anthropic', 'openrouter', 'groq', 'nvidia'],
  coding:    ['openai', 'anthropic', 'google', 'openrouter', 'groq', 'nvidia'],
  ui:        ['openai', 'anthropic', 'google', 'openrouter', 'groq', 'nvidia'],
  research:  ['google', 'openai', 'anthropic', 'openrouter', 'groq', 'nvidia'],
  fast:      ['groq', 'google', 'nvidia', 'openrouter', 'openai', 'anthropic'],
  general:   ['google', 'openai', 'anthropic', 'groq', 'nvidia', 'openrouter'],
};

// Preferred models within each provider (ordered by quality)
const PREFERRED_MODELS = {
  google:     ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro-latest'],
  openai:     ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic:  ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  groq:       ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  nvidia:     ['meta/llama-3.1-70b-instruct', 'nvidia/llama-3.1-nemotron-70b-instruct'],
  openrouter: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5'],
};

/**
 * Get the best available active model from DB for a given provider.
 */
async function getBestModelForProvider(provider) {
  const preferred = PREFERRED_MODELS[provider] || [];

  // Try preferred models first (in priority order)
  for (const modelName of preferred) {
    const model = await db.model.findFirst({
      where: { provider, model_name: modelName, is_active: true },
    });
    if (model) return model;
  }

  // Fallback: any active model for this provider
  return db.model.findFirst({
    where: { provider, is_active: true },
    orderBy: { model_name: 'asc' },
  });
}

/**
 * Call a specific model with a prompt.
 * Returns { content, model_name, provider, tokens }
 */
async function callModel({ provider, modelName, messages, maxTokens = 4096 }) {
  const apiKeys = {
    openai:     process.env.OPENAI_API_KEY,
    anthropic:  process.env.ANTHROPIC_API_KEY,
    google:     process.env.GEMINI_API_KEY,
    groq:       process.env.GROQ_API_KEY,
    nvidia:     process.env.NVIDIA_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };

  const apiKey = apiKeys[provider];
  if (!apiKey) throw new Error(`No API key configured for ${provider}`);

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsgs  = messages.filter(m => m.role !== 'system');
    const resp = await client.messages.create({
      model: modelName, max_tokens: maxTokens,
      system: systemMsg, messages: userMsgs,
    });
    return {
      content:    resp.content[0].text,
      model_name: modelName,
      provider,
      tokens: { input: resp.usage.input_tokens, output: resp.usage.output_tokens },
    };
  }

  if (provider === 'google') {
    const apiKey2 = process.env.GEMINI_API_KEY;

    // Gemini doesn't support 'system' role in contents — extract it separately
    const systemMsg = messages.find(m => m.role === 'system')?.content || null;
    const nonSystemMsgs = messages.filter(m => m.role !== 'system');

    // Gemini requires alternating user/model turns starting with user
    // Collapse consecutive same-role messages if needed
    const contents = nonSystemMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = { contents };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg }] };

    const resp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey2}`,
      body,
      { timeout: 30000 }
    );

    const text = resp.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text.trim()) {
      throw new Error(`model output error: model output must contain either output text or tool calls, these cannot both be empty`);
    }
    return {
      content: text, model_name: modelName, provider,
      tokens: { input: 0, output: 0 },
    };
  }

  // OpenAI-compatible (openai, groq, nvidia, openrouter)
  const baseURLs = {
    openai:     'https://api.openai.com/v1',
    groq:       'https://api.groq.com/openai/v1',
    nvidia:     'https://integrate.api.nvidia.com/v1',
    openrouter: 'https://openrouter.ai/api/v1',
  };
  const client = new OpenAI({ apiKey, baseURL: baseURLs[provider] });
  // OpenRouter free tier has token limits — cap at 1024
  const effectiveMaxTokens = provider === 'openrouter' ? Math.min(maxTokens, 1024) : maxTokens;
  const resp = await client.chat.completions.create({ model: modelName, messages, max_tokens: effectiveMaxTokens });
  const content = resp.choices[0].message.content || '';
  if (!content.trim()) throw new Error('Model returned empty response');
  return {
    content,
    model_name: modelName,
    provider,
    tokens: { input: resp.usage?.prompt_tokens || 0, output: resp.usage?.completion_tokens || 0 },
  };
}

/**
 * Main entry point — routes a prompt through the best available model with cascading fallback.
 *
 * @param {Object} opts
 * @param {Array}  opts.messages        - Array of { role, content } messages
 * @param {string} opts.taskType        - 'planning' | 'coding' | 'research' | 'fast' | 'general' | 'ui'
 * @param {string} [opts.preferProvider] - Try this provider first (optional)
 * @param {string} [opts.preferModel]   - Try this specific model first (optional)
 * @param {number} [opts.maxTokens]     - Max output tokens (default 4096)
 * @returns {Promise<{ content, model_name, provider, tokens, attempts }>}
 */
async function routePrompt({ messages, taskType = 'general', preferProvider, preferModel, maxTokens = 4096 }) {
  const providerOrder = TASK_PRIORITY[taskType] || TASK_PRIORITY.general;
  const attempts      = [];

  // Build ordered list of (provider, model) to try
  const queue = [];

  // 1. If a specific model is preferred, try it first
  if (preferProvider && preferModel) {
    queue.push({ provider: preferProvider, modelName: preferModel });
  }

  // 2. Add best model for each provider in priority order
  for (const provider of providerOrder) {
    const model = await getBestModelForProvider(provider);
    if (model && !queue.find(q => q.provider === provider && q.modelName === model.model_name)) {
      queue.push({ provider, modelName: model.model_name });
    }
  }

  // 3. Cascade through the queue
  for (const { provider, modelName } of queue) {
    const start = Date.now();
    console.log(`  🔀 Trying [${provider}] ${modelName}...`);
    try {
      const result = await callModel({ provider, modelName, messages, maxTokens });
      const latency = Date.now() - start;
      attempts.push({ provider, modelName, status: 'success', latencyMs: latency });
      console.log(`  ✅ Success [${provider}] ${modelName} (${latency}ms)`);
      return { ...result, attempts };
    } catch (err) {
      const latency = Date.now() - start;
      const errMsg  = err.message?.slice(0, 150) || 'Unknown error';
      attempts.push({ provider, modelName, status: 'failed', error: errMsg, latencyMs: latency });
      console.warn(`  ⚠️  Failed [${provider}] ${modelName}: ${errMsg}`);

      // Mark model as inactive in DB if it's a hard failure (not a rate limit)
      if (!errMsg.includes('429') && !errMsg.includes('rate')) {
        await db.model.updateMany({
          where: { provider, model_name: modelName },
          data: { is_active: false },
        });
      }
    }
  }

  // All models failed
  const errorReport = attempts.map(a => `  - [${a.provider}] ${a.modelName}: ${a.error || 'OK'}`).join('\n');
  throw new Error(`All models failed for taskType "${taskType}". Attempts:\n${errorReport}`);
}

module.exports = { routePrompt, callModel, getBestModelForProvider, TASK_PRIORITY };
