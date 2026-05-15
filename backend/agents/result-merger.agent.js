/**
 * Result Merger Agent
 *
 * After all subtasks complete, collects all agent_outputs for a workflow,
 * calls an LLM to merge them into one coherent final result,
 * and saves it back to workflows.result.
 */

const llmRouter = require('../services/llm-router.service');
const db        = require('../../database');

/**
 * Merge all agent outputs into a single final result.
 *
 * @param {string}   workflowId
 * @param {string}   originalPrompt
 * @param {Map}      outputStore  - Map of task_id → output string
 * @param {Function} emit
 * @returns {Promise<string>} final merged result
 */
async function mergeResults(workflowId, originalPrompt, outputStore, emit = () => {}) {
  console.log(`\n[Merger] 🔀 Merging ${outputStore.size} agent outputs...`);

  // Collect all subtask outputs in order
  const subtasks = await db.subtask.findMany({
    where:   { workflow_id: workflowId },
    orderBy: { created_at: 'asc' },
    include: { agent_outputs: { orderBy: { created_at: 'desc' }, take: 1 } },
  });

  const outputSections = subtasks.map(task => {
    const output = outputStore.get(task.task_id)
      || task.agent_outputs[0]?.output
      || '[No output]';
    return `## ${task.task_id} — ${task.type.toUpperCase()} Agent\n**Task:** ${task.task}\n\n**Output:**\n${output}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are a result merger. You receive outputs from multiple specialized AI agents 
that worked on different parts of a project. Your job is to synthesize them into one 
clear, coherent, well-structured final result document.

Structure your response as:
1. Executive Summary (2-3 sentences)
2. Complete merged content organized logically
3. Next Steps / How to proceed

Do not just list the outputs — integrate them into a unified, useful document.`;

  const result = await llmRouter.routePrompt({
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Original User Goal: "${originalPrompt}"\n\n${outputSections}\n\nSynthesize the above into one comprehensive final result.`,
      },
    ],
    taskType:  'general',
    maxTokens: 3000,
  });

  // Save final result to workflow
  await db.workflow.update({
    where: { workflow_id: workflowId },
    data:  { status: 'done', result: { content: result.content, model: result.model_name, provider: result.provider } },
  });

  console.log(`[Merger] ✅ Final result saved via ${result.provider}/${result.model_name}`);
  emit('workflow.completed', {
    workflowId,
    model:    result.model_name,
    provider: result.provider,
    preview:  result.content.slice(0, 200),
  });

  return result.content;
}

module.exports = { mergeResults };
