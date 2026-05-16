import asyncio, sys, os
os.chdir('d:/bg-hk/Multi-agent')
sys.path.insert(0, 'd:/bg-hk/Multi-agent')
from dotenv import load_dotenv
load_dotenv('d:/bg-hk/Multi-agent/.env')

async def test():
    from backend import db
    from backend.services_py import executor
    await db.get_pool()
    
    # Fake tasks for 'coding' and 'analysis'
    task2 = {
        'subtask_id': '00000000-0000-0000-0000-000000000002',
        'task_id': 'T2',
        'type': 'coding',
        'task': 'Write the python code for sum',
        'parallel': False,
        'depends_on': []
    }
    try:
        print('Running T2 (coding)')
        result = await executor._run_single_task(task2, '', sse_emitter=None)
        print('SUCCESS T2:', str(result.get('output',''))[:100])
    except Exception as e:
        print('ERROR T2:', e)

    await db.close()

asyncio.run(test())
