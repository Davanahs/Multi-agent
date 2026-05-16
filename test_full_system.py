import asyncio
import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_URL = "https://discord.com/api/webhooks/1504935126692266064/rtghnA-EmspUAKugMCwfvSy8m41Idn70Env6T5e5eRFytL8WxbLQrYJmbt3ZT1Am7HLz"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_URL = "https://api.github.com/repos/Davanahs/Multi-agent/dispatches"

BASE_URL = "http://127.0.0.1:8080"

async def main():
    async with httpx.AsyncClient(timeout=300.0) as client:
        # 1. Start a REAL Workflow (This will trigger LLMs and Omium!)
        print("[*] 1. Sending prompt to start a real workflow...")
        prompt = "Write a Python script that calculates the Fibonacci sequence up to 10."
        r = await client.post(f"{BASE_URL}/api/workflows", json={"prompt": prompt})
        r.raise_for_status()
        
        workflow_id = r.json()["workflow_id"]
        print(f"[*] Started Workflow ID: {workflow_id}")
        
        # 2. Instantly register the Discord Webhook for THIS workflow ID!
        print("[*] 2. Registering Discord Webhook...")
        await client.post(
            f"{BASE_URL}/api/workflows/{workflow_id}/webhooks",
            json={
                "event_type": "workflow.completed",
                "webhook_url": DISCORD_URL
            }
        )
        
        # 3. Instantly register the GitHub Webhook for THIS workflow ID!
        print("[*] 3. Registering GitHub Webhook...")
        await client.post(
            f"{BASE_URL}/api/workflows/{workflow_id}/webhooks",
            json={
                "event_type": "workflow.completed",
                "webhook_url": GITHUB_URL,
                "payload": {"github_token": GITHUB_TOKEN, "event_type": "project_generated"}
            }
        )
        
        print(f"[*] 4. Webhooks registered! The backend is now running the LLMs autonomously.")
        print(f"[*] Check your Omium Dashboard! The traces should appear in a few seconds as the models run.")
        print(f"[*] When it finishes, Discord and GitHub will be triggered automatically.")

if __name__ == "__main__":
    asyncio.run(main())
