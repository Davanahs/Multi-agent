"""
Sentinel – Celery worker.

Provides the `run_pipeline` task that invokes the LangGraph pipeline
in the background so the webhook endpoint can return immediately.
"""

import os
from dotenv import load_dotenv
from celery import Celery

load_dotenv()

app = Celery(
    "sentinel",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"),
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@app.task(name="run_pipeline")
def run_pipeline(payload: dict):
    """Execute the full Sentinel agent pipeline for a GitHub event."""

    event_type = payload.get("event_type", "unknown")
    repo       = payload.get("repo", "unknown/unknown")
    run_id     = payload.get("run_id")

    print(f"\n[PIPELINE] Sentinel pipeline started  event={event_type}  repo={repo}  run_id={run_id}")

    from graph import sentinel_graph

    initial_state = {
        "event_type": event_type,
        "repo": repo,
        "run_id": run_id,
        "logs": None,
        "diagnosis": None,
        "fix_strategy": None,
        "patch": None,
        "test_passed": None,
        "pr_url": None,
        "slack_sent": None,
    }

    result = sentinel_graph.invoke(initial_state)

    print(f"\n[DONE] Sentinel pipeline finished  pr_url={result.get('pr_url')}  "
          f"test_passed={result.get('test_passed')}  slack_sent={result.get('slack_sent')}")

    return result