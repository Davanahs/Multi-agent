"""
Workflows router — full CRUD + execute + stream.
POST   /api/workflows                   — create workflow, trigger planner
GET    /api/workflows                   — list all workflows
GET    /api/workflows/{id}              — get workflow + subtasks
GET    /api/workflows/{id}/plan         — DAG wave summary
POST   /api/workflows/{id}/execute      — trigger execution engine
GET    /api/workflows/{id}/result       — final merged result
GET    /api/workflows/{id}/stream       — SSE event stream
"""
import asyncio, json, uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from .. import db
from ..services_py import planner, executor

router = APIRouter()

# Per-workflow SSE queues (in-memory; fine for single-process)
_sse_queues: dict[str, asyncio.Queue] = {}


def _get_queue(workflow_id: str) -> asyncio.Queue:
    if workflow_id not in _sse_queues:
        _sse_queues[workflow_id] = asyncio.Queue()
    return _sse_queues[workflow_id]


async def _emit(workflow_id: str, event_type: str, payload: dict):
    """Save SSE event to DB and push to in-memory queue."""
    await db.execute(
        "INSERT INTO sse_events (workflow_id, event_type, payload) "
        "VALUES ($1::uuid, $2, $3::jsonb)",
        workflow_id, event_type, json.dumps(payload)
    )
    q = _get_queue(workflow_id)
    await q.put({"type": event_type, "payload": payload})


# ─── POST /api/workflows ──────────────────────────────────────────────────────
class WebhookItem(BaseModel):
    event_type: str = "workflow.completed"
    webhook_url: str
    payload: dict = {}

class WorkflowCreate(BaseModel):
    prompt: str
    webhooks: list[WebhookItem] = []


@router.post("", status_code=202)
async def create_workflow(body: WorkflowCreate):
    wid = await db.fetchval(
        "INSERT INTO workflows (prompt, status, updated_at) VALUES ($1, 'planning', NOW()) "
        "RETURNING workflow_id",
        body.prompt
    )
    workflow_id = str(wid)
    
    # Auto-attach latest webhooks so user doesn't have to specify them every time
    await db.execute(
        """
        INSERT INTO webhooks (workflow_id, event_type, webhook_url, payload, status)
        SELECT $1::uuid, event_type, webhook_url, payload, status
        FROM (
            SELECT DISTINCT ON (webhook_url) event_type, webhook_url, payload, status
            FROM webhooks
            ORDER BY webhook_url, created_at DESC
        ) sub
        """,
        workflow_id
    )
    
    # Auto-register frontend webhooks
    for wh in body.webhooks:
        await db.execute(
            "INSERT INTO webhooks (workflow_id, event_type, webhook_url, status, payload) "
            "VALUES ($1::uuid, $2, $3, 'active', $4::jsonb)",
            workflow_id, wh.event_type, wh.webhook_url, json.dumps(wh.payload)
        )

    # Kick off planner in background
    async def _plan():
        try:
            await planner.run_planner(workflow_id, body.prompt)
            # Automatically start execution without waiting for user intervention
            async def _emitter(event_type, payload):
                await _emit(workflow_id, event_type, payload)
            await executor.execute_workflow(workflow_id, _emitter)
        except Exception as e:
            import traceback
            traceback.print_exc()
            await db.execute(
                "UPDATE workflows SET status='failed', updated_at=NOW() WHERE workflow_id=$1::uuid",
                workflow_id
            )
            await _emit(workflow_id, "workflow.failed", {"error": str(e)})
        finally:
            # Force Omium to flush traces to the internet immediately!
            # (Bypasses the SDK's 5-second delay so traces aren't lost if the server shuts down)
            try:
                import omium.integrations.tracer
                omium.integrations.tracer.flush_all_tracers()
                from backend.services_py import logger
                logger.omium_success("Successfully synced execution traces to Omium Dashboard")
            except Exception:
                pass

    asyncio.create_task(_plan())

    return {"success": True, "workflow_id": workflow_id, "status": "planning"}


# ─── GET /api/workflows ───────────────────────────────────────────────────────
@router.get("")
async def list_workflows():
    rows = await db.fetch(
        "SELECT workflow_id, prompt, status, created_at, updated_at "
        "FROM workflows ORDER BY created_at DESC LIMIT 20"
    )
    return {"success": True, "count": len(rows),
            "data": [dict(r) for r in rows]}


# ─── GET /api/workflows/{id} ─────────────────────────────────────────────────
@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    wf = await db.fetchrow(
        "SELECT workflow_id, prompt, status, result, created_at, updated_at "
        "FROM workflows WHERE workflow_id=$1::uuid",
        workflow_id
    )
    if not wf:
        raise HTTPException(404, "Workflow not found")

    subtasks = await db.fetch(
        """SELECT s.subtask_id, s.task_id, s.type, s.task, s.status, s.parallel,
                  COALESCE(array_agg(d.depends_on_task_id)
                           FILTER (WHERE d.depends_on_task_id IS NOT NULL), '{}') AS depends_on
           FROM subtasks s
           LEFT JOIN subtask_deps d ON d.subtask_id=s.subtask_id
           WHERE s.workflow_id=$1::uuid
           GROUP BY s.subtask_id, s.task_id, s.type, s.task, s.status, s.parallel
           ORDER BY s.task_id""",
        workflow_id
    )

    tasks_out = []
    for r in subtasks:
        d = dict(r)
        d["depends_on"] = list(d["depends_on"])
        tasks_out.append(d)

    wf_dict = dict(wf)
    wf_dict["subtasks"] = tasks_out
    return {"success": True, "data": wf_dict}


