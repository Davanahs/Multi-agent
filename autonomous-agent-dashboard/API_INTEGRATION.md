# API Integration Guide

This guide explains how to connect the Lumi dashboard to your FastAPI backend for real workflow orchestration.

## Current Status

The application currently runs in **demo mode**, which simulates workflow execution without a backend API. This allows you to:
- Visualize the UI and interactions
- Test the frontend functionality
- Preview the dashboard behavior

To enable real workflow orchestration, follow the steps below to connect your FastAPI backend.

## Backend Requirements

Your FastAPI backend should provide these endpoints:

### 1. Start Workflow Execution

**Endpoint:** `POST /api/workflows`

**Request:**
```json
{
  "workflow_id": "string"
}
```

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "status": "running|completed|failed",
  "created_at": "number (timestamp)",
  "started_at": "number (timestamp)",
  "tasks": {
    "task-id": {
      "id": "string",
      "label": "string",
      "status": "pending|running|completed|failed",
      "start_time": "number (optional)",
      "end_time": "number (optional)",
      "input": {},
      "output": {},
      "error": "string (optional)"
    }
  },
  "edges": [
    {
      "id": "string",
      "source": "string (task id)",
      "target": "string (task id)"
    }
  ]
}
```

### 2. Stream Execution Events

**Endpoint:** `GET /api/workflows/{execution_id}/stream`

**Protocol:** Server-Sent Events (SSE)

**Event Formats:**

```
# Task Started
data: {
  "type": "task_start",
  "task_id": "string",
  "task_label": "string",
  "timestamp": "number"
}

# Task Completed
data: {
  "type": "task_complete",
  "task_id": "string",
  "task_label": "string",
  "timestamp": "number",
  "data": {}
}

# Task Error
data: {
  "type": "task_error",
  "task_id": "string",
  "task_label": "string",
  "timestamp": "number",
  "error": "string"
}

# Workflow Complete
data: {
  "type": "workflow_complete",
  "task_id": "workflow",
  "task_label": "Workflow",
  "timestamp": "number",
  "data": {
    "result": {},
    "summary": "string",
    "duration_seconds": "number"
  }
}
```

### 3. Get Execution Result

**Endpoint:** `GET /api/workflows/{execution_id}/result`

**Response:**
```json
{
  "status": "success|error",
  "summary": "string",
  "tasks_executed": "number",
  "duration_seconds": "number",
  "insights": {},
  "errors": []
}
```

### 4. Get Execution History

**Endpoint:** `GET /api/workflows?limit=50`

**Response:**
```json
[
  {
    "id": "string",
    "name": "string",
    "status": "completed|failed|running",
    "created_at": "number",
    "started_at": "number",
    "completed_at": "number",
    "tasks": {},
    "edges": [],
    "events": []
  }
]
```

## Switching from Demo Mode to API

### Step 1: Set API Base URL

Create or update `.env.local`:

```bash
NEXT_PUBLIC_API_BASE=http://your-backend-url:8080
```

For production:
```bash
NEXT_PUBLIC_API_BASE=https://your-production-domain.com
```

### Step 2: Disable Demo Mode

Edit `/components/dashboard/execution-panel.tsx`:

```typescript
// Change this:
const [useDemoMode] = useState(true);

// To this:
const [useDemoMode] = useState(false);
```

### Step 3: Restart the Application

```bash
pnpm dev
```

## Testing the Integration

### 1. Test Workflow Start

```bash
curl -X POST http://localhost:8080/api/workflows \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "test-workflow"}'
```

### 2. Test SSE Stream

```bash
curl -N http://localhost:8080/api/workflows/{execution_id}/stream
```

You should see events like:
```
data: {"type":"task_start","task_id":"task-1","timestamp":1234567890}
```

### 3. Check Result Endpoint

```bash
curl http://localhost:8080/api/workflows/{execution_id}/result
```

## Frontend Code Reference

### API Client

The workflow client is in `/lib/api/workflow-client.ts`. Key methods:

```typescript
// Start a workflow
const execution = await workflowClient.startWorkflow('workflow-id');

// Stream events
const cleanup = workflowClient.streamExecutionEvents(
  executionId,
  (event) => console.log('Event:', event),
  (result) => console.log('Complete:', result),
  (error) => console.error('Error:', error)
);

// Stop streaming
cleanup();

// Get result
const result = await workflowClient.getExecutionResult(executionId);

// Get history
const history = await workflowClient.getExecutionHistory(50);
```

### State Management

Use the Zustand store to manage workflow state:

```typescript
import { useWorkflowStore } from '@/lib/store/workflow-store';

// In your component:
const currentExecution = useWorkflowStore((state) => state.currentExecution);
const isStreaming = useWorkflowStore((state) => state.isStreaming);

// Update state:
const store = useWorkflowStore();
store.setCurrentExecution(execution);
store.addExecutionEvent(event);
store.updateTaskStatus(taskId, 'completed');
```

### Custom Hooks

**Stream Hook:**
```typescript
const { startStream } = useWorkflowStream(executionId, {
  onStreamStart: () => console.log('Started'),
  onEvent: (event) => console.log('Event:', event),
  onComplete: (result) => console.log('Complete'),
  onError: (error) => console.error('Error'),
});
```

**Execution Hook:**
```typescript
const { execution, isLoading, error, startExecution } = useWorkflowExecution();

// Start workflow
await startExecution('workflow-id');
```

## CORS Configuration

Your FastAPI backend needs to allow requests from the frontend URL:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Events Not Showing
- Check browser DevTools Network tab for SSE connection
- Verify backend is sending events in correct format
- Check CORS headers are present

### API Connection Errors
- Verify `NEXT_PUBLIC_API_BASE` is set correctly
- Check backend is running and accessible
- Review browser console for specific error messages

### Tasks Not Updating
- Ensure event `task_id` matches task IDs in initial workflow
- Verify task status values are: pending|running|completed|failed
- Check timestamps are in milliseconds

## Example FastAPI Implementation

Here's a minimal FastAPI backend example:

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from typing import AsyncGenerator

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/workflows")
async def start_workflow(request: dict):
    return {
        "id": "exec-123",
        "name": "Test Workflow",
        "status": "running",
        "created_at": int(time.time() * 1000),
        "tasks": {
            "task-1": {
                "id": "task-1",
                "label": "Task 1",
                "status": "pending"
            }
        },
        "edges": []
    }

@app.get("/api/workflows/{execution_id}/stream")
async def stream_events(execution_id: str):
    async def event_generator() -> AsyncGenerator[str, None]:
        # Send events
        yield f'data: {json.dumps({"type": "task_start", "task_id": "task-1"})}\n\n'
        await asyncio.sleep(1)
        yield f'data: {json.dumps({"type": "task_complete", "task_id": "task-1"})}\n\n'
        yield f'data: {json.dumps({"type": "workflow_complete"})}\n\n'
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/workflows/{execution_id}/result")
async def get_result(execution_id: str):
    return {
        "status": "success",
        "summary": "Workflow completed",
        "duration_seconds": 5
    }
```

## Next Steps

1. Set up your FastAPI backend with the required endpoints
2. Test each endpoint individually with curl
3. Update `.env.local` with your API base URL
4. Disable demo mode in ExecutionPanel
5. Restart the development server
6. Test the full workflow through the UI

The frontend is fully ready to work with your backend - just implement the API endpoints and it will automatically integrate!
