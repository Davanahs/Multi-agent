/**
 * Dependency Resolver Service
 *
 * Reads the subtasks and their dependencies from the database
 * and builds a DAG (Directed Acyclic Graph) execution plan.
 *
 * Returns execution "waves" — groups of tasks that can run in parallel:
 *
 * Wave 1: [T1, T3]       ← no dependencies, run simultaneously
 * Wave 2: [T2]           ← depends on T1, runs after Wave 1
 * Wave 3: [T4, T5]       ← depends on T2, runs after Wave 2
 */

const db = require('../../database');

/**
 * Load all subtasks + their deps for a workflow, build the execution DAG.
 *
 * @param {string} workflowId
 * @returns {Promise<{ waves: Array<Array>, taskMap: Map }>}
 */
async function buildExecutionPlan(workflowId) {
  // Fetch all subtasks with their dependency records
  const subtasks = await db.subtask.findMany({
    where:   { workflow_id: workflowId },
    include: { deps: true },
    orderBy: { created_at: 'asc' },
  });

  if (subtasks.length === 0) {
    throw new Error(`No subtasks found for workflow ${workflowId}`);
  }

  // Build a map: task_id → subtask record
  const taskMap = new Map(subtasks.map(t => [t.task_id, t]));

  // Build adjacency: task_id → [list of task_ids it depends on]
  const dependsOn = new Map();
  const dependedOnBy = new Map(); // reverse graph

  for (const task of subtasks) {
    const deps = task.deps.map(d => d.depends_on_task_id);
    dependsOn.set(task.task_id, deps);
    if (!dependedOnBy.has(task.task_id)) dependedOnBy.set(task.task_id, []);
    for (const depId of deps) {
      if (!dependedOnBy.has(depId)) dependedOnBy.set(depId, []);
      dependedOnBy.get(depId).push(task.task_id);
    }
  }

  // ── Kahn's Algorithm for topological sort into waves ─────────────────────
  const inDegree = new Map();
  for (const task of subtasks) {
    inDegree.set(task.task_id, (dependsOn.get(task.task_id) || []).length);
  }

  const waves = [];
  let remaining = new Set(subtasks.map(t => t.task_id));

  while (remaining.size > 0) {
    // Tasks with no remaining dependencies = can run now
    const wave = [...remaining].filter(id => inDegree.get(id) === 0);

    if (wave.length === 0) {
      throw new Error(`Circular dependency detected in workflow ${workflowId}`);
    }

    waves.push(wave.map(id => taskMap.get(id)));

    // Remove wave tasks and reduce in-degree of dependents
    for (const id of wave) {
      remaining.delete(id);
      for (const dependentId of (dependedOnBy.get(id) || [])) {
        inDegree.set(dependentId, inDegree.get(dependentId) - 1);
      }
    }
  }

  console.log(`\n[Dependency Resolver] 📊 Execution plan for workflow ${workflowId}:`);
  waves.forEach((wave, i) => {
    const names = wave.map(t => `${t.task_id}[${t.type}]`).join(', ');
    console.log(`   Wave ${i + 1}: ${names} ${wave.length > 1 ? '← PARALLEL' : ''}`);
  });

  return { waves, taskMap };
}

/**
 * Get a simple summary of the execution plan for API responses.
 */
async function getExecutionSummary(workflowId) {
  const { waves } = await buildExecutionPlan(workflowId);
  return {
    totalWaves:  waves.length,
    totalTasks:  waves.reduce((sum, w) => sum + w.length, 0),
    maxParallel: Math.max(...waves.map(w => w.length)),
    waves: waves.map((wave, i) => ({
      wave:     i + 1,
      parallel: wave.length > 1,
      tasks:    wave.map(t => ({ task_id: t.task_id, type: t.type, task: t.task.slice(0, 80) })),
    })),
  };
}

module.exports = { buildExecutionPlan, getExecutionSummary };
