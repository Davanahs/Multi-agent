"""
FastAPI Multi-Agent Workflow OS — Entry Point
Run with: uvicorn backend.main:app --reload --port 8000
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from .routers import health, models, llm, workflows
from . import db as database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — connect DB pool and warm it up
    await database.get_pool()
    
    # Check if required tables exist
    try:
        tables = await database.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        table_names = [t["table_name"] for t in tables]
        required_tables = ["workflows", "models", "subtasks", "subtask_deps", "agent_outputs", "memory", "logs", "sse_events", "webhooks"]
        missing = [t for t in required_tables if t not in table_names]
        if missing:
            print(f"\n[WARNING] Missing required database tables: {missing}")
            print("[INFO] Automatically running 'npx prisma db push' to synchronize schema...")
            import subprocess
            try:
                proc = subprocess.run(
                    "npx prisma db push",
                    shell=True,
                    check=True,
                    capture_output=True,
                    text=True
                )
                print("[INFO] Database schema synchronized successfully.")
            except subprocess.CalledProcessError as e:
                print(f"[ERROR] Auto-sync failed with exit code {e.returncode}")
                print(f"[ERROR] stderr: {e.stderr}")
                import sys
                sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Failed to verify database schema: {e}")
        import sys
        sys.exit(1)

    for attempt in range(3):
        try:
            count = await database.fetchval("SELECT COUNT(*) FROM models WHERE is_active=true")
            if count is not None:
                break
        except Exception:
            pass
        import asyncio
        await asyncio.sleep(2)

    count = await database.fetchval("SELECT COUNT(*) FROM models WHERE is_active=true") or 0
    print(f"\n[FastAPI] Server ready! ({count} active models)")
    print("[FastAPI] Swagger UI  -> /docs")
    print("[FastAPI] Health      -> /health\n")
    yield
    # Shutdown — close pool
    await database.close()


app = FastAPI(
    title="Multi-Agent Workflow OS",
    description=(
        "Autonomous multi-agent AI pipeline.\n\n"
        "- **Dynamic task planning** via LLM (3-20 tasks)\n"
        "- **Parallel wave execution** — all tasks in a wave run concurrently\n"
        "- **Cascading fallback** across 6 LLM providers\n"
        "- **Best model selection** per task type from live DB\n"
        "- **SSE streaming** for real-time progress\n"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router,     tags=["health"])
app.include_router(models.router,     prefix="/api/models",    tags=["models"])
app.include_router(llm.router,        prefix="/api/llm",       tags=["llm"])
app.include_router(workflows.router,  prefix="/api/workflows", tags=["workflows"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
