"""
Sentinel – Comms Agent.

Creates a GitHub branch + PR with the patch, and posts an incident
summary to Slack's #incidents channel.
"""

import os
import base64
import anthropic
from github import Github
from slack_sdk import WebClient


def _create_pr(repo_name: str, patch: str, diagnosis: dict) -> str:
    """Create a new branch, apply the patch as a commit, and open a PR.
    Returns the PR URL."""

    token = os.environ.get("GITHUB_TOKEN")
    g = Github(token)
    repo = g.get_repo(repo_name)

    # Determine base branch
    default_branch = repo.default_branch
    base_ref = repo.get_git_ref(f"heads/{default_branch}")
    base_sha = base_ref.object.sha

    # Create a fix branch
    branch_name = f"sentinel/auto-fix-{base_sha[:8]}"
    try:
        repo.create_git_ref(
            ref=f"refs/heads/{branch_name}", sha=base_sha
        )
    except Exception:
        pass  # branch may already exist

    # For each file in the patch, we create/update via the Contents API.
    # This is a simplified approach: we commit the raw patch as a file
    # so reviewers can inspect and apply it.
    patch_path = "sentinel-fix.patch"
    try:
        existing = repo.get_contents(patch_path, ref=branch_name)
        repo.update_file(
            path=patch_path,
            message=f"fix: auto-generated patch for {diagnosis.get('failing_test', 'CI failure')}",
            content=patch,
            sha=existing.sha,
            branch=branch_name,
        )
    except Exception:
        repo.create_file(
            path=patch_path,
            message=f"fix: auto-generated patch for {diagnosis.get('failing_test', 'CI failure')}",
            content=patch,
            branch=branch_name,
        )

    # Open Pull Request
    failing = diagnosis.get("failing_test", "unknown test")
    root_cause = diagnosis.get("root_cause", "see patch")

    pr = repo.create_pull(
        title=f"🤖 Sentinel Auto-Fix: {failing}",
        body=(
            "## Automated Fix by Sentinel\n\n"
            f"**Failing test:** `{failing}`\n"
            f"**Root cause:** {root_cause}\n\n"
            "The attached `sentinel-fix.patch` contains the unified diff.\n"
            "Apply with: `git apply sentinel-fix.patch`\n"
        ),
        head=branch_name,
        base=default_branch,
    )

    return pr.html_url


def _post_slack(repo: str, diagnosis: dict, pr_url: str, test_passed: bool) -> bool:
    """Draft an incident message with Claude and post it to Slack."""

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    prompt = (
        "Write a concise Slack incident notification (max 6 lines) for:\n"
        f"- Repo: {repo}\n"
        f"- Failing test: {diagnosis.get('failing_test', 'unknown')}\n"
        f"- Root cause: {diagnosis.get('root_cause', 'unknown')}\n"
        f"- PR: {pr_url}\n"
        f"- Tests passed after fix: {test_passed}\n"
        "Use emoji for severity. Plain text, no markdown."
    )

    message = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    slack_text = message.content[0].text.strip()

    slack_token = os.environ.get("SLACK_BOT_TOKEN")
    slack = WebClient(token=slack_token)

    slack.chat_postMessage(channel="#incidents", text=slack_text)
    return True


def comms_node(state: dict) -> dict:
    """Create a PR and notify Slack."""

    print("\n[Comms] Creating PR and notifying Slack...")

    repo = state.get("repo", "")
    patch = state.get("patch", "")
    diagnosis = state.get("diagnosis", {})
    test_passed = state.get("test_passed", False)

    # Create PR
    pr_url = ""
    try:
        pr_url = _create_pr(repo, patch, diagnosis)
        print(f"    [Comms] PR created -> {pr_url}")
    except Exception as exc:
        print(f"    [Comms] [WARN] PR creation failed: {exc}")

    # Slack notification
    slack_sent = False
    try:
        slack_sent = _post_slack(repo, diagnosis, pr_url, test_passed)
        print("    [Comms] Slack notification sent [OK]")
    except Exception as exc:
        print(f"    [Comms] [WARN] Slack notification failed: {exc}")

    return {"pr_url": pr_url, "slack_sent": slack_sent}
