"""
LLM Router — Python port of llm-router.service.js
Cascading fallback: tries models in priority order per task type.
Each provider call is fully async (httpx).
"""
import os, time, json
import httpx
from dotenv import load_dotenv
from . import logger as log
from .. import db

load_dotenv()

# ─── Priority order per task type ─────────────────────────────────────────────
TASK_PRIORITY: dict[str, list[str]] = {
    "planning":  ["google", "openai", "anthropic", "openrouter", "groq", "nvidia"],
    "reasoning": ["google", "openai", "anthropic", "openrouter", "groq", "nvidia"],
    "coding":    ["openai", "anthropic", "google", "openrouter", "groq", "nvidia"],
    "ui":        ["openai", "anthropic", "google", "openrouter", "groq", "nvidia"],
    "research":  ["google", "openai", "anthropic", "openrouter", "groq", "nvidia"],
    "fast":      ["groq", "google", "nvidia", "openrouter", "openai", "anthropic"],
    "general":   ["google", "openai", "anthropic", "groq", "nvidia", "openrouter"],
    "testing":   ["openai", "anthropic", "google", "openrouter", "groq", "nvidia"],
    "deployment":["openai", "anthropic", "google", "openrouter", "groq", "nvidia"],
    "writing":   ["google", "openai", "anthropic", "groq", "nvidia", "openrouter"],
    "analysis":  ["google", "openai", "anthropic", "openrouter", "groq", "nvidia"],
}

# ─── Preferred models within each provider ────────────────────────────────────
PREFERRED_MODELS: dict[str, list[str]] = {
    "google":     ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    "openai":     ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    "anthropic":  ["claude-opus-4-5", "claude-sonnet-4-5", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    "groq":       ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"],
    "nvidia":     ["meta/llama-3.1-70b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
    "openrouter": ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-pro-1.5"],
}

BASE_URLS = {
    "openai":     "https://api.openai.com/v1/chat/completions",
    "groq":       "https://api.groq.com/openai/v1/chat/completions",
    "nvidia":     "https://integrate.api.nvidia.com/v1/chat/completions",
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
}

API_KEYS = {
    "google":     lambda: os.getenv("GEMINI_API_KEY", ""),
    "openai":     lambda: os.getenv("OPENAI_API_KEY", ""),
    "anthropic":  lambda: os.getenv("ANTHROPIC_API_KEY", ""),
    "groq":       lambda: os.getenv("GROQ_API_KEY", ""),
    "nvidia":     lambda: os.getenv("NVIDIA_API_KEY", ""),
    "openrouter": lambda: os.getenv("OPENROUTER_API_KEY", ""),
}


# ─── Get best active model for a provider from DB ────────────────────────────
async def get_best_model_for_provider(provider: str, exclude: list[str] | None = None) -> dict | None:
    exclude = exclude or []
    preferred = PREFERRED_MODELS.get(provider, [])
    for model_name in preferred:
        if model_name in exclude:
            continue
        row = await db.fetchrow(
            "SELECT model_id, model_name, provider FROM models "
            "WHERE provider=$1 AND model_name=$2 AND is_active=true LIMIT 1",
            provider, model_name
        )
        if row:
            return dict(row)
    # Fallback: any active model from this provider not excluded
    placeholders = ",".join(f"${i+2}" for i in range(len(exclude))) if exclude else ""
    where_exclude = f"AND model_name NOT IN ({placeholders})" if exclude else ""
    row = await db.fetchrow(
        f"SELECT model_id, model_name, provider FROM models "
        f"WHERE provider=$1 AND is_active=true {where_exclude} "
        f"ORDER BY model_name ASC LIMIT 1",
        provider, *exclude
    )
    return dict(row) if row else None


# ─── Call a specific model ────────────────────────────────────────────────────
async def call_model(provider: str, model_name: str, messages: list[dict],
                     max_tokens: int = 4096, timeout: int = 60) -> dict:
    api_key = API_KEYS.get(provider, lambda: "")()
    if not api_key:
        raise ValueError(f"No API key for {provider}")

    # ── Google Gemini ─────────────────────────────────────────────────────────
    if provider == "google":
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
        contents = [
            {"role": ("model" if m["role"] == "assistant" else "user"),
             "parts": [{"text": m["content"]}]}
            for m in messages if m["role"] != "system"
        ]
        body: dict = {"contents": contents}
        if system_msg:
            body["systemInstruction"] = {"parts": [{"text": system_msg}]}
        url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
               f"{model_name}:generateContent?key={api_key}")
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=body)
        r.raise_for_status()
        text = (r.json().get("candidates", [{}])[0]
                  .get("content", {}).get("parts", [{}])[0].get("text", ""))
        if not text.strip():
            raise ValueError("Gemini returned empty response")
        return {"content": text, "tokens": {"input": 0, "output": 0}}

    # ── Anthropic ────────────────────────────────────────────────────────────
    if provider == "anthropic":
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msgs  = [m for m in messages if m["role"] != "system"]
        body = {"model": model_name, "max_tokens": max_tokens,
                "system": system_msg, "messages": user_msgs}
        headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01",
                   "content-type": "application/json"}
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post("https://api.anthropic.com/v1/messages",
                                  json=body, headers=headers)
        r.raise_for_status()
        data = r.json()
        text = data["content"][0]["text"]
        usage = data.get("usage", {})
        return {"content": text,
                "tokens": {"input": usage.get("input_tokens", 0),
                           "output": usage.get("output_tokens", 0)}}

    # ── OpenAI-compatible (openai, groq, nvidia, openrouter) ─────────────────
    body = {"model": model_name, "messages": messages, "max_tokens": max_tokens}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    url = BASE_URLS[provider]
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, json=body, headers=headers)
    r.raise_for_status()
    data = r.json()
    content = data["choices"][0]["message"]["content"] or ""
    if not content.strip():
        raise ValueError("Model returned empty response")
    usage = data.get("usage", {})
    return {"content": content,
            "tokens": {"input": usage.get("prompt_tokens", 0),
                       "output": usage.get("completion_tokens", 0)}}


