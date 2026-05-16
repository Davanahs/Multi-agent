import asyncio
import json
import uuid
from backend import db
from backend.services_py.webhooks import dispatch_webhooks
import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_URL = "https://discord.com/api/webhooks/1504935126692266064/rtghnA-EmspUAKugMCwfvSy8m41Idn70Env6T5e5eRFytL8WxbLQrYJmbt3ZT1Am7HLz"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_URL = "https://api.github.com/repos/Davanahs/Multi-agent/dispatches"

async def main():
    # 1. Connect to the database
    await db.get_pool()
    
    # 2. Create a dummy workflow ID
    dummy_workflow_id = str(uuid.uuid4())
    print(f"[*] Created Dummy Workflow ID: {dummy_workflow_id}")
    
    await db.execute(
        "INSERT INTO workflows (workflow_id, prompt, status, updated_at) VALUES ($1::uuid, 'Test Webhook Flow', 'done', NOW())",
        dummy_workflow_id
    )
    
    # 3. Register the Discord Webhook in the DB
    await db.execute(
        "INSERT INTO webhooks (workflow_id, event_type, webhook_url, status) "
        "VALUES ($1::uuid, 'workflow.completed', $2, 'active')",
        dummy_workflow_id, DISCORD_URL
    )
    print(f"[*] Registered Discord Webhook for workflow {dummy_workflow_id}")

    # 4. Register the GitHub Webhook in the DB (with Token Payload)
    github_payload = {
        "github_token": GITHUB_TOKEN,
        "event_type": "project_generated"
    }
    await db.execute(
        "INSERT INTO webhooks (workflow_id, event_type, webhook_url, status, payload) "
        "VALUES ($1::uuid, 'workflow.completed', $2, 'active', $3::jsonb)",
        dummy_workflow_id, GITHUB_URL, json.dumps(github_payload)
    )
    print(f"[*] Registered GitHub Webhook for workflow {dummy_workflow_id}")

    # 5. Create some dummy AI outputs
    dummy_merged_result = "# Hello World\n\nThis is a test of the automated webhook delivery system! The zip file works!"
    dummy_task_outputs = {
        "T1": "print('Task 1 completed successfully.')",
        "T2": "<h1>Task 2 UI rendered.</h1>"
    }

    # 6. Dispatch! (This triggers the logic in backend/services_py/webhooks.py)
    print("[*] Dispatching webhooks now...")
    await dispatch_webhooks(dummy_workflow_id, dummy_merged_result, dummy_task_outputs)
    print("[*] Dispatch complete! Check your Discord channel and GitHub actions.")
    # await db.close_pool()

if __name__ == "__main__":
    asyncio.run(main())
