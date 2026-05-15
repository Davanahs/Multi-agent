"""
Database connection pool — asyncpg with auto-reconnect.
Mirrors the Node DB proxy pattern with exponential backoff.
"""
import os, asyncio, asyncpg
from dotenv import load_dotenv

load_dotenv()

_pool: asyncpg.Pool | None = None

BACKOFF = [1.0, 2.0, 4.0]   # seconds between retries

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        await _connect()
    return _pool


async def _connect():
    global _pool
    url = os.getenv("DATABASE_URL", "")
    for attempt, wait in enumerate(BACKOFF, 1):
        try:
            _pool = await asyncpg.create_pool(url, min_size=2, max_size=10, command_timeout=30)
            print(f"[DB] Connected to Neon (attempt {attempt})")
            return
        except Exception as e:
            print(f"[DB] Connection failed (attempt {attempt}): {e}")
            if attempt < len(BACKOFF):
                await asyncio.sleep(wait)
    raise RuntimeError("Could not connect to database after 3 attempts")


async def fetch(query: str, *args):
    pool = await get_pool()
    try:
        return await pool.fetch(query, *args)
    except (asyncpg.PostgresConnectionError, OSError):
        print("[DB] Connection lost — reconnecting...")
        await _connect()
        return await (await get_pool()).fetch(query, *args)


async def fetchrow(query: str, *args):
    pool = await get_pool()
    try:
        return await pool.fetchrow(query, *args)
    except (asyncpg.PostgresConnectionError, OSError):
        await _connect()
        return await (await get_pool()).fetchrow(query, *args)


async def fetchval(query: str, *args):
    pool = await get_pool()
    try:
        return await pool.fetchval(query, *args)
    except (asyncpg.PostgresConnectionError, OSError):
        await _connect()
        return await (await get_pool()).fetchval(query, *args)


async def execute(query: str, *args):
    pool = await get_pool()
    try:
        return await pool.execute(query, *args)
    except (asyncpg.PostgresConnectionError, OSError):
        await _connect()
        return await (await get_pool()).execute(query, *args)


async def close():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