# ─── Main entry: route with cascading fallback ────────────────────────────────
async def route_prompt(messages: list[dict], task_type: str = "general",
                       max_tokens: int = 4096,
                       exclude_models: list[str] | None = None) -> dict:
    """
    Routes prompt to best available model with cascading fallback.
    Returns: { content, model_name, provider, tokens, attempts }
    """
    provider_order = TASK_PRIORITY.get(task_type, TASK_PRIORITY["general"])
    exclude_models = exclude_models or []
    attempts = []

    for provider in provider_order:
        model = await get_best_model_for_provider(provider, exclude_models)
        if not model:
            continue

        model_name = model["model_name"]
        log.llm_try(provider, model_name)
        t0 = time.monotonic()
        try:
            result = await call_model(provider, model_name, messages, max_tokens)
            ms = int((time.monotonic() - t0) * 1000)
            log.llm_ok(provider, model_name, ms)
            attempts.append({"provider": provider, "modelName": model_name,
                             "status": "success", "latencyMs": ms})
            return {
                "content":    result["content"],
                "model_name": model_name,
                "provider":   provider,
                "tokens":     result["tokens"],
                "attempts":   attempts,
            }
        except Exception as e:
            ms = int((time.monotonic() - t0) * 1000)
            err = str(e)[:150]
            log.llm_fail(provider, model_name, err)
            attempts.append({"provider": provider, "modelName": model_name,
                             "status": "failed", "error": err, "latencyMs": ms})

            # Don't deactivate on rate limits
            if "429" not in err and "rate" not in err.lower():
                await db.execute(
                    "UPDATE models SET is_active=false WHERE provider=$1 AND model_name=$2",
                    provider, model_name
                )

    trace = "\n".join(f"  [{a['provider']}] {a['modelName']}: {a.get('error','OK')}"
                      for a in attempts)
    raise RuntimeError(f'All models failed for task_type="{task_type}".\n{trace}')
