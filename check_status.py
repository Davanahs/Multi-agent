import asyncio
from backend import db

async def main():
    await db.get_pool()
    wf = await db.fetchrow("SELECT workflow_id, status FROM workflows ORDER BY updated_at DESC LIMIT 1")
    print(dict(wf) if wf else "No workflow found")
    
    logs = await db.fetch("SELECT event_type, message FROM logs WHERE workflow_id=$1::uuid ORDER BY timestamp DESC LIMIT 5", wf["workflow_id"])
    for l in logs:
        print(f"Log: {l['event_type']} - {l['message']}")
    
    await db.close_pool()

if __name__ == "__main__":
    asyncio.run(main())
