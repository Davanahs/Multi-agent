"""
Sentinel – Coder Agent.

Calls Claude to write a unified diff patch, applies it inside an E2B
sandbox, runs pytest on the failing test, and reports the result.
"""

import os
import json
import anthropic
from e2b_code_interpreter import Sandbox


def coder_node(state: dict) -> dict:
    """Generate a patch, test it in a sandbox, and return the result."""

    print("\n[Coder] Generating patch with Claude...")

    diagnosis = state.get("diagnosis", {})
    fix_strategy = state.get("fix_strategy", "")
    logs = state.get("logs", "")
    repo = state.get("repo", "")

    failing_test = diagnosis.get("failing_test", "")
    relevant_files = diagnosis.get("relevant_files", [])

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    prompt = (
        "You are a senior software engineer. Write a minimal unified diff "
        "patch that fixes a CI failure.\n\n"
        f"Repository: {repo}\n"
        f"Failing test: {failing_test}\n"
        f"Relevant files: {json.dumps(relevant_files)}\n\n"
        f"=== FIX STRATEGY ===\n{fix_strategy}\n\n"
        f"=== RECENT LOGS ===\n{(logs or '')[-3000:]}\n\n"
        "Respond ONLY with the unified diff. No markdown fences."
    )

    message = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    patch = message.content[0].text.strip()
    print(f"    [Coder] Patch generated ({len(patch)} chars)")

    print("    [Coder] Spinning up E2B sandbox …")
    test_passed = False

    try:
        sbx = Sandbox(api_key=os.environ.get("E2B_API_KEY"))
        sbx.commands.run(
            f"git clone https://github.com/{repo}.git /repo", timeout=60
        )
        sbx.files.write("/repo/fix.patch", patch)

        apply_res = sbx.commands.run(
            "cd /repo && git apply fix.patch", timeout=30
        )
        print(f"    [Coder] Patch apply exit_code={apply_res.exit_code}")

        if apply_res.exit_code == 0:
            sbx.commands.run(
                "cd /repo && pip install -r requirements.txt 2>/dev/null || true",
                timeout=120,
            )
            test_res = sbx.commands.run(
                f"cd /repo && python -m pytest {failing_test} -x -v",
                timeout=120,
            )
            print(f"    [Coder] pytest exit_code={test_res.exit_code}")
            test_passed = test_res.exit_code == 0
        else:
            print(f"    [Coder] [WARN] Patch apply failed")

        sbx.kill()
    except Exception as exc:
        print(f"    [Coder] [WARN] Sandbox error: {exc}")

    status = "PASSED" if test_passed else "FAILED"
    print(f"    [Coder] Test result -> {status}")

    return {"patch": patch, "test_passed": test_passed}
