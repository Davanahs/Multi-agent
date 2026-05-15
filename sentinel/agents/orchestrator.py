from typing import Dict
from openai import OpenAI
import os
import json

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

def orchestrator_node(state: Dict):
    print("\n[Orchestrator] Running Groq AI...")

    event_type = state.get("event_type", "unknown")
    repo = state.get("repo", "unknown")

    prompt = f"""
You are an autonomous DevOps orchestrator.

GitHub event: {event_type}
Repository: {repo}

Return JSON only:

{{
  "severity": "low/medium/high",
  "next_agent": "research/coder/comms"
}}
"""

    response = client.chat.completions.create(
       model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    content = response.choices[0].message.content
    content = content.replace("```json", "").replace("```", "").strip()

    print("\n[LLM RESPONSE]")
    print(content)

    data = json.loads(content)

    state["severity"] = data["severity"]
    state["next_agent"] = data["next_agent"]

    return state