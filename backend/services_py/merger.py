"""
Result Merger — synthesizes all agent outputs into one final document.
"""
from . import llm_router, logger as log
from .. import db

MERGER_PROMPT = """You are a synthesis expert. You have received outputs from multiple AI agents that each completed a specific subtask.

Your job:
1. Synthesize all outputs into ONE coherent, well-structured final document
2. Remove redundancy but preserve all important information
3. Ensure logical flow from beginning to end
4. Use clear section headers
5. End with a brief executive summary

Produce a professional, complete document ready for the user."""


async def merge_results(workflow_id: str, task_outputs: dict[str, str]) -> str:
    log.section("Result Merger Agent")

    parts = "\n\n".join(
        f"=== Task {task_id} Output ===\n{output[:400] + '...' if len(output) > 400 else output}"
        for task_id, output in task_outputs.items()
        if output and not output.startswith("[FAILED]")
    )

    messages = [
        {"role": "system", "content": MERGER_PROMPT},
        {"role": "user",   "content":
            f"Please synthesize these agent outputs into a final document:\n\n{parts}"},
    ]

    result = await llm_router.route_prompt(messages, task_type="general", max_tokens=4096)
    model_label = f"{result['provider']}/{result['model_name']}"
    log.info(f"Merged by: {model_label}  ({result['tokens'].get('output', 0)} output tokens)")

    return result["content"]
