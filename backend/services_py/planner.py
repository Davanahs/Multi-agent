"""
Planner Agent — calls the LLM to generate a dynamic DAG of tasks for a workflow.
Saves subtasks + dependency edges to the DB.
"""
import json, re
from .. import db
from . import llm_router, logger as log

AGENT_TYPES = ["research", "coding", "ui", "testing", "deployment",
               "writing", "analysis", "general"]

SYSTEM_PROMPT = f"""You are an expert autonomous workflow planner for a multi-agent AI system.

Given a user's goal, break it into concrete, executable subtasks.

RULES:
1. Each task must have a unique ID like T1, T2, T3...
2. Task type must be one of: {', '.join(AGENT_TYPES)}
3. "depends_on" lists task IDs that must finish BEFORE this task starts
4. "parallel" = true if this task can run at the same time as others with the same wave
5. Keep tasks specific and actionable — not vague
6. Use 3 to 20 tasks depending on complexity. Do not over-plan or under-plan.
7. You MUST respond with ONLY valid JSON. No markdown, no explanation.

Response format (strict JSON):
{{
  "tasks": [
    {{
      "id": "T1",
      "type": "research",
      "task": "Clear description of what this task does",
      "parallel": false,
      "depends_on": []
    }},
    {{
      "id": "T2",
      "type": "coding",
      "task": "Clear description of what this task does",
      "parallel": true,
      "depends_on": ["T1"]
    }}
  ]
}}"""


def _clean_json(raw: str) -> str:
    cleaned = re.sub(r"```json\s*", "", raw, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    return cleaned.strip()


async def run_planner(workflow_id: str, user_prompt: str) -> list[dict]:
    log.section("Planner Agent")
    log.info(f'Planning: "{user_prompt[:80]}..."')

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"User Goal: {user_prompt}"},
    ]

    result = await llm_router.route_prompt(messages, task_type="planning", max_tokens=2048)

    # ── Parse JSON with retry ─────────────────────────────────────────────────
    plan = None
    last_raw = result["content"]

    for attempt in range(3):
        try:
            plan = json.loads(_clean_json(last_raw))
            break
        except json.JSONDecodeError:
            if attempt < 2:
                log.info(f"Invalid JSON on attempt {attempt+1}, retrying...")
                retry = await llm_router.route_prompt([
                    {"role": "system",    "content": SYSTEM_PROMPT},
                    {"role": "user",      "content": f"User Goal: {user_prompt}"},
                    {"role": "assistant", "content": last_raw},
                    {"role": "user",      "content":
                     "That was not valid JSON. Reply with ONLY the JSON object, no markdown."},
                ], task_type="planning", max_tokens=2048)
                last_raw = retry["content"]
            else:
                raise RuntimeError(
                    f"Planner returned invalid JSON after 3 attempts. "
                    f"Raw (first 300): {last_raw[:300]}"
                )

    tasks = plan.get("tasks", [])
    if not tasks:
        raise RuntimeError("Planner returned empty task list")

    model_label = f"{result['provider']}/{result['model_name']}"
    log.workflow_planned(len(tasks), model_label)
    for t in tasks:
        deps = t.get("depends_on", [])
        dep_str = f"  <- {deps}" if deps else "  (no deps)"
        log.info(f"  {t['id']} [{t['type']}] {t['task'][:70]}{dep_str}")

    # ── Save subtasks to DB ───────────────────────────────────────────────────
    created = []
    for task in tasks:
        subtask_id = await db.fetchval(
            """INSERT INTO subtasks
               (workflow_id, task_id, type, task, parallel, status, assigned_agent)
               VALUES ($1, $2, $3, $4, $5, 'pending', $6)
               RETURNING subtask_id""",
            workflow_id, task["id"], task["type"], task["task"],
            task.get("parallel", False), f"{task['type']}-agent"
        )
        for dep_id in task.get("depends_on", []):
            await db.execute(
                "INSERT INTO subtask_deps (subtask_id, depends_on_task_id) VALUES ($1, $2)",
                subtask_id, dep_id
            )
        created.append({
            "subtask_id": str(subtask_id),
            "task_id":    task["id"],
            "type":       task["type"],
            "task":       task["task"],
            "parallel":   task.get("parallel", False),
            "depends_on": task.get("depends_on", []),
            "status":     "pending",
        })

    # ── Mark workflow as planned ──────────────────────────────────────────────
    await db.execute(
        "UPDATE workflows SET status='planned' WHERE workflow_id=$1", workflow_id
    )
    return created
