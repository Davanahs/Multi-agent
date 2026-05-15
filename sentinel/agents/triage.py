"""
Sentinel – Triage Agent.

Fetches GitHub Actions workflow run logs and commit diffs, then calls
Claude to diagnose the failure.
"""

import os
import io
import json
import zipfile
import requests
import anthropic
from github import Github


def _fetch_workflow_logs(repo_full_name: str, run_id: int) -> str:
    """Download the workflow run logs zip from GitHub and extract text.
    Returns the last 6000 characters to stay within context limits."""

    token = os.environ.get("GITHUB_TOKEN")
    url = f"https://api.github.com/repos/{repo_full_name}/actions/runs/{run_id}/logs"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    resp = requests.get(url, headers=headers, allow_redirects=True, timeout=30)
    resp.raise_for_status()

    log_text = ""
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        for name in zf.namelist():
            with zf.open(name) as f:
                log_text += f.read().decode("utf-8", errors="replace")

    # Keep only the last 6000 characters
    return log_text[-6000:]


def _fetch_commit_diff(repo_full_name: str, run_id: int) -> str:
    """Get the diff of the head commit associated with the workflow run."""

    token = os.environ.get("GITHUB_TOKEN")
    g = Github(token)
    repo = g.get_repo(repo_full_name)

    # Get the workflow run to find the head SHA
    run = repo.get_workflow_run(run_id)
    head_sha = run.head_sha

    commit = repo.get_commit(head_sha)
    diff_url = commit.html_url + ".diff"

    headers = {"Authorization": f"token {token}"}
    resp = requests.get(diff_url, headers=headers, timeout=30)
    resp.raise_for_status()

    # Truncate large diffs
    return resp.text[:8000]


def triage_node(state: dict) -> dict:
    """Fetch logs and diff, then diagnose the failure with Claude."""

    print("\n[Triage] Fetching workflow logs and commit diff...")

    repo = state.get("repo", "")
    run_id = state.get("run_id")

    # Fetch logs
    try:
        logs = _fetch_workflow_logs(repo, run_id)
        print(f"    [Triage] Fetched {len(logs)} chars of logs")
    except Exception as exc:
        logs = f"(Could not fetch logs: {exc})"
        print(f"    [Triage] [WARN] Log fetch failed: {exc}")

    # Fetch diff
    try:
        diff = _fetch_commit_diff(repo, run_id)
        print(f"    [Triage] Fetched {len(diff)} chars of commit diff")
    except Exception as exc:
        diff = f"(Could not fetch diff: {exc})"
        print(f"    [Triage] [WARN] Diff fetch failed: {exc}")

    # Call Claude for diagnosis
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    prompt = f"""You are a senior CI/CD debugging expert.

Below are the last 6000 characters of a failed GitHub Actions workflow log
and the commit diff that triggered the failure.

=== WORKFLOW LOGS ===
{logs}

=== COMMIT DIFF ===
{diff}

Analyze the failure and respond with ONLY valid JSON:
{{
  "failing_test": "<name of the failing test or step>",
  "error_message": "<the core error message>",
  "root_cause": "<concise root cause analysis>",
  "relevant_files": ["<file1>", "<file2>"]
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text.strip()
    print(f"    [Triage] Claude diagnosis: {response_text[:200]}...")

    try:
        diagnosis = json.loads(response_text)
    except json.JSONDecodeError:
        diagnosis = {
            "failing_test": "unknown",
            "error_message": response_text[:500],
            "root_cause": "Could not parse LLM response",
            "relevant_files": [],
        }

    print(f"    [Triage] Root cause -> {diagnosis.get('root_cause', 'n/a')}")

    return {"logs": logs, "diagnosis": diagnosis}
