"""
Sentinel – FastAPI webhook receiver.
Starts an ngrok tunnel on port 8000 and dispatches incoming GitHub
webhook events to the Celery pipeline.
"""

import os
import threading

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from pyngrok import ngrok as pyngrok
import uvicorn

load_dotenv()

app = FastAPI(title="Sentinel CI/DevOps Agent")


# ── ngrok tunnel ────────────────────────────────────────────────
def _start_ngrok():
    try:
        pyngrok.kill()
    except Exception:
        pass

    try:
        public_url = pyngrok.connect(8000, "http").public_url
        print(f"\n[NGROK] Sentinel ngrok tunnel active -> {public_url}")
        print(f"    Set your GitHub webhook URL to: {public_url}/webhook/github\n")
    except Exception as exc:
        print(f"[WARN] ngrok tunnel failed: {exc}")


threading.Thread(target=_start_ngrok, daemon=True).start()


# ── webhook endpoint ───────────────────────────────────────────
@app.post("/webhook/github")
async def github_webhook(request: Request):
    payload = await request.json()

    event_type    = request.headers.get("X-GitHub-Event", "unknown")
    repo_full_name = payload.get("repository", {}).get("full_name", "unknown/unknown")

    run_id = None
    if event_type == "workflow_run":
        run_id = payload.get("workflow_run", {}).get("id")

    print(f"\n[WEBHOOK] Received  event={event_type}  repo={repo_full_name}  run_id={run_id}")

    from worker import run_pipeline

    # Pass a single dict so Celery serialises it cleanly
    run_pipeline.delay({
    "event_type": event_type,
    "repo": repo_full_name,
    "run_id": run_id,
})

    return {
        "status": "accepted",
        "event_type": event_type,
        "repo": repo_full_name,
        "run_id": run_id,
    }


# ── health check ───────────────────────────────────────────────
@app.get("/")
async def health():
    return {"service": "sentinel", "status": "ok"}


# ── entrypoint ─────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)