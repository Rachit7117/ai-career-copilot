"""LiteLLM-based AI service — routes to user's preferred model or default Groq."""
import json
from typing import Any
import litellm
from ..core.config import settings
from ..core.security import decrypt_api_key
from ..core.supabase import get_admin_client

PROVIDER_MODEL_DEFAULTS = {
    "openai": "gpt-4o",
    "claude": "claude-opus-4-8",
    "gemini": "gemini/gemini-1.5-pro",
    "deepseek": "deepseek/deepseek-chat",
    "kimi": "openrouter/moonshot-v1-8k",
    "openrouter": "openrouter/openai/gpt-4o",
    "groq": "groq/llama-3.3-70b-versatile",
}


async def get_user_llm_config(user_id: str) -> dict:
    """Return the LiteLLM model + api_key to use for this user."""
    db = get_admin_client()
    result = db.table("user_api_keys").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    keys = result.data or []
    if not keys:
        return {"model": settings.DEFAULT_MODEL, "api_key": settings.GROQ_API_KEY}

    # Prefer non-groq providers if the user has connected one
    for key_row in keys:
        provider = key_row["provider"]
        if provider == "groq":
            continue
        try:
            plain_key = decrypt_api_key(key_row["encrypted_key"])
            model = key_row.get("model_override") or PROVIDER_MODEL_DEFAULTS.get(provider, "")
            return {"model": model, "api_key": plain_key}
        except Exception:
            continue

    # Fallback to groq user key or system key
    for key_row in keys:
        if key_row["provider"] == "groq":
            try:
                plain_key = decrypt_api_key(key_row["encrypted_key"])
                return {"model": settings.DEFAULT_MODEL, "api_key": plain_key}
            except Exception:
                break

    return {"model": settings.DEFAULT_MODEL, "api_key": settings.GROQ_API_KEY}


async def llm_complete(user_id: str, system: str, user: str, temperature: float = 0.3) -> str:
    """Single completion call with user's preferred model."""
    cfg = await get_user_llm_config(user_id)
    response = await litellm.acompletion(
        model=cfg["model"],
        api_key=cfg["api_key"],
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content


async def llm_json(user_id: str, system: str, user: str) -> Any:
    """Completion that returns parsed JSON. Works with all models (no response_format dependency)."""
    cfg = await get_user_llm_config(user_id)
    response = await litellm.acompletion(
        model=cfg["model"],
        api_key=cfg["api_key"],
        messages=[
            {"role": "system", "content": system + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation. Just raw JSON."},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
        max_tokens=4096,
    )
    raw = response.choices[0].message.content.strip()
    # Strip markdown code fences if the model wrapped in them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    return json.loads(raw)
