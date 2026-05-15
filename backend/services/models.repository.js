const db = require('../../database');

/**
 * Synchronize models for a specific provider into the database.
 * Uses Prisma upsert — inserts if new, updates is_active if existing.
 *
 * @param {string}   provider   - e.g. 'openai', 'anthropic'
 * @param {string[]} modelNames - List of active model names from the provider API
 * @returns {Promise<number>}   - Number of models upserted
 */
async function syncProviderModels(provider, modelNames) {
  // 1. Mark all existing models for this provider as inactive
  await db.model.updateMany({
    where: { provider },
    data:  { is_active: false },
  });

  // 2. Upsert each active model
  let updatedCount = 0;
  for (const name of modelNames) {
    await db.model.upsert({
      where:  { unique_model_provider: { model_name: name, provider } },
      create: { model_name: name, provider, is_active: true },
      update: { is_active: true },
    });
    updatedCount++;
  }

  return updatedCount;
}

/**
 * Get all active models, optionally filtered by provider.
 * @param {string|null} provider
 */
async function getActiveModels(provider = null) {
  return db.model.findMany({
    where:   { is_active: true, ...(provider ? { provider } : {}) },
    orderBy: [{ provider: 'asc' }, { model_name: 'asc' }],
  });
}

module.exports = { syncProviderModels, getActiveModels };
