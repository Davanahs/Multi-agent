"""
Multi-Agent System -- Complete API Test Suite
=============================================
Tests all backend features using Python requests.

Usage:
    pip install requests colorama
    python test_api.py           # run all tests
    python test_api.py health    # health checks only
    python test_api.py models    # model management only
    python test_api.py llm       # LLM router only
    python test_api.py workflow  # full workflow pipeline
"""

import requests
import sys
import time
from datetime import datetime

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    from colorama import Fore, Style, init as colorama_init
    colorama_init()
    RED    = Fore.RED
    GREEN  = Fore.GREEN
    YELLOW = Fore.YELLOW
    CYAN   = Fore.CYAN
    BLUE   = Fore.BLUE
    RESET  = Style.RESET_ALL
    BOLD   = Style.BRIGHT
except ImportError:
    RED = GREEN = YELLOW = CYAN = BLUE = RESET = BOLD = ""

BASE_URL = "http://localhost:8000"
results  = {"passed": 0, "failed": 0}

# ── Helpers ──────────────────────────────────────────────────────────────────
def header(title):
    bar = "=" * 60
    print(f"\n{BOLD}{CYAN}{bar}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{bar}{RESET}")

def section(title):
    print(f"\n{YELLOW}--- {title} ---{RESET}")

def ok(msg):
    print(f"  {GREEN}[PASS]{RESET}  {msg}")

def fail(msg, err=None):
    print(f"  {RED}[FAIL]{RESET}  {msg}")
    if err:
        print(f"         {RED}{str(err)[:120]}{RESET}")

def info(msg):
    print(f"  {BLUE}[INFO]{RESET}  {msg}")

def get(path, **kwargs):
    return requests.get(f"{BASE_URL}{path}", timeout=30, **kwargs)

def post(path, data=None, **kwargs):
    return requests.post(f"{BASE_URL}{path}", json=data, timeout=90, **kwargs)

def check(condition, pass_msg, fail_msg, err=None):
    if condition:
        ok(pass_msg)
        results["passed"] += 1
    else:
        fail(fail_msg, err)
        results["failed"] += 1
    return condition


# ============================================================
# TEST 1 -- Health & System Status
# ============================================================
def test_health():
    header("TEST 1 -- Health & System Status")

    section("GET /health")
    try:
        r = get("/health")
        d = r.json()
        check(r.status_code == 200,              "Server is reachable (200 OK)",           "Server unreachable")
        check(d.get("status") == "healthy",      "Status = healthy",                       "Status is not healthy", d)
        check(d.get("database") == "connected",  "Database is connected",                  "Database disconnected", d)
        check(d.get("activeModels", 0) > 0,      f"Active models: {d.get('activeModels')}", "No active models in DB")
        info(f"Server uptime: {d.get('uptime', 0):.1f}s")
    except Exception as e:
        fail("Health check exception", e)

    section("GET /db/tables")
    try:
        r = get("/db/tables")
        tables = [row.get("table_name") for row in r.json().get("tables", [])]
        # Actual table names Prisma generates (lowercase + underscores)
        for expected in ["workflows", "subtasks", "models", "agent_outputs", "subtask_deps"]:
            check(expected in tables, f"Table '{expected}' exists", f"Table '{expected}' MISSING")
        info(f"Total tables in DB: {len(tables)}  -> {tables}")
    except Exception as e:
        fail("DB tables check exception", e)


