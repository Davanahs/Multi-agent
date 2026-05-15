"""
Sentinel – LangGraph pipeline definition.

Defines the SentinelState schema and wires five agent nodes into a
StateGraph with conditional routing from the orchestrator.
"""

from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END

from agents.orchestrator import orchestrator_node
from agents.triage import triage_node
from agents.research import research_node
from agents.coder import coder_node
from agents.comms import comms_node


# ── State schema ───────────────────────────────────────────────
class SentinelState(TypedDict):
    event_type: str
    repo: str
    run_id: Optional[int]
    logs: Optional[str]
    diagnosis: Optional[dict]
    fix_strategy: Optional[str]
    patch: Optional[str]
    test_passed: Optional[bool]
    pr_url: Optional[str]
    slack_sent: Optional[bool]


# ── Routing function ──────────────────────────────────────────
def route_after_orchestrator(state: SentinelState) -> str:
    """If the orchestrator classified the event as 'skip', stop early.
    Otherwise proceed through the full pipeline."""
    diagnosis = state.get("diagnosis", {})
    severity = diagnosis.get("severity", "skip") if isinstance(diagnosis, dict) else "skip"

    # The orchestrator stores its result in the diagnosis field temporarily
    # We check if it was marked skip
    if severity == "skip":
        return "skip"
    return "full"


# ── Build the graph ───────────────────────────────────────────
def build_graph() -> StateGraph:
    workflow = StateGraph(SentinelState)

    # Add nodes
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("triage", triage_node)
    workflow.add_node("research", research_node)
    workflow.add_node("coder", coder_node)
    workflow.add_node("comms", comms_node)

    # Entry point
    workflow.set_entry_point("orchestrator")

    # Conditional edge from orchestrator
    workflow.add_conditional_edges(
        "orchestrator",
        route_after_orchestrator,
        {
            "full": "triage",
            "skip": END,
        },
    )

    # Linear edges for the rest of the pipeline
    workflow.add_edge("triage", "research")
    workflow.add_edge("research", "coder")
    workflow.add_edge("coder", "comms")
    workflow.add_edge("comms", END)

    return workflow.compile()


# Compiled graph ready to invoke
sentinel_graph = build_graph()