# ─── GET /api/workflows/{id}/plan ────────────────────────────────────────────
@router.get("/{workflow_id}/plan")
async def get_plan(workflow_id: str):
    rows = await db.fetch(
        """SELECT s.task_id, s.type, s.task,
                  COALESCE(array_agg(d.depends_on_task_id)
                           FILTER (WHERE d.depends_on_task_id IS NOT NULL), '{}') AS depends_on
           FROM subtasks s
           LEFT JOIN subtask_deps d ON d.subtask_id=s.subtask_id
           WHERE s.workflow_id=$1::uuid
           GROUP BY s.task_id, s.type, s.task
           ORDER BY s.task_id""",
        workflow_id
    )
    tasks = [dict(r) for r in rows]
    for t in tasks:
        t["depends_on"] = list(t["depends_on"])

    # Build waves
    try:
        waves = executor.build_waves(tasks)
    except RuntimeError as e:
        raise HTTPException(400, str(e))

    return {
        "success": True,
        "plan": {
            "totalTasks": len(tasks),
            "totalWaves": len(waves),
            "maxParallel": max((len(w) for w in waves), default=0),
            "waves": [{"wave": i + 1, "tasks": [t["task_id"] for t in w]}
                      for i, w in enumerate(waves)]
        }
    }


# ─── POST /api/workflows/{id}/execute ────────────────────────────────────────
@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str):
    wf = await db.fetchrow(
        "SELECT status FROM workflows WHERE workflow_id=$1::uuid", workflow_id
    )
    if not wf:
        raise HTTPException(404, "Workflow not found")
    if wf["status"] not in ("planned", "failed"):
        raise HTTPException(400, f"Workflow status is '{wf['status']}'; must be 'planned' to execute")

    async def _run():
        async def _emitter(event_type, payload):
            await _emit(workflow_id, event_type, payload)

        try:
            await executor.execute_workflow(workflow_id, sse_emitter=_emitter)
        except Exception as e:
            await db.execute(
                "UPDATE workflows SET status='failed' WHERE workflow_id=$1::uuid", workflow_id
            )
            await _emit(workflow_id, "workflow.failed", {"error": str(e)})

    asyncio.create_task(_run())
    return {"success": True, "message": "Execution started", "workflow_id": workflow_id}


# ─── GET /api/workflows/{id}/result ──────────────────────────────────────────
@router.get("/{workflow_id}/result")
async def get_result(workflow_id: str):
    wf = await db.fetchrow(
        "SELECT status, result FROM workflows WHERE workflow_id=$1::uuid", workflow_id
    )
    if not wf:
        raise HTTPException(404, "Workflow not found")

    result_data = wf["result"]
    merged = ""
    if result_data:
        if isinstance(result_data, str):
            parsed = json.loads(result_data)
        else:
            parsed = result_data
        merged = parsed.get("merged", "")

    return {
        "success": True,
        "status":  wf["status"],
        "result":  merged,
        "task_outputs": parsed.get("task_outputs", {}) if result_data else {}
    }


# ─── GET /api/workflows/{id}/stream  (SSE) ───────────────────────────────────
@router.get("/{workflow_id}/stream")
async def stream_events(workflow_id: str):
    q = _get_queue(workflow_id)

    async def _generator():
        heartbeat = 0
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=20.0)
                data = json.dumps(event["payload"])
                yield f"event: {event['type']}\ndata: {data}\n\n"
                if event["type"] in ("workflow.completed", "workflow.failed"):
                    break
            except asyncio.TimeoutError:
                heartbeat += 1
                yield f": heartbeat {heartbeat}\n\n"

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

# ─── POST /api/workflows/{id}/webhooks ───────────────────────────────────────
class WebhookCreate(BaseModel):
    event_type: str = "workflow.completed"
    webhook_url: str
    payload: dict = {}

@router.post("/{workflow_id}/webhooks")
async def register_webhook(workflow_id: str, body: WebhookCreate):
    wf = await db.fetchrow("SELECT workflow_id FROM workflows WHERE workflow_id=$1::uuid", workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
        
    await db.execute(
        "INSERT INTO webhooks (workflow_id, event_type, webhook_url, status, payload) "
        "VALUES ($1::uuid, $2, $3, 'active', $4::jsonb)",
        workflow_id, body.event_type, body.webhook_url, json.dumps(body.payload)
    )
    return {"success": True, "message": "Webhook registered successfully"}
