"""
Sentinel – Research Agent.

Searches for the error using Tavily, then calls Claude to formulate a
fix strategy based on the search results and the diagnosis.
"""

import os
import json
import anthropic
from tavily import TavilyClient


def research_node(state: dict) -> dict:
    """Search the web for the error and build a fix strategy."""

    print("\n[Research] Searching for the error online...")

    diagnosis = state.get("diagnosis", {})
    error_message = diagnosis.get("error_message", "CI pipeline failure")
    root_cause = diagnosis.get("root_cause", "")

    # ── Tavily search ──────────────────────────────────────────
    tavily = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))

    search_query = f"{error_message} {root_cause} fix"
    search_results = tavily.search(query=search_query, max_results=5)

    results_summary = []
    for i, result in enumerate(search_results.get("results", []), 1):
        title = result.get("title", "")
        url = result.get("url", "")
        snippet = result.get("content", "")[:300]
        results_summary.append(f"{i}. [{title}]({url})\n   {snippet}")
        print(f"    [Research] Result {i}: {title}")

    results_text = "\n\n".join(results_summary)

    # ── Claude fix strategy ────────────────────────────────────
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    prompt = f"""You are a senior software engineer.

A CI pipeline has failed with the following diagnosis:
- Failing test: {diagnosis.get('failing_test', 'unknown')}
- Error message: {error_message}
- Root cause: {root_cause}
- Relevant files: {json.dumps(diagnosis.get('relevant_files', []))}

Here are the top search results for fixing this error:

{results_text}

Based on the diagnosis and the search results, write a concise but
detailed fix strategy. The strategy should describe exactly what code
changes need to be made, in which files, and why.

Respond with plain text (no JSON).
"""

    message = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    fix_strategy = message.content[0].text.strip()
    print(f"    [Research] Fix strategy generated ({len(fix_strategy)} chars)")

    return {"fix_strategy": fix_strategy}
