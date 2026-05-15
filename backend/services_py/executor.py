"""
Execution Engine — parallel wave-based DAG executor.
Dynamic parallelism: ALL tasks in the same wave run concurrently via asyncio.gather().
No hardcoded parallelism limit — the DAG determines concurrency.
"""
import asyncio, time, json
from .. import db
from . import llm_router, logger as log

# ─── Agent system prompts per task type ──────────────────────────────────────
AGENT_PROMPTS = {
    "research": (
        "research",
        "You are a research agent. Given a task, produce a thorough, factual research summary. "
        "Include: key findings, relevant technologies, best practices, and concrete recommendations. "
        "Format your output in clear sections with headers."
    ),
    "coding": (
        "coding",
        "You are an expert software engineer. Given a task, produce complete, working code. "
        "Include: implementation, comments explaining key decisions, and setup instructions. "
        "Use best practices for the relevant technology stack."
    ),
    "ui": (
        "ui",
        "You are a senior UI/UX engineer. Given a task, produce complete HTML/CSS/JS code. "
        "Include: responsive design, accessibility, and modern aesthetics."
    ),
    "testing": (
        "coding",
        "You are a QA engineer. Given a task, produce comprehensive test cases and test code. "
        "Include: unit tests, edge cases, integration scenarios, and test setup."
    ),
    "deployment": (
        "coding",
        "You are a DevOps specialist. Given a task, produce complete deployment configuration. "
        "Include: infrastructure setup, env variables, step-by-step instructions, and monitoring."
    ),
    "writing": (
        "general",
        "You are an expert technical writer. Given a task, produce clear, professional content. "
        "Include: well-structured sections, precise language, and actionable information."
    ),
    "analysis": (
        "reasoning",
        "You are a systems analyst. Given a task, produce a thorough analysis. "
        "Include: problem breakdown, options evaluation, trade-offs, and a clear recommendation."
    ),
    "general": (
        "general",
        "You are a capable AI assistant. Complete the given task thoroughly and professionally."
    ),
}

MAX_RETRIES = 2


# ─── Build execution waves via Kahn's topological sort ───────────────────────
def build_waves(tasks: list[dict]) -> list[list[dict]]:
    """
    Kahn's algorithm — returns a list of waves.
    Each wave is a list of tasks that can run fully in parallel.
    """
    task_map  = {t["task_id"]: t for t in tasks}
    in_degree = {t["task_id"]: 0 for t in tasks}
    dep_map   = {t["task_id"]: t.get("depends_on", []) for t in tasks}

    for task_id, deps in dep_map.items():
        in_degree[task_id] += len(deps)

    waves = []
    remaining = set(task_map.keys())

    while remaining:
        # All tasks whose dependencies are already fulfilled
        wave_ids = [tid for tid in remaining if in_degree[tid] == 0]
        if not wave_ids:
            raise RuntimeError("Circular dependency detected in task DAG")
        waves.append([task_map[tid] for tid in wave_ids])
        for tid in wave_ids:
            remaining.remove(tid)
            for other_id in remaining:
                if tid in dep_map.get(other_id, []):
                    in_degree[other_id] -= 1

    return waves


# ─── Execute a single subtask ─────────────────────────────────────────────────
async def _run_single_task(task: dict, dep_context: str,
                           sse_emitter=None) -> dict:
    task_id   = task["task_id"]
    task_type = task.get("type", "general")
    llm_type, system_prompt = AGENT_PROMPTS.get(task_type, AGENT_PROMPTS["general"])

    context_block = (
        f"\n\n--- Context from previous tasks ---\n{dep_context}\n--- End context ---\n"
        if dep_context else ""
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content":
            f"Task: {task['task']}{context_block}\n\nComplete this task fully and professionally."},
    ]

    # ── Mark task as running ──────────────────────────────────────────────────
    await db.execute(
        "UPDATE subtasks SET status='running' WHERE subtask_id=$1::uuid",
        task["subtask_id"]
    )

    excluded = []
    for attempt in range(MAX_RETRIES + 1):
        try:
            t0 = time.monotonic()
            result = await llm_router.route_prompt(
                messages, task_type=llm_type, max_tokens=3000,
                exclude_models=excluded
            )
            ms = int((time.monotonic() - t0) * 1000)

            log.task_done(task_id, result["provider"], result["model_name"],
                          result["tokens"], ms)

            # ── Save agent output ─────────────────────────────────────────────
            model_row = await db.fetchrow(
                "SELECT model_id FROM models WHERE provider=$1 AND model_name=$2 LIMIT 1",
                result["provider"], result["model_name"]
            )
            model_id = str(model_row["model_id"]) if model_row else None

            await db.execute(
                """INSERT INTO agent_outputs
                   (subtask_id, model_id, agent, status, output,
                    input_tokens, output_tokens, execution_time_ms, retry_count)
                   VALUES ($1::uuid, $2::uuid, $3, 'done', $4, $5, $6, $7, $8)""",
                task["subtask_id"], model_id,
                f"{task_type}-agent", result["content"],
                result["tokens"].get("input", 0),
                result["tokens"].get("output", 0),
                ms, attempt
            )
            await db.execute(
                "UPDATE subtasks SET status='done', completed_at=NOW() "
                "WHERE subtask_id=$1::uuid",
                task["subtask_id"]
            )

            if sse_emitter:
                await sse_emitter("task.completed", {
                    "taskId": task_id,
                    "provider": result["provider"],
                    "model": result["model_name"],
                    "tokens": result["tokens"],
                    "executionMs": ms,
                })

            return {"task_id": task_id, "output": result["content"],
                    "model": f"{result['provider']}/{result['model_name']}"}

        except Exception as e:
            err = str(e)[:150]
            excluded.append(result["model_name"] if "result" in dir() else "")
            if attempt < MAX_RETRIES:
                log.task_retry(task_id, attempt + 1,
                               result.get("model_name", "?") if "result" in dir() else "?", err)
                if sse_emitter:
                    await sse_emitter("task.retry", {"taskId": task_id, "attempt": attempt + 1, "error": err})
            else:
                log.task_failed(task_id, err)
                await db.execute(
                    "UPDATE subtasks SET status='failed' WHERE subtask_id=$1::uuid",
                    task["subtask_id"]
                )
                if sse_emitter:
                    await sse_emitter("task.failed", {"taskId": task_id, "error": err})
                return {"task_id": task_id, "output": f"[FAILED] {err}", "model": "none"}


