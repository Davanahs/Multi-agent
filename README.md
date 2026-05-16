<div align="center">

# Multi-Agent Workflow OS

### Autonomous. Parallel. Observable. End-to-end.

A production-grade multi-agent orchestration engine built for **Anvil 2026 — Problem 03 (Omium Sponsored Track)**.  
Compiles natural language into dependency-aware DAGs, executes agents in parallel waves across a cascading LLM router, and streams every step live to a real-time observability dashboard — with full Omium distributed tracing.

[![Track](https://img.shields.io/badge/Track-Anvil%202026%20%C2%B7%20P%C2%B703%20Omium-orange)]()
[![Stack](https://img.shields.io/badge/Stack-Next.js%2014%20%2B%20FastAPI-blueviolet)]()
[![Transport](https://img.shields.io/badge/Transport-Server--Sent%20Events-cyan)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%28Neon%29-blue)]()
[![Tracing](https://img.shields.io/badge/Tracing-Omium%20AI%20SDK-orange)]()

</div>

---

## The Problem

Modern LLM agents are single-threaded, slow, and completely opaque — leaving users staring at a spinner while hoping the AI doesn't crash mid-thought.

We solve this by **compiling natural language into Directed Acyclic Graphs (DAGs)**, executing independent tasks in parallel waves across a cascading multi-provider LLM router, and streaming every agent decision, tool call, and state transition live to a reactive observability dashboard — so you always know exactly what your agents are doing and why.

---

## How It Works

```
1. User submits a prompt (or a webhook fires an external event)
         ↓
2. Planner Agent decomposes it into discrete subtasks with dependency mapping
         ↓
3. Execution Engine groups independent subtasks into topological "waves"
         ↓
4. Each wave fans out concurrently — Sub-Agent Executor runs each task
         ↓
5. LLM Router assigns a provider per task; cascades on rate limits or failures
         ↓
6. SSE streams every state change live to the dashboard
         ↓
7. Result Merger Agent synthesizes all outputs into a final aggregated result
         ↓
8. Every step causally traced end-to-end in Omium — verifiable, inspectable
```

---

## Capabilities

| Capability | Description |
| :--- | :--- |
| **Dynamic Task Planning** | Planner Agent decomposes any prompt into discrete, dependency-mapped subtasks rendered as a live DAG. |
| **Parallel Wave Execution** | Execution Engine groups independent tasks into topological waves and runs them concurrently — no wasted latency. |
| **Cascading LLM Router** | Auto-falls back across 6+ providers (Groq, OpenAI, Gemini, OpenRouter, NVIDIA, etc.) on `429`/`403` errors. Guarantees completion. |
| **Real-Time Observability** | SSE streams exact execution states — `planning → running → failed → completed` — to the UI with zero polling. |
| **Webhook Ingress** | External events trigger workflows autonomously via `POST /api/workflows/{id}/webhooks`. The system reacts to the world, not only to user prompts. |
| **Async Orchestration** | Tasks fan out, complete on their own timeline, and return results to the planner. Long-running jobs survive beyond a single request. |
| **Omium Distributed Tracing** | Every agent hop, tool call, wave transition, and webhook fire is causally linked and verifiable on the Omium dashboard. |
| **Persistent History** | All workflows, plans, and outputs persisted in PostgreSQL (Neon) and surfaced in the session sidebar. |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js 14 Frontend                      │
│                                                              │
│  Prompt Input · DAG Canvas · Execution Panel · Wave Timeline │
│  Agent Cards · Result Viewer · Session History Sidebar       │
└───────────────────────────┬──────────────────────────────────┘
                            │  REST + SSE
┌───────────────────────────▼──────────────────────────────────┐
│                      FastAPI Backend                         │
│                                                              │
│  ┌──────────────────┐    ┌───────────────────────────────┐   │
│  │  Planner Agent   │───▶│      Execution Engine         │   │
│  │ planner.agent.js │    │    execution-engine.js        │   │
│  └──────────────────┘    └──────────────┬────────────────┘   │
│                                         │  fan-out per wave  │
│                          ┌──────────────▼────────────────┐   │
│                          │     Sub-Agent Executor        │   │
│                          │  sub-agent.executor.js        │   │
│                          └──────────────┬────────────────┘   │
│                                         │                    │
│                          ┌──────────────▼────────────────┐   │
│                          │  LLM Router  (llm.py)         │   │
│                          │  Groq → OpenAI → Gemini →     │   │
│                          │  OpenRouter → NVIDIA → [next] │   │
│                          └──────────────┬────────────────┘   │
│                                         │                    │
│                          ┌──────────────▼────────────────┐   │
│                          │    Result Merger Agent        │   │
│                          │  result-merger.agent.js       │   │
│                          └───────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │         Omium AI SDK — Distributed Tracing            │   │
│  │  Agent hops · Tool calls · Wave transitions ·         │   │
│  │  Webhook fires · Causal threading across all steps    │   │
│  └───────────────────────────────────────────────────────┘   │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│             PostgreSQL (Neon) — Workflow Persistence         │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS, Zustand, Framer Motion, ReactFlow |
| **Backend** | Python 3.11, FastAPI, `asyncio`, `httpx` |
| **Agent Layer** | `planner.agent.js`, `sub-agent.executor.js`, `result-merger.agent.js`, `execution-engine.js` |
| **LLM Routing** | `llm.py` — cascading fallback across Groq, OpenAI, Gemini, OpenRouter, NVIDIA |
| **Database** | PostgreSQL on Neon, `asyncpg`, Prisma |
| **Observability** | Omium AI Tracing SDK |
| **Transport** | Server-Sent Events (SSE) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL instance (Neon free tier works)

### 1. Clone & Configure

```bash
git clone https://github.com/Davanahs/Multi-agent
cd Multi-agent

# Copy environment template
cp .env.example .env
# Fill in your keys — see Environment Variables section below
```

### 2. Backend

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8080
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), submit a prompt, and watch the agents work.

---

## Environment Variables

Create a `.env` file in the project root using this template:

```bash
# ──────────────────────────────────────────────
# Database Configuration (Neon DB)
# ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ──────────────────────────────────────────────
# Server Configuration
# ──────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ──────────────────────────────────────────────
# Omium Observability
# ──────────────────────────────────────────────
OMIUM_PROJECT=production
OMIUM_API_KEY=your_omium_api_key

# ──────────────────────────────────────────────
# AI Provider API Keys (add whichever you use)
# ──────────────────────────────────────────────
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
NVIDIA_API_KEY=
OPENROUTER_API_KEY=
GITHUB_TOKEN=
```

> **Never commit your real `.env` file.** It is already listed in `.gitignore`.

---

## Project Structure

```
/backend
├── /agents
│   ├── execution-engine.js       # Wave-based parallel execution orchestrator
│   ├── planner.agent.js          # Prompt → DAG decomposition agent
│   ├── result-merger.agent.js    # Final synthesis agent
│   └── sub-agent.executor.js     # Per-task agent runner
├── /controllers
├── /routers
│   ├── health.py                 # Health check + DB tables
│   ├── llm.py                    # Cascading LLM router (6+ providers)
│   ├── models.py                 # Model registry + sync
│   └── workflows.py              # Workflow CRUD, SSE stream, webhooks
├── /routes
├── /schemas
├── /services
├── /services_py
│   └── db.py                     # PostgreSQL async client
├── main.py                       # FastAPI application entrypoint
└── server.js

/frontend
├── /app                          # Next.js App Router pages
├── /components
│   ├── /dashboard                # ExecutionPanel, AgentCards, Canvas, ResultViewer
│   ├── /landing                  # Hero, FeatureCards, CTA
│   ├── /workflow                 # DAG node and edge components
│   └── /ui                       # shadcn/ui primitives
├── /hooks                        # useWorkflowStream, useWorkflowExecution, useDagLayout
└── /lib
    ├── /api                      # REST + SSE client
    ├── /store                    # Zustand global state
    └── /types                    # Full TypeScript type system

/database                         # DB migrations and schema
/docs                             # Additional documentation
/prisma                           # Prisma schema
/sentinel                         # Monitoring utilities
/tests                            # Test suite
/webhook                          # Webhook handler utilities
```

---

## API Reference

### Health

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health check |
| `GET` | `/db/tables` | List database tables |

### Models

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/models` | List available models |
| `GET` | `/api/models/health` | Check model provider health |
| `POST` | `/api/models/sync` | Sync model registry |

### LLM

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/llm/test` | Test LLM router with a prompt |

### Workflows

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/workflows` | List all workflows (history) |
| `POST` | `/api/workflows` | Create and start a new workflow |
| `GET` | `/api/workflows/{workflow_id}` | Get workflow details and status |
| `GET` | `/api/workflows/{workflow_id}/plan` | Get the planned DAG |
| `POST` | `/api/workflows/{workflow_id}/execute` | Trigger execution of a planned workflow |
| `GET` | `/api/workflows/{workflow_id}/result` | Fetch the final aggregated result |
| `GET` | `/api/workflows/{workflow_id}/stream` | SSE stream for live execution events |
| `POST` | `/api/workflows/{workflow_id}/webhooks` | Register a webhook on a workflow |

---

### SSE Event Reference

Connect to `GET /api/workflows/{workflow_id}/stream` and keep the connection open.

| Event | Payload |
| :--- | :--- |
| `workflow.started` | `{ "workflowId": "uuid", "totalWaves": 3 }` |
| `wave.started` | `{ "wave": 1, "taskIds": ["T1", "T2"] }` |
| `task.started` | `{ "taskId": "T1", "provider": "groq", "agent": "research" }` |
| `task.completed` | `{ "taskId": "T1", "provider": "groq", "executionMs": 1400, "tokens": 312 }` |
| `task.failed` | `{ "taskId": "T2", "error": "Rate limit exceeded" }` |
| `workflow.merging` | `{ "workflowId": "uuid" }` |
| `workflow.completed` | `{ "workflowId": "uuid" }` |

---

## Key Design Decisions

**Topological Wave Execution**
Rather than a naive Promise pool or sequential queue, the execution engine parses the task DAG into strict topological layers. Tasks run in parallel *only* after all their dependencies resolve. This maximizes concurrency safely and makes execution order deterministic — critical for a reliable live demo.

**Cascading LLM Router**
Hardcoding a single provider in a hackathon is a liability — rate limits and 403s are inevitable. The router explicitly catches `429` and `403` responses and falls through a prioritized provider list automatically, giving the system near-100% completion rates without any manual intervention.

**Zustand over React Context**
The DAG canvas receives dozens of state updates per second as SSE events stream in. React Context re-renders the entire component tree on every update. Zustand lets individual task nodes subscribe only to their own state slice, keeping the canvas smooth even under high event throughput.

**SSE over WebSockets**
Workflow updates are strictly server → client. SSE is unidirectional, runs over plain HTTP with no upgrade handshake, and has native browser reconnect built in. For this communication pattern, WebSockets add complexity with no benefit.

**Omium as Causal Audit Trail**
Every agent invocation, tool call, and wave transition is instrumented through the Omium SDK with parent-child causal linking. The Omium dashboard is not just a log — it is a verifiable, inspectable record that matches the demo execution step-for-step, satisfying the bonus track requirements fully.

---

## Omium Tracing

This project instruments the full workflow through the Omium AI SDK for the bonus evaluation axis.

Every meaningful step is traced and causally linked:

- Planner agent invocation and DAG output
- Wave start and task fan-out
- Per-agent execution (start, provider selection, tool calls, completion)
- LLM provider selection and fallback events
- Result merger synthesis
- Webhook ingress and async dispatch

Traces preserve the full causal chain — each sub-agent step links back to its parent wave, which links back to the root workflow trigger. The Omium dashboard shows the same workflow that ran in the demo, with the same steps, in the same order, fully inspectable.

---

## Evaluation Alignment

| Axis | How we address it |
| :--- | :--- |
| **Problem Relevance (20%)** | Solves a universal problem — AI workflows are opaque and slow. The dashboard is a product someone would actually use to monitor and trust autonomous agents in production. |
| **Autonomous Execution (25%)** | Zero human steering after prompt submission. Planner, executor, sub-agents, and merger all operate independently. Cascading router handles provider failures autonomously. |
| **Multi-Agent Quality (20%)** | Four distinct agents with clear responsibilities: Planner, Sub-Agent Executor, Result Merger, LLM Router. Tasks hand off through the DAG with dependency-aware sequencing. |
| **Tooling & Integrations (15%)** | Webhook ingress, async wave execution, PostgreSQL persistence, 6+ LLM provider integrations, model sync endpoint, health monitoring. |
| **Demo Video (10%)** | End-to-end flow visible: prompt → DAG render → wave execution → live node updates → merger phase → final result. Every agent step visible on screen. |
| **Architecture (10%)** | Clean separation: agents, routers, services, schemas, prisma, sentinel. Modular FastAPI + Next.js with typed interfaces throughout. |
| **Omium Bonus (+10%)** | Full causal tracing across all agent hops, wave transitions, webhook fires, and tool calls. Dashboard matches demo execution exactly. |

---

## Dependencies

**Backend:** FastAPI, asyncpg, httpx, asyncio, Omium AI SDK, Prisma, python-dotenv

**Frontend:** Next.js 14, React 19, TypeScript, TailwindCSS, Zustand, Framer Motion, ReactFlow, shadcn/ui

**LLM Providers:** Groq, OpenAI, Google Gemini, OpenRouter, NVIDIA (cascading fallback)

**Database:** PostgreSQL via Neon

All third-party API costs are borne by the team.

---

## Security

- **SQL Injection** — All queries use parameterized statements via `asyncpg`
- **CORS** — FastAPI explicitly allowlists frontend origins; no wildcard in production
- **Secrets** — All API keys are runtime environment variables via `.env`, never committed or bundled into the client
- **`.gitignore`** — `.env` is excluded from version control

---

<div align="center">

*Built for Anvil 2026 · Problem 03 · Omium Sponsored Track*

*A demo that runs. A product someone would actually use. End-to-end work, completed without a human in the loop.*

</div>
