import io
import json
import zipfile
import base64
import httpx
from .. import db
from . import logger as log

async def create_project_zip(merged_result: str, task_outputs: dict) -> bytes:
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write the final merged document
        zf.writestr("final_result.md", merged_result or "No result generated.")
        
        # Write individual task outputs if available
        if task_outputs:
            zf.writestr("task_outputs.json", json.dumps(task_outputs, indent=2))
            
            # Also write them as individual files for easier reading
            for task_id, output in task_outputs.items():
                if output:
                    zf.writestr(f"tasks/{task_id}_output.md", output)
                    
    return zip_buffer.getvalue()


async def dispatch_webhooks(workflow_id: str, merged_result: str, task_outputs: dict, sse_emitter=None):
    webhooks = await db.fetch(
        "SELECT webhook_url, payload FROM webhooks "
        "WHERE workflow_id=$1::uuid AND event_type='workflow.completed' AND status='active'",
        workflow_id
    )
    if not webhooks:
        return

    log.info(f"Dispatching {len(webhooks)} webhooks for workflow {workflow_id}")
    
    # Fetch prompt to name the zip file
    wf_row = await db.fetchrow("SELECT prompt FROM workflows WHERE workflow_id=$1::uuid", workflow_id)
    prompt = wf_row["prompt"] if wf_row else "project"
    
    # Sanitize prompt for filename (alphanumeric and underscores only, max 40 chars)
    import re
    safe_name = re.sub(r'[^a-zA-Z0-9]+', '_', prompt.lower()).strip('_')
    safe_name = safe_name[:40] if safe_name else "project"
    zip_filename = f"{safe_name}_export.zip"
    
    zip_bytes = await create_project_zip(merged_result, task_outputs)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for wh in webhooks:
            url = wh["webhook_url"]
            user_payload = wh.get("payload", {})
            if isinstance(user_payload, str):
                try:
                    user_payload = json.loads(user_payload)
                except:
                    user_payload = {}
                    
            try:
                if "discord.com/api/webhooks" in url:
                    # Discord Multipart Upload
                    files = {
                        "file": (zip_filename, zip_bytes, "application/zip")
                    }
                    data = {
                        "payload_json": json.dumps({
                            "content": f"✅ **Workflow Completed!** ID: `{workflow_id}`\nI've attached `{zip_filename}`."
                        })
                    }
                    r = await client.post(url, data=data, files=files)
                    r.raise_for_status()
                    log.webhook_success(f"Successfully dispatched Discord webhook to {url}")
                    if sse_emitter:
                        await sse_emitter("webhook", {"taskId": "webhook", "taskLabel": f"Pushed project to Discord"})
                    
                elif "api.github.com" in url:
                    # GitHub Repository Dispatch
                    # Expected URL: https://api.github.com/repos/OWNER/REPO/dispatches
                    # The user MUST pass the token inside the webhook payload: {"github_token": "ghp_xxx", "event_type": "project_generated"}
                    
                    token = user_payload.get("github_token")
                    event_type = user_payload.get("event_type", "ai-workflow-completed")
                    
                    if not token:
                        log.error(f"GitHub webhook failed: Missing 'github_token' in payload for {url}")
                        continue
                        
                    headers = {
                        "Accept": "application/vnd.github.v3+json",
                        "Authorization": f"Bearer {token}",
                        "X-GitHub-Api-Version": "2022-11-28"
                    }
                    
                    # Base64 encode the ZIP file so it can be passed in JSON
                    b64_zip = base64.b64encode(zip_bytes).decode("utf-8")
                    
                    dispatch_data = {
                        "event_type": event_type,
                        "client_payload": {
                            "workflow_id": workflow_id,
                            "project_zip_base64": b64_zip,
                            "zip_filename": zip_filename
                        }
                    }
                    
                    r = await client.post(url, headers=headers, json=dispatch_data)
                    r.raise_for_status()
                    log.webhook_success(f"Successfully dispatched GitHub webhook to {url}")
                    if sse_emitter:
                        await sse_emitter("webhook", {"taskId": "webhook", "taskLabel": f"Pushed code to GitHub"})
                    
                else:
                    # Generic standard webhook (Base64 encoded zip to avoid huge raw JSON dumps)
                    b64_zip = base64.b64encode(zip_bytes).decode("utf-8")
                    generic_payload = {
                        "workflow_id": workflow_id,
                        "status": "completed",
                        "project_zip_base64": b64_zip,
                        "zip_filename": zip_filename
                    }
                    # merge with any custom user payload
                    generic_payload.update(user_payload)
                    
                    r = await client.post(url, json=generic_payload)
                    r.raise_for_status()
                    log.webhook_success(f"Successfully dispatched generic webhook to {url}")
                    if sse_emitter:
                        await sse_emitter("webhook", {"taskId": "webhook", "taskLabel": f"Pushed webhook to {url[:30]}..."})
                    
            except Exception as e:
                log.error(f"Failed to dispatch webhook to {url}: {e}")
                if sse_emitter:
                    await sse_emitter("task.failed", {"taskId": "webhook", "taskLabel": f"Webhook failed: {str(e)[:50]}"})
