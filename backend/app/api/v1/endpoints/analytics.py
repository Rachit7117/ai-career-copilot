"""Analytics dashboard data."""
from fastapi import APIRouter, Depends
from ....core.security import get_current_user
from ....core.supabase import get_admin_client

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def dashboard_analytics(user: dict = Depends(get_current_user)):
    db = get_admin_client()
    apps = db.table("job_applications").select("status,created_at,ats_score,overall_match_score").eq("user_id", user["id"]).execute().data or []

    total = len(apps)
    status_counts = {}
    for app in apps:
        s = app["status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    submitted = sum(status_counts.get(s, 0) for s in ["applied","screening","interview_scheduled","interview_r1","interview_r2","offer","rejected"])
    interviews = sum(status_counts.get(s, 0) for s in ["interview_scheduled","interview_r1","interview_r2"])
    offers = status_counts.get("offer", 0)
    rejections = status_counts.get("rejected", 0)

    scores = [a["ats_score"] for a in apps if a.get("ats_score")]
    avg_ats = round(sum(scores) / len(scores), 1) if scores else 0

    match_scores = [a["overall_match_score"] for a in apps if a.get("overall_match_score")]
    avg_match = round(sum(match_scores) / len(match_scores), 1) if match_scores else 0

    return {
        "total_applications": total,
        "submitted": submitted,
        "interviews": interviews,
        "offers": offers,
        "rejections": rejections,
        "interview_rate": round(interviews / submitted * 100, 1) if submitted else 0,
        "offer_rate": round(offers / submitted * 100, 1) if submitted else 0,
        "avg_ats_score": avg_ats,
        "avg_match_score": avg_match,
        "by_status": status_counts,
    }


@router.get("/audit-log")
async def audit_log(limit: int = 50, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    result = db.table("audit_logs").select("*").eq("user_id", user["id"]).order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/version-history/{entity_type}/{entity_id}")
async def version_history(entity_type: str, entity_id: str, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    result = db.table("version_history").select("id,version_number,diff_summary,created_at").eq("entity_type", entity_type).eq("entity_id", entity_id).eq("user_id", user["id"]).order("version_number", desc=True).execute()
    return result.data
