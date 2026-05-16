import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_URL = "https://discord.com/api/webhooks/1504935126692266064/rtghnA-EmspUAKugMCwfvSy8m41Idn70Env6T5e5eRFytL8WxbLQrYJmbt3ZT1Am7HLz"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_URL = "https://api.github.com/repos/Davanahs/Multi-agent/dispatches"

BASE_URL = "http://127.0.0.1:8080"

async def main():
    async with httpx.AsyncClient(timeout=300.0) as client:
        # 1. Start a very tiny workflow to bypass free-tier rate limits!
        print("[*] 1. Sending a micro-prompt to start a tiny workflow...")
        prompt = "Write a simple Python function that checks if a string is a palindrome."
        
        # We send the webhooks in the exact same request now, since I upgraded your FastAPI backend!
        payload = {
            "prompt": prompt,
            "webhooks": [
                {
                    "event_type": "workflow.completed",
                    "webhook_url": DISCORD_URL
                },
                {
                    "event_type": "workflow.completed",
                    "webhook_url": GITHUB_URL,
                    "payload": {
                        "github_token": GITHUB_TOKEN,
                        "event_type": "project_generated"
                    }
                }
            ]
        }
        
        r = await client.post(f"{BASE_URL}/api/workflows", json=payload)
        r.raise_for_status()
        
        workflow_id = r.json()["workflow_id"]
        print(f"[*] Started Workflow ID: {workflow_id}")
        print(f"[*] Webhooks automatically registered via your new backend code!")
        print(f"[*] Check your Omium Dashboard in 1-2 minutes to see the traces.")
        print(f"[*] Because this is a tiny task, it should avoid the '429 Too Many Requests' error.")

if __name__ == "__main__":
    asyncio.run(main())
