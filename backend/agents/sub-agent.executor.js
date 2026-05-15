/**
 * Sub-Agent Executor
 *
 * Each task type gets a specialized system prompt.
 * The agent receives:
 *   - The task description
 *   - Outputs from dependency tasks (injected as context)
 *
 * Returns the generated output string.
 */

const llmRouter = require('../services/llm-router.service');

// ─── Task Type → Agent Config ─────────────────────────────────────────────────
const AGENT_CONFIG = {
  research: {
    taskType: 'research',
    system: `You are a research agent. Given a task, produce a thorough, factual research summary.
Include: key findings, relevant technologies, best practices, and concrete recommendations.
Format your output in clear sections with headers.`,
  },
  coding: {
    taskType: 'coding',
    system: `You are an expert software engineer. Given a task, produce complete, working code.
Include: implementation, comments explaining key decisions, and any setup instructions.
Use best practices for the relevant technology stack.`,
  },
  ui: {
    taskType: 'ui',
    system: `You are a senior UI/UX engineer. Given a task, produce complete HTML/CSS/JS code for the interface.
Include: responsive design, accessibility, and modern aesthetics.
Produce working, self-contained code.`,
  },
  testing: {
    taskType: 'coding',
    system: `You are a QA engineer and testing specialist. Given a task, produce comprehensive test cases and test code.
Include: unit tests, edge cases, integration test scenarios, and any test setup required.`,
  },
  deployment: {
    taskType: 'coding',
    system: `You are a DevOps/deployment specialist. Given a task, produce complete deployment configuration.
Include: infrastructure setup, environment variables needed, step-by-step deployment instructions, and monitoring recommendations.`,
  },
  writing: {
    taskType: 'general',
    system: `You are an expert technical writer. Given a task, produce clear, professional written content.
Include: well-structured sections, precise language, and actionable information.`,
  },
  analysis: {
    taskType: 'reasoning',
    system: `You are a systems analyst. Given a task, produce a thorough analysis with insights.
Include: problem breakdown, evaluation of options, trade-offs, and a clear recommendation.`,
  },
  general: {
    taskType: 'general',
    system: `You are a capable AI assistant. Complete the given task thoroughly and professionally.`,
  },
};

/**
 * Execute a single subtask using the appropriate specialized agent.
 *
 * @param {Object} subtask - The subtask record from DB
 * @param {string} dependencyContext - String containing outputs from dependency tasks
 * @returns {Promise<{ output: string, model_name: string, provider: string, tokens: Object }>}
 */
async function executeSubAgent(subtask, dependencyContext = '') {
  const config = AGENT_CONFIG[subtask.type] || AGENT_CONFIG.general;

  const contextSection = dependencyContext
    ? `\n\n--- Context from previous tasks ---\n${dependencyContext}\n--- End context ---\n`
    : '';

  const messages = [
    { role: 'system', content: config.system },
    {
      role: 'user',
      content: `Task: ${subtask.task}${contextSection}\n\nComplete this task fully and professionally.`,
    },
  ];

  const result = await llmRouter.routePrompt({
    messages,
    taskType:  config.taskType,
    maxTokens: 3000,
  });

  return {
    output:     result.content,
    model_name: result.model_name,
    provider:   result.provider,
    tokens:     result.tokens,
    attempts:   result.attempts,
  };
}

module.exports = { executeSubAgent, AGENT_CONFIG };