# ─── Execute full workflow (all waves) ────────────────────────────────────────
async def execute_workflow(workflow_id: str, sse_emitter=None):
    log.workflow_start(workflow_id, "")

    # Load all subtasks + deps
    rows = await db.fetch(
        """SELECT s.subtask_id, s.task_id, s.type, s.task, s.parallel,
                  COALESCE(array_agg(d.depends_on_task_id) FILTER (WHERE d.depends_on_task_id IS NOT NULL), '{}') AS depends_on
           FROM subtasks s
           LEFT JOIN subtask_deps d ON d.subtask_id = s.subtask_id
           WHERE s.workflow_id=$1::uuid
           GROUP BY s.subtask_id, s.task_id, s.type, s.task, s.parallel
           ORDER BY s.task_id""",
        workflow_id
    )
    tasks = [dict(r) for r in rows]
    for t in tasks:
        t["depends_on"] = list(t["depends_on"])

    waves = build_waves(tasks)
    total_waves = len(waves)

    await db.execute(
        "UPDATE workflows SET status='running' WHERE workflow_id=$1::uuid", workflow_id
    )
    if sse_emitter:
        await sse_emitter("workflow.started", {"workflowId": workflow_id, "totalWaves": total_waves})

    # Store outputs for context injection
    outputs: dict[str, str] = {}

    for wave_num, wave_tasks in enumerate(waves, 1):
        wave_ids = [t["task_id"] for t in wave_tasks]
        log.wave_start(wave_num, total_waves, wave_ids)

        if sse_emitter:
            await sse_emitter("wave.started", {"wave": wave_num, "taskIds": wave_ids})

        # ── Log which model will be used for each task ─────────────────────
        for t in wave_tasks:
            llm_type = AGENT_PROMPTS.get(t["type"], AGENT_PROMPTS["general"])[0]
            model = await llm_router.get_best_model_for_provider(
                llm_router.TASK_PRIORITY.get(llm_type, ["groq"])[0]
            )
            model_label = f"{model['provider']}/{model['model_name']}" if model else "auto"
            log.task_start(t["task_id"], t["type"], 
                          model["provider"] if model else "auto",
                          model["model_name"] if model else "best-available")

        # ── Build context from dependencies ────────────────────────────────
        async def _exec(task):
            dep_parts = []
            for dep_id in task["depends_on"]:
                if dep_id in outputs:
                    dep_parts.append(f"[{dep_id}] output:\n{outputs[dep_id][:1500]}")
            dep_ctx = "\n\n".join(dep_parts)
            result = await _run_single_task(task, dep_ctx, sse_emitter)
            outputs[task["task_id"]] = result.get("output", "")
            return result

        # ── All tasks in the wave run in parallel (no artificial cap) ──────
        wave_results = await asyncio.gather(*[_exec(t) for t in wave_tasks])
        log.wave_done(wave_num)

    # ── Merge results ──────────────────────────────────────────────────────
    await db.execute(
        "UPDATE workflows SET status='merging' WHERE workflow_id=$1::uuid", workflow_id
    )
    if sse_emitter:
        await sse_emitter("workflow.merging", {"workflowId": workflow_id})

    from .merger import merge_results
    merged = await merge_results(workflow_id, outputs)

    result_json = json.dumps({"merged": merged, "task_outputs": outputs})
    await db.execute(
        "UPDATE workflows SET status='done', result=$1::jsonb WHERE workflow_id=$2::uuid",
        result_json, workflow_id
    )
    if sse_emitter:
        await sse_emitter("workflow.completed", {"workflowId": workflow_id})

    log.workflow_done(workflow_id)
    
    # Fire off webhooks in the background so we don't block the API response
    from .webhooks import dispatch_webhooks
    asyncio.create_task(dispatch_webhooks(workflow_id, merged, outputs))
    
    return merged
