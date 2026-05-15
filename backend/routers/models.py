"""
Models router — GET/POST /api/models
"""
import os, httpx
from fastapi import APIRouter, Query
from .. import db

router = APIRouter()

# ── Sync helpers (same provider list as Node sync service) ────────────────────
SYNC_SOURCES = {
    "groq": {
        "url":    "https://api.groq.com/openai/v1/models",
        "key_env": "GROQ_API_KEY",
    },
    "nvidia": {
        "url":    "https://integrate.api.nvidia.com/v1/models",
        "key_env": "NVIDIA_API_KEY",
    },
    "openrouter": {
        "url":    "https://openrouter.ai/api/v1/models",
        "key_env": "OPENROUTER_API_KEY",
    },
}

# ─────────────────────────────────────────────────────────────────────────────

@router.get("")
async def list_models(provider: str | None = Query(None)):
    if provider:
        rows = await db.fetch(
            "SELECT model_id, model_name, provider, is_active FROM models "
            "WHERE is_active=true AND provider=$1 ORDER BY model_name", provider
        )
    else:
        rows = await db.fetch(
            "SELECT model_id, model_name, provider, is_active FROM models "
            "WHERE is_active=true ORDER BY provider, model_name"
        )
    return {"success": True, "count": len(rows),
            "data": [dict(r) for r in rows]}


@router.get("/health")
async def models_health():
    total_row = await db.fetchrow(
        "SELECT COUNT(*) FILTER (WHERE is_active) AS active, COUNT(*) AS total FROM models"
    )
    provider_rows = await db.fetch(
        """SELECT provider,
                  COUNT(*) FILTER (WHERE is_active) AS active,
                  COUNT(*) AS total
           FROM models GROUP BY provider ORDER BY provider"""
    )
    return {
        "success": True,
        "total": {"active": int(total_row["active"]), "total": int(total_row["total"])},
        "byProvider": [
            {"provider": r["provider"], "active": int(r["active"]), "total": int(r["total"])}
            for r in provider_rows
        ],
    }


async def _upsert_model(provider: str, model_name: str):
    await db.execute(
        """INSERT INTO models (model_name, provider, is_active)
           VALUES ($1, $2, true)
           ON CONFLICT (model_name, provider) DO UPDATE SET is_active=true""",
        model_name, provider
    )


async def _sync_provider(provider: str) -> dict:
    if provider == "google":
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return {"provider": "google", "status": "no api key"}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}")
            r.raise_for_status()
            data = r.json().get("models", [])
            count = 0
            for m in data:
                name = m.get("name", "").replace("models/", "")
                if name:
                    await _upsert_model("google", name)
                    count += 1
            return {"provider": "google", "count": count, "status": "success"}
        except Exception as e:
            return {"provider": "google", "status": f"error: {str(e)}"}

    cfg = SYNC_SOURCES.get(provider)
    if not cfg:
        return {"provider": provider, "status": "unknown provider"}

    api_key = os.getenv(cfg["key_env"], "")
    if not api_key:
        return {"provider": provider, "status": "no api key"}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(cfg["url"],
                                 headers={"Authorization": f"Bearer {api_key}"})
        r.raise_for_status()
        data = r.json().get("data", [])
        count = 0
        for item in data:
            name = item.get("id") or item.get("model_id") or item.get("name") or ""
            if name:
                await _upsert_model(provider, name)
                count += 1
        return {"provider": provider, "count": count, "status": "success"}
    except Exception as e:
        return {"provider": provider, "status": "error", "error": str(e)[:100]}


@router.post("/sync")
async def sync_models(body: dict = {}, background_tasks = None):
    from fastapi import BackgroundTasks
    provider = body.get("provider") if body else None
    providers = [provider] if provider else ["google", "groq", "nvidia", "openrouter"]

    # Run synchronously for single provider (fast), background for all
    if provider:
        result = await _sync_provider(provider)
        return {"success": True, "data": {"modelsUpdated": result.get("count", 0),
                                          "providers": [result]}}

    # For full sync, kick off in background and return immediately
    import asyncio
    async def _do_full_sync():
        for p in providers:
            await _sync_provider(p)

    asyncio.create_task(_do_full_sync())
    return {"success": True, "data": {"modelsUpdated": 0,
            "message": "Full sync started in background — check /api/models/health for progress"}}
