/**
 * Model Health Validation Service
 *
 * Tests every active model in the database with a minimal prompt.
 * Marks is_active = true/false based on actual response.
 * Logs model name, provider, status, and latency.
 */

require('dotenv').config();
const OpenAI   = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const axios    = require('axios');
const db       = require('../../database');

// Health check timeout in ms
const TIMEOUT_MS = 12000;

// Provider SDK factories
function getOpenAIClient(provider, apiKey) {
  const baseURLs = {
    openai:      'https://api.openai.com/v1',
    groq:        'https://api.groq.com/openai/v1',
    nvidia:      'https://integrate.api.nvidia.com/v1',
    openrouter:  'https://openrouter.ai/api/v1',
  };
  return new OpenAI({ apiKey, baseURL: baseURLs[provider] });
}

/**
 * Test a single model with a minimal prompt.
 * Returns { ok, latencyMs, error }
 */
async function pingModel(provider, modelName, apiKey) {
  const start = Date.now();
  try {
    const prompt = [{ role: 'user', content: 'Reply with only the word: OK' }];

    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey });
      await Promise.race([
        client.messages.create({ model: modelName, max_tokens: 10, messages: prompt }),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), TIMEOUT_MS)),
      ]);
    } else if (provider === 'google') {
      await Promise.race([
        axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          { contents: [{ parts: [{ text: 'Reply with only the word: OK' }] }] },
          { timeout: TIMEOUT_MS }
        ),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), TIMEOUT_MS)),
      ]);
    } else {
      // OpenAI-compatible (openai, groq, nvidia, openrouter)
      const client = getOpenAIClient(provider, apiKey);
      await Promise.race([
        client.chat.completions.create({ model: modelName, max_tokens: 10, messages: prompt }),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), TIMEOUT_MS)),
      ]);
    }

    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 120) };
  }
}

/**
 * Validate all active models in the database.
 * Updates is_active flag based on actual ping result.
 *
 * @param {string|null} filterProvider - Optional: only validate models for a specific provider
 * @returns {Promise<{ results: Array, summary: object }>}
 */
async function validateAllModels(filterProvider = null) {
  const where = filterProvider ? { provider: filterProvider } : {};
  const models = await db.model.findMany({ where, orderBy: [{ provider: 'asc' }, { model_name: 'asc' }] });

  const apiKeys = {
    openai:     process.env.OPENAI_API_KEY,
    anthropic:  process.env.ANTHROPIC_API_KEY,
    google:     process.env.GEMINI_API_KEY,
    groq:       process.env.GROQ_API_KEY,
    nvidia:     process.env.NVIDIA_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };

  const results = [];
  let passed = 0, failed = 0, skipped = 0;

  console.log(`\n🔍 Validating ${models.length} models...\n`);

  for (const model of models) {
    const apiKey = apiKeys[model.provider];
    if (!apiKey) {
      console.log(`  ⏩ SKIP  [${model.provider}] ${model.model_name} (no API key)`);
      skipped++;
      results.push({ ...model, healthStatus: 'skipped' });
      continue;
    }

    const { ok, latencyMs, error } = await pingModel(model.provider, model.model_name, apiKey);

    // Update DB
    await db.model.update({
      where: { model_id: model.model_id },
      data: { is_active: ok },
    });

    if (ok) {
      console.log(`  ✅ PASS  [${model.provider}] ${model.model_name} — ${latencyMs}ms`);
      passed++;
    } else {
      console.log(`  ❌ FAIL  [${model.provider}] ${model.model_name} — ${error}`);
      failed++;
    }

    results.push({ ...model, is_active: ok, healthStatus: ok ? 'pass' : 'fail', latencyMs, error });
  }

  const summary = { total: models.length, passed, failed, skipped };
  console.log(`\n📊 Health Check Summary:`);
  console.log(`   ✅ Passed:  ${passed}`);
  console.log(`   ❌ Failed:  ${failed}`);
  console.log(`   ⏩ Skipped: ${skipped}\n`);

  return { results, summary };
}

module.exports = { validateAllModels, pingModel };
