"""
LLM test router — POST /api/llm/test
Tests the LLM router with a given task type and returns which model responded.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from ..services_py import llm_router

router = APIRouter()


class LLMTestRequest(BaseModel):
    taskType: str = "general"
    prompt:   str = "Say hello in one sentence."
    maxTokens: int = 256


@router.post("/test")
async def test_llm(body: LLMTestRequest):
    result = await llm_router.route_prompt(
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user",   "content": body.prompt},
        ],
        task_type=body.taskType,
        max_tokens=body.maxTokens,
    )
    return {
        "success": True,
        "data": {
            "model":    f"{result['provider']}/{result['model_name']}",
            "provider": result["provider"],
            "model_name": result["model_name"],
            "content":  result["content"],
            "tokens":   result["tokens"],
            "attempts": result["attempts"],
        },
    }
