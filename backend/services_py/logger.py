"""
Rich terminal logger — colorized output showing which model runs each task.
"""
import datetime
from colorama import Fore, Back, Style, init

init(autoreset=True)


def _ts() -> str:
    return datetime.datetime.now().strftime("%H:%M:%S")


# ─── Workflow-level ───────────────────────────────────────────────────────────

def workflow_start(workflow_id: str, prompt: str):
    print(f"\n{Fore.WHITE}{Back.BLUE} WORKFLOW START {Style.RESET_ALL} "
          f"{Fore.CYAN}{workflow_id[:8]}...{Style.RESET_ALL}")
    print(f"  {Fore.YELLOW}Prompt: {prompt[:100]}{Style.RESET_ALL}")


def workflow_planned(n_tasks: int, model: str):
    print(f"  {Fore.GREEN}[Planner] Generated {n_tasks} tasks  "
          f"via  {Fore.MAGENTA}{model}{Style.RESET_ALL}")


def workflow_done(workflow_id: str):
    print(f"\n{Fore.WHITE}{Back.GREEN} WORKFLOW DONE {Style.RESET_ALL} "
          f"{Fore.CYAN}{workflow_id[:8]}...{Style.RESET_ALL}\n")


def workflow_failed(workflow_id: str, err: str):
    print(f"\n{Fore.WHITE}{Back.RED} WORKFLOW FAILED {Style.RESET_ALL} "
          f"{Fore.CYAN}{workflow_id[:8]}{Style.RESET_ALL}  "
          f"{Fore.RED}{err[:120]}{Style.RESET_ALL}\n")


# ─── Wave-level ───────────────────────────────────────────────────────────────

def wave_start(wave_num: int, total_waves: int, task_ids: list[str]):
    bar = "=" * 56
    print(f"\n{Fore.CYAN}{bar}")
    print(f"  WAVE {wave_num}/{total_waves}  --  "
          f"{len(task_ids)} task(s) running in parallel: {task_ids}")
    print(f"{bar}{Style.RESET_ALL}")


def wave_done(wave_num: int):
    print(f"{Fore.CYAN}  Wave {wave_num} complete.{Style.RESET_ALL}")


# ─── Task-level ───────────────────────────────────────────────────────────────

def task_start(task_id: str, task_type: str, provider: str, model: str):
    print(f"  {Fore.YELLOW}[{_ts()}] [START] TASK {task_id} "
          f"({task_type.upper()}) "
          f"-> MODEL {Fore.MAGENTA}{provider}/{model}{Style.RESET_ALL}")


def task_done(task_id: str, provider: str, model: str, tokens: dict, elapsed_ms: int):
    tok_in  = tokens.get("input", 0)
    tok_out = tokens.get("output", 0)
    print(f"  {Fore.GREEN}[{_ts()}] [OK] TASK {task_id} "
          f"-> {provider}/{model} "
          f"-> {tok_in}in/{tok_out}out tokens "
          f"-> {elapsed_ms}ms{Style.RESET_ALL}")


def task_retry(task_id: str, attempt: int, prev_model: str, err: str):
    print(f"  {Fore.RED}[{_ts()}] [RETRY] TASK {task_id} "
          f"RETRY #{attempt} (prev: {prev_model} failed: {err[:60]}){Style.RESET_ALL}")


def task_failed(task_id: str, err: str):
    print(f"  {Fore.RED}[{_ts()}] [FAIL] TASK {task_id} FAILED: {err[:100]}{Style.RESET_ALL}")


# ─── LLM router ──────────────────────────────────────────────────────────────

def llm_try(provider: str, model: str):
    print(f"    {Fore.CYAN}  -> Trying [{provider}] {model}...{Style.RESET_ALL}")


def llm_ok(provider: str, model: str, ms: int):
    print(f"    {Fore.GREEN}  [OK] [{provider}] {model} ({ms}ms){Style.RESET_ALL}")


def llm_fail(provider: str, model: str, err: str):
    print(f"    {Fore.RED}  [FAIL] [{provider}] {model}: {err[:80]}{Style.RESET_ALL}")


# ─── Generic ─────────────────────────────────────────────────────────────────

def info(msg: str):
    print(f"  {Fore.YELLOW}[{_ts()}] INFO: {msg}{Style.RESET_ALL}")


def error(msg: str):
    print(f"  {Fore.RED}[{_ts()}] ERROR: {msg}{Style.RESET_ALL}")


def section(title: str):
    print(f"\n{Fore.WHITE}--- {title} ---{Style.RESET_ALL}")
