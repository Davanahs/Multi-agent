/**
 * Planner Agent
 *
 * Takes a user prompt, calls an LLM with a structured planning prompt,
 * and returns a validated task execution plan as JSON.
 *
 * Output format:
 * {
 *   "tasks": [
 *     { "id": "T1", "type": "research", "task": "...", "parallel": false, "depends_on": [] },
 *     { "id": "T2", "type": "coding",   "task": "...", "parallel": true,  "depends_on": ["T1"] }
 *   ]
 * }
 */

const llmRouter = require('../services/llm-router.service');
const db        = require('../../database');

const AGENT_TYPES = ['research', 'coding', 'ui', 'testing', 'deployment', 'writing', 'analysis', 'general'];

const SYSTEM_PROMPT = `You are an expert autonomous workflow planner for a multi-agent AI system.

Given a user's goal, your job is to break it into a list of concrete, executable subtasks.

RULES:
1. Each task must have a unique ID like T1, T2, T3...
2. Task type must be one of: ${AGENT_TYPES.join(', ')}
3. "depends_on" lists task IDs that must complete BEFORE this task starts
4. "parallel" = true if this task can run at the same time as others with no dependencies
5. Keep tasks specific and actionable — not vague
6. Use 3 to 8 tasks. Do not over-plan.
7. You MUST respond with ONLY valid JSON. No markdown, no explanation.

Response format (strict JSON):
{
  "tasks": [
    {
      "id": "T1",
      "type": "research",
      "task": "Clear description of what this task does",
      "parallel": false,
      "depends_on": []
    },
    {
      "id": "T2",
      "type": "coding",
      "task": "Clear description of what this task does",
      "parallel": true,
      "depends_on": ["T1"]
    }
  ]
}`;

/**
 * Run the planner agent for a given prompt.
 * Saves the generated tasks to the subtasks table in the DB.
 *
 * @param {string} workflowId - The workflow UUID to attach tasks to
 * @param {string} userPrompt - The user's high-level goal
 * @returns {Promise<Array>} - The created subtask records
 */
async function runPlanner(workflowId, userPrompt) {
  console.log(`\n[Planner] 🧠 Planning workflow: "${userPrompt.slice(0, 60)}..."`);

  // ── Step 1: Call LLM to generate task plan ──────────────────────────────
  const result = await llmRouter.routePrompt({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `User Goal: ${userPrompt}` },
    ],
    taskType:   'planning',
    maxTokens:  2048,
  });

  // ── Step 2: Parse JSON response (retry up to 2x if bad JSON) ───────────────
  let plan;
  let lastRawResponse = result.content;
  for (let parseAttempt = 0; parseAttempt <= 2; parseAttempt++) {
    try {
      const cleaned = (parseAttempt === 0 ? result.content : lastRawResponse)
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();
      plan = JSON.parse(cleaned);
      break; // success
    } catch (parseErr) {
      if (parseAttempt < 2) {
        console.warn(`[Planner] ⚠️  Invalid JSON on attempt ${parseAttempt + 1}, retrying with a different model...`);
        const retryResult = await llmRouter.routePrompt({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: `User Goal: ${userPrompt}` },
            { role: 'assistant', content: lastRawResponse },
            { role: 'user', content: 'That response was not valid JSON. Please respond with ONLY the JSON object, no markdown, no explanation.' },
          ],
          taskType:  'planning',
          maxTokens: 2048,
        });
        lastRawResponse = retryResult.content;
      } else {
        throw new Error(
          `Planner returned invalid JSON after 3 attempts. Last model: ${result.provider}/${result.model_name}. ` +
          `Raw response (first 300 chars): ${lastRawResponse.slice(0, 300)}`
        );
      }
    }
  }

  if (!plan.tasks || !Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    throw new Error('Planner returned empty task list');
  }

  console.log(`[Planner] ✅ Generated ${plan.tasks.length} tasks via ${result.provider}/${result.model_name}`);
  plan.tasks.forEach(t => console.log(`   ${t.id} [${t.type}] ${t.task.slice(0, 60)}`));

  // ── Step 3: Save subtasks to DB ──────────────────────────────────────────
  const createdTasks = [];

  for (const task of plan.tasks) {
    const subtask = await db.subtask.create({
      data: {
        workflow_id:    workflowId,
        task_id:        task.id,
        type:           task.type,
        task:           task.task,
        parallel:       task.parallel ?? false,
        status:         'pending',
        assigned_agent: `${task.type}-agent`,
      },
    });

    // Save dependencies
    if (task.depends_on && task.depends_on.length > 0) {
      for (const depId of task.depends_on) {
        await db.subtaskDep.create({
          data: {
            subtask_id:         subtask.subtask_id,
            depends_on_task_id: depId,
          },
        });
      }
    }

    createdTasks.push({ ...subtask, depends_on: task.depends_on || [] });
  }

  // ── Step 4: Update workflow status ───────────────────────────────────────
  await db.workflow.update({
    where: { workflow_id: workflowId },
    data:  { status: 'planned' },
  });

  return createdTasks;
}

module.exports = { runPlanner };
