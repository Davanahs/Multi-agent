/**
 * Parallel Execution Engine
 *
 * Reads the DAG from the dependency resolver and executes tasks in waves.
 * - Tasks in the same wave run in parallel via Promise.all
 * - Outputs from earlier tasks are injected as context into later tasks
 * - Failed tasks are retried up to MAX_RETRIES times with different models
 * - SSE events are emitted after each task and wave
 */

const db           = require('../../database');
const depResolver  = require('../services/dependency-resolver.service');
const subAgent     = require('./sub-agent.executor');

const MAX_RETRIES = 2;

/**
 * Run all tasks for a workflow in the correct dependency order.
 *
 * @param {string}   workflowId
 * @param {Function} emit  - SSE emit function: emit(eventType, data)
 */
async function executeWorkflow(workflowId, emit = () => {}) {
  emit('workflow.started', { workflowId, timestamp: new Date().toISOString() });

  const { waves, taskMap } = await depResolver.buildExecutionPlan(workflowId);
  const totalTasks = waves.reduce((s, w) => s + w.length, 0);
  const outputStore = new Map();

  console.log('\n' + '═'.repeat(60));
  console.log(`  🚀 WORKFLOW EXECUTION STARTED`);
  console.log(`  ID:     ${workflowId}`);
  console.log(`  Tasks:  ${totalTasks} across ${waves.length} waves`);
  console.log('═'.repeat(60));

  for (let waveIdx = 0; waveIdx < waves.length; waveIdx++) {
    const wave    = waves[waveIdx];
    const waveNum = waveIdx + 1;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ⚡ WAVE ${waveNum}/${waves.length} — ${wave.length > 1 ? `${wave.length} TASKS IN PARALLEL` : '1 TASK'}`);
    wave.forEach(t => console.log(`     • ${t.task_id} [${t.type}] "${t.task.slice(0, 70)}..."`));
    console.log(`${'─'.repeat(60)}`);

    emit('wave.started', {
      wave: waveNum, totalWaves: waves.length,
      tasks: wave.map(t => ({ task_id: t.task_id, type: t.type, task: t.task })),
    });

    const waveStart = Date.now();
    await Promise.all(wave.map(task => runTask(task, outputStore, emit, waveNum)));
    const waveMs = Date.now() - waveStart;

    console.log(`\n  ✅ Wave ${waveNum} complete in ${(waveMs / 1000).toFixed(1)}s`);
    emit('wave.completed', { wave: waveNum, totalWaves: waves.length, durationMs: waveMs });
  }

  await db.workflow.update({
    where: { workflow_id: workflowId },
    data:  { status: 'merging' },
  });

  console.log('\n' + '─'.repeat(60));
  console.log('  🔀 All tasks complete — starting Result Merger...');
  emit('workflow.merging', { workflowId });
  return outputStore;
}

/**
 * Execute a single task with retry logic.
 */
async function runTask(task, outputStore, emit, waveNum) {
  const { subtask_id, task_id, type } = task;
  const depContext = buildDependencyContext(task, outputStore);

  await db.subtask.update({ where: { subtask_id }, data: { status: 'running' } });

  console.log(`\n  🤖 [${task_id}] ${type.toUpperCase()} AGENT`);
  console.log(`     Task:    "${task.task}"`);
  if (depContext) {
    console.log(`     Context: ${depContext.length} chars injected from ${task.deps?.map(d => d.depends_on_task_id).join(', ')}`);
  } else {
    console.log(`     Context: none (no dependencies)`);
  }

  emit('task.started', { task_id, type, task: task.task, agent: `${type}-agent` });

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`     🔄 Retry ${attempt}/${MAX_RETRIES} — previous error: ${lastError?.slice(0, 80)}`);
      emit('task.retry', { task_id, attempt, maxRetries: MAX_RETRIES, reason: lastError });
    }

    try {
      const startTime = Date.now();
      const result    = await subAgent.executeSubAgent(task, depContext);
      const execMs    = Date.now() - startTime;

      // Log reasoning/output preview
      console.log(`     ✅ Done via ${result.provider}/${result.model_name} (${execMs}ms)`);
      console.log(`     📝 Output preview: "${result.output.slice(0, 120).replace(/\n/g, ' ')}..."`);
      console.log(`     🪙 Tokens: ${result.tokens?.input || 0} in / ${result.tokens?.output || 0} out`);

      await db.agentOutput.create({
        data: {
          subtask_id,
          agent:             `${type}-agent`,
          status:            'done',
          input_context:     depContext.slice(0, 2000) || null,
          output:            result.output,
          input_tokens:      result.tokens?.input  || 0,
          output_tokens:     result.tokens?.output || 0,
          execution_time_ms: execMs,
          retry_count:       attempt,
        },
      });

      await db.subtask.update({
        where: { subtask_id },
        data:  { status: 'done', completed_at: new Date() },
      });

      outputStore.set(task_id, result.output);

      emit('task.completed', {
        task_id, type, task: task.task,
        model:    result.model_name,
        provider: result.provider,
        tokens:   result.tokens,
        execMs,
        attempts: result.attempts,
        preview:  result.output.slice(0, 200),
      });
      return;

    } catch (err) {
      lastError = err.message;
      console.warn(`     ⚠️  Attempt ${attempt + 1} failed: ${err.message.slice(0, 100)}`);
    }
  }

  // All retries exhausted
  console.error(`     ❌ [${task_id}] FAILED after all ${MAX_RETRIES + 1} attempts`);
  console.error(`     Last error: ${lastError}`);

  await db.subtask.update({ where: { subtask_id }, data: { status: 'failed' } });
  await db.agentOutput.create({
    data: {
      subtask_id, agent: `${type}-agent`, status: 'failed',
      output:      `Failed after ${MAX_RETRIES + 1} attempts. Last error: ${lastError}`,
      retry_count: MAX_RETRIES,
    },
  });

  outputStore.set(task_id, `[FAILED] ${lastError}`);
  emit('task.failed', { task_id, type, task: task.task, error: lastError, retriesExhausted: true });
}

/**
 * Build a context string from the outputs of tasks this task depends on.
 */
function buildDependencyContext(task, outputStore) {
  const depIds = task.deps?.map(d => d.depends_on_task_id) || [];
  if (depIds.length === 0) return '';

  const parts = [];
  for (const depId of depIds) {
    const output = outputStore.get(depId);
    if (output) {
      parts.push(`=== Output from ${depId} ===\n${output.slice(0, 1500)}`);
    }
  }
  return parts.join('\n\n');
}

module.exports = { executeWorkflow };