# ============================================================
# TEST 2 -- Model Management
# ============================================================
def test_models():
    header("TEST 2 -- Model Management")

    section("GET /api/models  (all active models)")
    try:
        r = get("/api/models")
        d = r.json()
        check(r.status_code == 200,      "Endpoint reachable",                   "Endpoint failed")
        check(d.get("count", 0) > 0,     f"Models returned: {d.get('count')}",   "No models returned")
    except Exception as e:
        fail("GET /api/models exception", e)

    section("GET /api/models?provider=groq  (filter by provider)")
    try:
        r = get("/api/models?provider=groq")
        d = r.json()
        check(r.status_code == 200, "Filter endpoint reachable", "Filter failed")
        all_groq = all(m.get("provider") == "groq" for m in d.get("models", []))
        check(all_groq, f"All {d.get('count')} returned models are groq", "Non-groq models in response")
    except Exception as e:
        fail("Provider filter exception", e)

    section("GET /api/models/health  (per-provider stats)")
    try:
        r = get("/api/models/health")
        d = r.json()
        check(r.status_code == 200, "Endpoint reachable",             "Endpoint failed")
        check("total" in d,         "Total stats present",            "Missing total stats")
        check("byProvider" in d,    "Per-provider breakdown present", "Missing byProvider")
        info(f"Total: {d['total']['active']} active / {d['total']['total']} total")
        for p in d.get("byProvider", []):
            info(f"  [{p['provider']}] {p['active']} active / {p['total']} total")
    except Exception as e:
        fail("Model health stats exception", e)

    section("POST /api/models/sync  (sync groq provider -- fast)")
    try:
        r = requests.post(f"{BASE_URL}/api/models/sync", json={"provider": "groq"}, timeout=30)
        d = r.json()
        check(r.status_code == 200,        "Sync endpoint reachable", "Sync failed")
        check(d.get("success") == True,    "Sync returned success",   "Sync returned error", d)
        info(f"Synced {d.get('data', {}).get('modelsUpdated', '?')} groq models")
        info("(Full sync of all providers: POST /api/models/sync with empty body)")
    except Exception as e:
        fail("Model sync exception", e)


# ============================================================
# TEST 3 -- LLM Router & Cascading Fallback
# ============================================================
def test_llm_router():
    header("TEST 3 -- LLM Router & Cascading Fallback")

    for task_type in ["fast", "general", "coding", "planning"]:
        section(f"POST /api/llm/test  taskType='{task_type}'")
        try:
            r = post("/api/llm/test", {
                "prompt":   f"Reply with one sentence. Confirm you are a {task_type} assistant.",
                "taskType": task_type
            })
            d = r.json()
            data = d.get("data", {})
            if r.status_code == 200 and d.get("success"):
                ok(f"Response from {data.get('model', data.get('provider','?') + '/' + data.get('model_name','?'))}")
                attempts = data.get("attempts", [])
                if len(attempts) > 1:
                    info(f"Cascaded through {len(attempts)} models:")
                    for a in attempts:
                        status = "OK " if a["status"] == "success" else "---"
                        info(f"  [{status}] [{a['provider']}] {a['modelName']}  {a.get('error','')[:60]}")
                results["passed"] += 1
            else:
                fail(f"taskType={task_type} failed", d.get("detail", d.get("error", str(d))))
                results["failed"] += 1
        except Exception as e:
            fail(f"LLM test exception for {task_type}", e)


