/**
 * Multi-Agent Backend Server
 *
 * Boot sequence:
 *  1. Connect to database (Neon DB via Prisma)
 *  2. Dynamically sync schema — creates all tables if they don't exist
 *  3. Start Express HTTP server
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const db         = require('../database');

const modelSyncService   = require('./services/model-sync.service');
const modelHealthService = require('./services/model-health.service');
const llmRouter          = require('./services/llm-router.service');
const plannerAgent       = require('./agents/planner.agent');
const depResolver        = require('./services/dependency-resolver.service');
const executionEngine    = require('./agents/execution-engine');
const resultMerger       = require('./agents/result-merger.agent');

// In-memory SSE client registry: workflowId → [res, res, ...]
const sseClients = new Map();

function emitToWorkflow(workflowId, event, data) {
  const clients = sseClients.get(workflowId) || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => { try { res.write(payload); } catch (_) {} });
}

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const result = await db.$queryRaw`SELECT NOW() AS server_time`;
    const modelCount = await db.model.count({ where: { is_active: true } });
    res.json({
      status:       'healthy',
      uptime:       process.uptime(),
      database:     'connected',
      activeModels: modelCount,
      server_time:  result[0].server_time,
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: err.message });
  }
});

// ─── DB Tables ───────────────────────────────────────────────────────────────
app.get('/db/tables', async (req, res) => {
  try {
    const tables = await db.$queryRaw`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_name
    `;
    res.json({ tables: tables.map(t => ({ table_name: t.table_name, schema: t.table_schema })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MODELS API
// ════════════════════════════════════════════════════════════════════════════

// GET /api/models — list active models
app.get('/api/models', async (req, res) => {
  try {
    const { provider } = req.query;
    const models = await db.model.findMany({
      where:   { is_active: true, ...(provider ? { provider } : {}) },
      orderBy: [{ provider: 'asc' }, { model_name: 'asc' }],
    });
    res.json({ count: models.length, models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/models/sync — sync models from one or all providers
app.post('/api/models/sync', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    if (provider) {
      const result = await modelSyncService.syncModels(provider, apiKey);
      res.json({ success: true, message: `Synced ${result.modelsUpdated} models for ${result.provider}`, data: result });
    } else {
      // Sync all configured providers
      const results = await modelSyncService.syncAllProviders();
      res.json({ success: true, message: 'Synced all providers', data: results });
    }
  } catch (err) {
    console.error('Model sync error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/models/validate — health-check all models, mark active/inactive
app.post('/api/models/validate', async (req, res) => {
  try {
    const { provider } = req.body; // optional: filter by provider
    console.log(`\n[Model Validation] Starting${provider ? ` for ${provider}` : ' for all providers'}...`);
    const { results, summary } = await modelHealthService.validateAllModels(provider || null);
    res.json({ success: true, summary, results });
  } catch (err) {
    console.error('Validation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/models/health — get current active/inactive stats
app.get('/api/models/health', async (req, res) => {
  try {
    const stats = await db.$queryRaw`
      SELECT provider,
        COUNT(*) FILTER (WHERE is_active = true)  AS active,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive,
        COUNT(*)                                   AS total
      FROM models
      GROUP BY provider
      ORDER BY provider
    `;
    // Convert BigInt to Number for JSON serialization
    const byProvider = stats.map(r => ({
      provider: r.provider,
      active:   Number(r.active),
      inactive: Number(r.inactive),
      total:    Number(r.total),
    }));
    const total = {
      active:   byProvider.reduce((s, r) => s + r.active, 0),
      inactive: byProvider.reduce((s, r) => s + r.inactive, 0),
      total:    byProvider.reduce((s, r) => s + r.total, 0),
    };
    res.json({ byProvider, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/llm/test — test the cascading LLM router
app.post('/api/llm/test', async (req, res) => {
  try {
    const { prompt, taskType = 'general', preferProvider, preferModel } = req.body;
    if (!prompt) return res.status(400).json({ error: '`prompt` is required' });

    console.log(`\n[LLM Router] taskType=${taskType}, prompt="${prompt.slice(0, 60)}..."`);
    const result = await llmRouter.routePrompt({
      messages:       [{ role: 'user', content: prompt }],
      taskType,
      preferProvider,
      preferModel,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[LLM Router] All models failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// WORKFLOWS API
// ════════════════════════════════════════════════════════════════════════════

// POST /api/workflows — create + plan a new workflow
app.post('/api/workflows', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: '`prompt` is required' });

    // 1. Create workflow record
    const workflow = await db.workflow.create({
      data: { prompt: prompt.trim(), status: 'planning' },
    });

    // Respond immediately so client isn't waiting
    res.status(202).json({
      message:     'Workflow created — planning in progress',
      workflow_id: workflow.workflow_id,
      status:      workflow.status,
    });

    // 2. Run planner async (fire-and-forget, update DB when done)
    setImmediate(async () => {
      try {
        await plannerAgent.runPlanner(workflow.workflow_id, prompt.trim());
        console.log(`[Workflow ${workflow.workflow_id}] ✅ Planning complete`);
      } catch (err) {
        console.error(`[Workflow ${workflow.workflow_id}] ❌ Planning failed:`, err.message);
        await db.workflow.update({
          where: { workflow_id: workflow.workflow_id },
          data:  { status: 'failed', result: { error: err.message } },
        });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows — list all workflows
app.get('/api/workflows', async (req, res) => {
  try {
    const workflows = await db.workflow.findMany({
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { _count: { select: { subtasks: true } } },
    });
    res.json({ count: workflows.length, workflows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:id — get workflow detail + subtasks
app.get('/api/workflows/:id', async (req, res) => {
  try {
    const workflow = await db.workflow.findUnique({
      where:   { workflow_id: req.params.id },
      include: { subtasks: { include: { deps: true }, orderBy: { created_at: 'asc' } } },
    });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:id/plan — get the DAG execution plan (waves)
app.get('/api/workflows/:id/plan', async (req, res) => {
  try {
    const workflow = await db.workflow.findUnique({ where: { workflow_id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (workflow.status === 'planning') {
      return res.json({ message: 'Planning still in progress, try again in a moment', status: 'planning' });
    }
    const plan = await depResolver.getExecutionSummary(req.params.id);
    res.json({ workflow_id: req.params.id, status: workflow.status, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PHASE 3: EXECUTION + SSE STREAMING
// ════════════════════════════════════════════════════════════════════════════

// GET /api/workflows/:id/stream — SSE live event stream
app.get('/api/workflows/:id/stream', (req, res) => {
  const workflowId = req.params.id;
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  // Register this client
  if (!sseClients.has(workflowId)) sseClients.set(workflowId, []);
  sseClients.get(workflowId).push(res);

  // Send a heartbeat every 20s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); }
  }, 20000);

  res.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(workflowId) || [];
    sseClients.set(workflowId, clients.filter(c => c !== res));
  });
});

// POST /api/workflows/:id/execute — start executing a planned workflow
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const workflow = await db.workflow.findUnique({ where: { workflow_id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (!['planned', 'failed'].includes(workflow.status)) {
      return res.status(400).json({ error: `Cannot execute workflow with status: ${workflow.status}` });
    }

    await db.workflow.update({ where: { workflow_id: workflow.workflow_id }, data: { status: 'running' } });

    res.json({ message: 'Execution started', workflow_id: workflow.workflow_id, status: 'running' });

    // Fire-and-forget async execution
    setImmediate(async () => {
      const emit = (event, data) => emitToWorkflow(workflow.workflow_id, event, data);
      try {
        const outputStore = await executionEngine.executeWorkflow(workflow.workflow_id, emit);
        await resultMerger.mergeResults(workflow.workflow_id, workflow.prompt, outputStore, emit);
      } catch (err) {
        console.error(`[Execute ${workflow.workflow_id}] ❌ Fatal:`, err.message);
        await db.workflow.update({
          where: { workflow_id: workflow.workflow_id },
          data:  { status: 'failed', result: { error: err.message } },
        });
        emit('workflow.failed', { error: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows — UPDATED: now auto-starts execution after planning
// (handled inline in the existing POST /api/workflows route by chaining execute after plan)

// GET /api/workflows/:id/result — get the final merged result
app.get('/api/workflows/:id/result', async (req, res) => {
  try {
    const workflow = await db.workflow.findUnique({ where: { workflow_id: req.params.id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (workflow.status !== 'done') {
      return res.json({ status: workflow.status, message: 'Workflow not yet complete', result: null });
    }
    res.json({
      workflow_id: workflow.workflow_id,
      prompt:      workflow.prompt,
      status:      workflow.status,
      result:      workflow.result,
      created_at:  workflow.created_at,
      updated_at:  workflow.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n  ⚡ ${signal} received — shutting down...`);
  await db.closeDatabase();
  process.exit(0);
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Boot Sequence ───────────────────────────────────────────────────────────
async function boot() {
  console.log('');
  console.log('┌──────────────────────────────────────────┐');
  console.log('│        MULTI-AGENT SYSTEM v1.0.0         │');
  console.log('└──────────────────────────────────────────┘');
  console.log('');

  console.log('⏳ Step 1 — Initializing database...');
  await db.initDatabase();

  console.log('\n⏳ Step 2 — Starting HTTP server...');
  app.listen(PORT, () => {
    console.log('');
    console.log('┌──────────────────────────────────────────────────────┐');
    console.log(`│  🚀 Server:    http://localhost:${PORT}                  │`);
    console.log(`│  ❤️  Health:   http://localhost:${PORT}/health           │`);
    console.log(`│  🤖 Models:   http://localhost:${PORT}/api/models        │`);
    console.log(`│  🔍 Validate: POST /api/models/validate              │`);
    console.log(`│  📊 Stats:    GET  /api/models/health                │`);
    console.log(`│  🔀 LLM Test: POST /api/llm/test                     │`);
    console.log('└──────────────────────────────────────────────────────┘');
    console.log('');
  });
}

boot().catch((err) => {
  console.error('Fatal boot error:', err.message);
  process.exit(1);
});

module.exports = app;
