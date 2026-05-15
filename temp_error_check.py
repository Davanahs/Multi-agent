import asyncio, json
from backend import db

async def test():
    await db.get_pool()
    rows = await db.fetch("SELECT payload FROM sse_events WHERE workflow_id='ed3d9667-8e3d-4baf-937f-76dd2709af1b' AND event_type='workflow.failed'")
    if rows:
        print("Error:", json.loads(rows[0]["payload"]).get("error"))
    else:
        print("No error found in DB")
    await db.close()

asyncio.run(test())
