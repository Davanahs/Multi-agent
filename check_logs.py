import asyncio, asyncpg, os
from dotenv import load_dotenv
load_dotenv('.env')
async def check():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    rows = await conn.fetch("SELECT event_type, payload FROM sse_events WHERE workflow_id='2c1707f2-a451-4216-a5e5-8fc361bbef40'::uuid")
    for r in rows: print(f"[{r['event_type']}] {r['payload']}")
    await conn.close()
asyncio.run(check())
