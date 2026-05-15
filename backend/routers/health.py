"""
Health router — GET /health and GET /db/tables
"""
import time, os
from fastapi import APIRouter
from .. import db

router = APIRouter()
_start_time = time.time()


@router.get("/health")
async def health():
    try:
        count = await db.fetchval("SELECT COUNT(*) FROM models WHERE is_active=true")
        db_status = "connected"
    except Exception as e:
        count = 0
        db_status = f"error: {e}"

    return {
        "status": "healthy",
        "database": db_status,
        "active_models": int(count or 0),
        "uptime_seconds": round(time.time() - _start_time, 1),
        "system": "FastAPI 2.0",
    }


@router.get("/db/tables")
async def db_tables():
    rows = await db.fetch(
        """SELECT table_name, table_schema
           FROM information_schema.tables
           WHERE table_type='BASE TABLE'
             AND table_schema NOT IN ('pg_catalog','information_schema')
           ORDER BY table_name"""
    )
    return {"tables": [{"table_name": r["table_name"], "schema": r["table_schema"]}
                       for r in rows]}
