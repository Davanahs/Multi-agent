import httpx, json, asyncio, sys
sys.path.insert(0, 'd:/bg-hk/Multi-agent')
from dotenv import load_dotenv
load_dotenv('d:/bg-hk/Multi-agent/.env')

wid = 'fe642cae-5702-4cc1-adc3-2ffa70d5a7c9'
r = httpx.get(f'http://localhost:8080/api/workflows/{wid}', timeout=10)
d = r.json().get('data', {})
print('status:', d.get('status'))
print('result:', json.dumps(d.get('result'), indent=2, default=str))
for st in d.get('subtasks', []):
    tid = st['task_id']
    ttype = st['type']
    tstatus = st['status']
    print(f'  {tid} [{ttype}] => {tstatus}')
