import asyncio, sys
sys.path.insert(0, 'd:/bg-hk/Multi-agent')
from dotenv import load_dotenv
load_dotenv('d:/bg-hk/Multi-agent/.env')

async def check():
    from backend import db
    await db.get_pool()
    query = "SELECT s.task_id, ao.output FROM agent_outputs ao JOIN subtasks s ON ao.subtask_id = s.subtask_id WHERE s.workflow_id = '1ac981e1-88ca-4788-baa2-aaa5ac6552c4'"
    rows = await db.fetch(query)
    for r in rows:
        print(r['task_id'], str(r['output'])[:200])
    
    print('---')
    query2 = "SELECT task_id, status FROM subtasks WHERE workflow_id = '1ac981e1-88ca-4788-baa2-aaa5ac6552c4'"
    rows2 = await db.fetch(query2)
    for r in rows2:
        print(r['task_id'], r['status'])
    await db.close()

asyncio.run(check())
