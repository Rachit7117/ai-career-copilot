"""Job Application CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import date
from ....core.security import get_current_user
from ....core.supabase import get_admin_client
from ....services.resume_parser import parse_job_description
from ....services.audit import log_action

router = APIRouter(prefix="/applications", tags=["applications"])

VALID_STATUSES = ["draft","ready","applied","screening","interview_scheduled","interview_r1","interview_r2","offer","rejected","withdrawn"]


class ApplicationCreate(BaseModel):
    company_name: str
    job_title: str
    job_description: str
    job_url: Optional[str] = None
    master_resume_id: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_linkedin: Optional[str] = None
    hiring_manager_name: Optional[str] = None
    location: Optional[str] = None
    compensation_range: Optional[str] = None
    application_deadline: Optional[date] = None
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    job_url: Optional[str] = None
    master_resume_id: Optional[str] = None
    status: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_linkedin: Optional[str] = None
    hiring_manager_name: Optional[str] = None
    location: Optional[str] = None
    compensation_range: Optional[str] = None
    application_deadline: Optional[date] = None
    notes: Optional[str] = None


@router.get("/")
async def list_applications(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    db = get_admin_client()
    query = db.table("job_applications").select("*, master_resumes(name)").eq("user_id", user["id"])
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_application(body: ApplicationCreate, user: dict = Depends(get_current_user)):
    db = get_admin_client()

    # Auto-parse job description
    jd_parsed = await parse_job_description(user["id"], body.job_description)

    data = body.model_dump()
    data["user_id"] = user["id"]
    data["job_description_parsed"] = jd_parsed
    if data.get("application_deadline"):
        data["application_deadline"] = str(data["application_deadline"])

    result = db.table("job_applications").insert(data).execute()
    app = result.data[0]
    await log_action(user["id"], "application.created", "job_application", app["id"])
    return app


@router.get("/{app_id}")
async def get_application(app_id: str, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    result = (
        db.table("job_applications")
        .select("*, master_resumes(id, name, parsed_content)")
        .eq("id", app_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data


@router.patch("/{app_id}")
async def update_application(app_id: str, body: ApplicationUpdate, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}

    if "status" in update_data and update_data["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")

    if update_data.get("application_deadline"):
        update_data["application_deadline"] = str(update_data["application_deadline"])

    # Re-parse JD if it changed
    if "job_description" in update_data:
        update_data["job_description_parsed"] = await parse_job_description(user["id"], update_data["job_description"])

    result = db.table("job_applications").update(update_data).eq("id", app_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    await log_action(user["id"], "application.updated", "job_application", app_id, {"changes": list(update_data.keys())})
    return result.data[0]


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(app_id: str, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    result = db.table("job_applications").delete().eq("id", app_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    await log_action(user["id"], "application.deleted", "job_application", app_id)


@router.get("/{app_id}/full")
async def get_application_full(app_id: str, user: dict = Depends(get_current_user)):
    """Return application with all related data."""
    db = get_admin_client()
    app = db.table("job_applications").select("*, master_resumes(id,name,parsed_content)").eq("id", app_id).eq("user_id", user["id"]).single().execute().data
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    tailored = db.table("tailored_resumes").select("*").eq("application_id", app_id).eq("is_current", True).execute().data
    cover = db.table("cover_letters").select("*").eq("application_id", app_id).eq("is_current", True).execute().data
    ats = db.table("ats_analyses").select("*").eq("application_id", app_id).order("created_at", desc=True).limit(1).execute().data
    interview = db.table("interview_kits").select("*").eq("application_id", app_id).execute().data
    roadmap = db.table("learning_roadmaps").select("*").eq("application_id", app_id).execute().data

    return {
        **app,
        "tailored_resumes": tailored,
        "cover_letters": cover,
        "ats_analysis": ats[0] if ats else None,
        "interview_kit": interview[0] if interview else None,
        "learning_roadmap": roadmap[0] if roadmap else None,
    }
