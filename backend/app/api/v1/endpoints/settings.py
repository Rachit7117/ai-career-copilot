"""User settings — API key management."""
import litellm
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from ....core.security import get_current_user, encrypt_api_key, decrypt_api_key
from ....core.supabase import get_admin_client
from ....services.audit import log_action

router = APIRouter(prefix="/settings", tags=["settings"])

PROVIDER_TEST_MODELS = {
    "openai": "gpt-4o-mini",
    "claude": "claude-3-5-haiku-20241022",
    "gemini": "gemini/gemini-2.0-flash",
    "deepseek": "deepseek/deepseek-chat",
    "kimi": "openrouter/moonshot-v1-8k",
    "openrouter": "openrouter/openai/gpt-3.5-turbo",
    "groq": "groq/llama-3.1-8b-instant",
}


class ApiKeyCreate(BaseModel):
    provider: str
    api_key: str
    model_override: Optional[str] = None


class ApiKeyUpdate(BaseModel):
    is_active: Optional[bool] = None
    model_override: Optional[str] = None


@router.get("/api-keys")
async def list_api_keys(user: dict = Depends(get_current_user)):
    db = get_admin_client()
    result = db.table("user_api_keys").select("id,provider,key_hint,is_active,last_tested_at,test_status,model_override,created_at").eq("user_id", user["id"]).execute()
    return result.data


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def add_api_key(body: ApiKeyCreate, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    providers = ["openai","claude","gemini","deepseek","kimi","openrouter","groq"]
    if body.provider not in providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {providers}")

    encrypted = encrypt_api_key(body.api_key)
    hint = body.api_key[-4:] if len(body.api_key) >= 4 else "****"

    # Upsert
    existing = db.table("user_api_keys").select("id").eq("user_id", user["id"]).eq("provider", body.provider).execute().data
    if existing:
        record = db.table("user_api_keys").update({
            "encrypted_key": encrypted,
            "key_hint": hint,
            "model_override": body.model_override,
            "is_active": True,
        }).eq("user_id", user["id"]).eq("provider", body.provider).execute().data[0]
    else:
        record = db.table("user_api_keys").insert({
            "user_id": user["id"],
            "provider": body.provider,
            "encrypted_key": encrypted,
            "key_hint": hint,
            "model_override": body.model_override,
        }).execute().data[0]

    await log_action(user["id"], "settings.api_key_added", metadata={"provider": body.provider})
    return {k: record[k] for k in ["id","provider","key_hint","is_active","model_override","created_at"]}


@router.post("/api-keys/{key_id}/test")
async def test_api_key(key_id: str, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    record = db.table("user_api_keys").select("*").eq("id", key_id).eq("user_id", user["id"]).single().execute().data
    if not record:
        raise HTTPException(status_code=404, detail="API key not found")

    try:
        plain_key = decrypt_api_key(record["encrypted_key"])
        test_model = record.get("model_override") or PROVIDER_TEST_MODELS.get(record["provider"], "gpt-4o-mini")
        response = await litellm.acompletion(
            model=test_model,
            api_key=plain_key,
            messages=[{"role": "user", "content": "Say 'OK' in one word."}],
            max_tokens=5,
        )
        db.table("user_api_keys").update({"test_status": "success", "last_tested_at": "now()"}).eq("id", key_id).execute()
        return {"status": "success", "response": response.choices[0].message.content}
    except Exception as e:
        db.table("user_api_keys").update({"test_status": "failed", "last_tested_at": "now()"}).eq("id", key_id).execute()
        return {"status": "failed", "error": str(e)}


@router.patch("/api-keys/{key_id}")
async def update_api_key(key_id: str, body: ApiKeyUpdate, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    result = db.table("user_api_keys").update(update).eq("id", key_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="API key not found")
    return result.data[0]


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(key_id: str, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    record = db.table("user_api_keys").select("provider").eq("id", key_id).eq("user_id", user["id"]).single().execute().data
    db.table("user_api_keys").delete().eq("id", key_id).eq("user_id", user["id"]).execute()
    if record:
        await log_action(user["id"], "settings.api_key_deleted", metadata={"provider": record["provider"]})