# ============================================================
# TEST 4 -- Full Workflow Pipeline
# ============================================================
def test_workflow():
    header("TEST 4 -- Full Autonomous Workflow Pipeline")
    workflow_id = None

    section("POST /api/workflows  (create workflow)")
    try:
        r = post("/api/workflows", {"prompt": "Build a Python CLI tool that converts CSV to JSON"})
        d = r.json()
        check(r.status_code == 202,           "Workflow created (202 Accepted)", "Creation failed", d)
        check("workflow_id" in d,             "workflow_id in response",         "Missing workflow_id")
        check(d.get("status") == "planning",  "Initial status = planning",       f"Wrong status: {d.get('status')}")
        workflow_id = d.get("workflow_id")
        info(f"Workflow ID: {workflow_id}")
    except Exception as e:
        fail("Workflow creation exception", e)
        return

    section("Polling for Planner Agent to finish (up to 40s)...")
    for i in range(40):
        time.sleep(1)
        try:
            r   = get(f"/api/workflows/{workflow_id}")
            d   = r.json()
            data_dict = d.get("data", d)
            status = data_dict.get("status", "unknown")
            sys.stdout.write(f"\r  Status: {status} ({i+1}s)   ")
            sys.stdout.flush()
            if status in ("planned", "failed"):
                break
        except Exception:
            pass
    print()

    section(f"GET /api/workflows/{workflow_id}  (subtasks check)")
    try:
        r = get(f"/api/workflows/{workflow_id}")
        d = r.json()
        data_dict = d.get("data", d)
        check(r.status_code == 200,         "Workflow found",                              "Not found")
        check(data_dict.get("status") == "planned", "Status = planned",                           f"Status = {data_dict.get('status')}")
        subtasks = data_dict.get("subtasks", [])
        check(len(subtasks) >= 3,           f"Subtasks generated by LLM: {len(subtasks)}", "Too few subtasks")
        info("Dynamically generated tasks (from LLM):")
        for t in subtasks:
            deps    = [dep["depends_on_task_id"] for dep in t.get("deps", [])]
            dep_str = f"  <- depends on {deps}" if deps else "  (no deps)"
            info(f"  {t['task_id']} [{t['type']}]  {t['task'][:65]}...{dep_str}")
    except Exception as e:
        fail("Subtask check exception", e)

    section(f"GET /api/workflows/{workflow_id}/plan  (DAG waves)")
    try:
        r    = get(f"/api/workflows/{workflow_id}/plan")
        d    = r.json()
        plan = d.get("plan", {})
        check(r.status_code == 200,            "Plan endpoint reachable",            "Endpoint failed")
        check(plan.get("totalWaves", 0) > 0,   f"Waves: {plan.get('totalWaves')}",  "No waves in plan")
        check(plan.get("totalTasks", 0) > 0,   f"Tasks: {plan.get('totalTasks')}",  "No tasks in plan")
        info(f"Max parallel tasks per wave: {plan.get('maxParallel')}")
        for wave in plan.get("waves", []):
            p_str = " <-- PARALLEL" if wave["parallel"] else ""
            info(f"  Wave {wave['wave']}: {[t['task_id'] for t in wave['tasks']]}{p_str}")
    except Exception as e:
        fail("Plan check exception", e)

    section(f"POST /api/workflows/{workflow_id}/execute  (trigger agents)")
    try:
        r = post(f"/api/workflows/{workflow_id}/execute")
        d = r.json()
        check(r.status_code == 200, "Execution triggered", "Trigger failed", d)
        info("Agents are now running autonomously. Polling for completion...")
    except Exception as e:
        fail("Execute trigger exception", e)
        return

    section("Polling for workflow completion (up to 6 min)...")
    last_status = ""
    for i in range(180):
        time.sleep(2)
        try:
            r      = get(f"/api/workflows/{workflow_id}")
            status = r.json().get("status", "unknown")
            if status != last_status:
                print(f"\r  [{i*2+2}s] Status changed: {last_status} -> {YELLOW}{status}{RESET}   ")
                last_status = status
            else:
                sys.stdout.write(f"\r  [{i*2+2}s] Status: {YELLOW}{status}{RESET}   ")
                sys.stdout.flush()
            if status in ("done", "failed"):
                break
        except Exception:
            pass
    print()

    section(f"GET /api/workflows/{workflow_id}/result  (final merged output)")
    try:
        r = get(f"/api/workflows/{workflow_id}/result")
        d = r.json()
        check(r.status_code == 200,         "Result endpoint reachable",    "Endpoint failed")
        check(d.get("status") == "done",    "Workflow status = done",       f"Status = {d.get('status')}")
        result = d.get("result", {})
        check(bool(result.get("content")),  "Final merged content present", "No content in result")
        if result.get("content"):
            info(f"Merged by: {result.get('provider')}/{result.get('model')}")
            info(f"Preview:   {result['content'][:250]}...")
    except Exception as e:
        fail("Result fetch exception", e)

    section("GET /api/workflows  (list all workflows)")
    try:
        r = get("/api/workflows")
        d = r.json()
        check(r.status_code == 200,        "List endpoint reachable",          "Endpoint failed")
        check(d.get("count", 0) > 0,       f"Workflows in DB: {d.get('count')}", "No workflows found")
    except Exception as e:
        fail("Workflow list exception", e)


# ============================================================
# SUMMARY
# ============================================================
def print_summary():
    header("TEST SUMMARY")
    total = results["passed"] + results["failed"]
    pct   = (results["passed"] / total * 100) if total > 0 else 0
    print(f"\n  {GREEN}Passed:{RESET} {results['passed']}")
    print(f"  {RED}Failed:{RESET} {results['failed']}")
    print(f"  Score:  {pct:.0f}% ({results['passed']}/{total})\n")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "full"

    print(f"\n{BOLD}Multi-Agent System -- API Test Suite{RESET}")
    print(f"Base URL : {BASE_URL}")
    print(f"Time     : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Running  : {arg}")

    if arg in ("health",   "full"):  test_health()
    if arg in ("models",   "full"):  test_models()
    if arg in ("llm",      "full"):  test_llm_router()
    if arg in ("workflow", "full"):  test_workflow()

    print_summary()
