"""Audit logging service."""
from typing import Optional, Any
from ..core.supabase import get_admin_client


async def log_action(
    user_id: str,
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    try:
        db = get_admin_client()
        db.table("audit_logs").insert({
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "metadata": metadata or {},
        }).execute()
    except Exception:
        pass  # Audit logging should never break the main flow
