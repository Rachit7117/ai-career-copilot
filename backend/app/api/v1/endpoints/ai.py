"""AI generation endpoints — resume, cover letter, ATS, interview, roadmap."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from ....core.security import get_current_user
from ....core.supabase import get_admin_client
from ....services.resume_generator import generate_tailored_resume, resume_to_markdown
from ....services.cover_letter_generator import generate_cover_letter
from ....services.ats_analyzer import analyze_ats, analyze_skill_gap
from ....services.interview_kit_generator import generate_interview_kit
from ....services.learning_roadmap_generator import generate_learning_roadmap
from ....services.multi_jd_service import analyze_multi_jd
from ....services.audit import log_action

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_app_and_resume(db, app_id: str, user_id: str):
    app = db.table("job_applications").select("*, master_resumes(id,name,parsed_content,raw_content)").eq("id", app_id).eq("user_id", user_id).single().execute().data
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if not app.get("master_resumes") or not app["master_resumes"].get("parsed_content"):
        raise HTTPException(status_code=400, detail="Application has no master resume with parsed content. Upload and parse a resume first.")
    return app


class GenerateResumeRequest(BaseModel):
    application_id: str
    version_type: str = "ats"  # ats | recruiter | impact


class GenerateCoverLetterRequest(BaseModel):
    application_id: str


class ATSAnalysisRequest(BaseModel):
    application_id: str
    tailored_resume_id: Optional[str] = None


class InterviewKitRequest(BaseModel):
    application_id: str


class LearningRoadmapRequest(BaseModel):
    application_id: str


class MultiJDRequest(BaseModel):
    application_ids: list[str]
    master_resume_id: str


class RewriteRequest(BaseModel):
    application_id: str
    content: str
    instruction: str  # rewrite | expand | shorten | ats_optimize | improve_impact


@router.post("/generate-resume")
async def generate_resume(body: GenerateResumeRequest, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    app = _get_app_and_resume(db, body.application_id, user["id"])
    master = app["master_resumes"]["parsed_content"]
    jd_parsed = app.get("job_description_parsed") or {}

    tailored = await generate_tailored_resume(user["id"], master, jd_parsed, body.version_type)
    md_content = tailored["content_md"]

    # Version bump — set all existing current=False
    db.table("tailored_resumes").update({"is_current": False}).eq("application_id", body.application_id).eq("version_type", body.version_type).execute()

    # Count existing versions
    existing = db.table("tailored_resumes").select("version_number").eq("application_id", body.application_id).eq("version_type", body.version_type).order("version_number", desc=True).limit(1).execute().data
    next_version = (existing[0]["version_number"] + 1) if existing else 1

    record = db.table("tailored_resumes").insert({
        "user_id": user["id"],
        "application_id": body.application_id,
        "master_resume_id": app["master_resumes"]["id"],
        "version_type": body.version_type,
        "content": tailored,
        "content_md": md_content,
        "version_number": next_version,
        "is_current": True,
    }).execute().data[0]

    # Save version history
    db.table("version_history").insert({
        "user_id": user["id"],
        "entity_type": "tailored_resume",
        "entity_id": record["id"],
        "version_number": next_version,
        "content": {"content_md": md_content},
    }).execute()

    # Run ATS analysis automatically
    ats_result = await analyze_ats(user["id"], tailored, jd_parsed, app["job_description"])
    db.table("ats_analyses").insert({
        "user_id": user["id"],
        "application_id": body.application_id,
        "tailored_resume_id": record["id"],
        **{k: ats_result.get(k) for k in ["ats_score","skill_match_score","experience_match_score","overall_match_score","matched_keywords","missing_keywords","recommendations"]},
        "full_analysis": ats_result,
    }).execute()
    db.table("job_applications").update({
        "ats_score": ats_result.get("ats_score"),
        "skill_match_score": ats_result.get("skill_match_score"),
        "experience_match_score": ats_result.get("experience_match_score"),
        "overall_match_score": ats_result.get("overall_match_score"),
    }).eq("id", body.application_id).execute()

    await log_action(user["id"], "ai.resume_generated", "tailored_resume", record["id"], {"version_type": body.version_type})
    return {**record, "ats_analysis": ats_result}


@router.post("/generate-cover-letter")
async def generate_cover_letter_endpoint(body: GenerateCoverLetterRequest, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    app = _get_app_and_resume(db, body.application_id, user["id"])
    master = app["master_resumes"]["parsed_content"]

    content = await generate_cover_letter(
        user["id"],
        app["company_name"],
        app["job_title"],
        app["job_description"],
        master,
        app.get("hiring_manager_name", ""),
    )

    db.table("cover_letters").update({"is_current": False}).eq("application_id", body.application_id).execute()
    existing = db.table("cover_letters").select("version_number").eq("application_id", body.application_id).order("version_number", desc=True).limit(1).execute().data
    next_version = (existing[0]["version_number"] + 1) if existing else 1

    record = db.table("cover_letters").insert({
        "user_id": user["id"],
        "application_id": body.application_id,
        "content": content,
        "version_number": next_version,
        "is_current": True,
    }).execute().data[0]

    db.table("version_history").insert({
        "user_id": user["id"],
        "entity_type": "cover_letter",
        "entity_id": record["id"],
        "version_number": next_version,
        "content": {"content": content},
    }).execute()

    await log_action(user["id"], "ai.cover_letter_generated", "cover_letter", record["id"])
    return record


@router.post("/ats-analysis")
async def ats_analysis(body: ATSAnalysisRequest, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    app = _get_app_and_resume(db, body.application_id, user["id"])

    if body.tailored_resume_id:
        resume_data = db.table("tailored_resumes").select("content").eq("id", body.tailored_resume_id).eq("user_id", user["id"]).single().execute().data
        resume_content = resume_data["content"] if resume_data else app["master_resumes"]["parsed_content"]
    else:
        resume_content = app["master_resumes"]["parsed_content"]

    jd_parsed = app.get("job_description_parsed") or {}
    result = await analyze_ats(user["id"], resume_content, jd_parsed, app["job_description"])

    record = db.table("ats_analyses").insert({
        "user_id": user["id"],
        "application_id": body.application_id,
        "tailored_resume_id": body.tailored_resume_id,
        **{k: result.get(k) for k in ["ats_score","skill_match_score","experience_match_score","overall_match_score","matched_keywords","missing_keywords","recommendations"]},
        "full_analysis": result,
    }).execute().data[0]

    await log_action(user["id"], "ai.ats_analyzed", "ats_analysis", record["id"])
    return {**record, "full_analysis": result}


@router.post("/skill-gap")
async def skill_gap_analysis(body: ATSAnalysisRequest, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    app = _get_app_and_resume(db, body.application_id, user["id"])
    result = await analyze_skill_gap(user["id"], app["master_resumes"]["parsed_content"], app.get("job_description_parsed") or {})
    await log_action(user["id"], "ai.skill_gap_analyzed", "job_application", body.application_id)
    return result


@router.post("/interview-kit")
async def interview_kit(body: InterviewKitRequest, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    app = _get_app_and_resume(db, body.application_id, user["id"])

    result = await generate_interview_kit(
        user["id"],
        app["company_name"],
        app["job_title"],
        app["job_description"],
        app["master_resumes"]["parsed_content"],
        app.get("job_description_parsed") or {},
    )

    # Only include columns that exist in the interview_kits table
    valid_columns = {"recruiter_questions", "hiring_manager_questions", "technical_questions", "behavioral_questions", "case_questions", "star_stories"}
    db_payload = {k: v for k, v in result.items() if k in valid_columns}

    existing = db.table("interview_kits").select("id").eq("application_id", body.application_id).execute().data
    if existing:
        record = db.table("interview_kits").update(db_payload).eq("application_id", body.application_id).execute().data[0]
    else:
        record = db.table("interview_kits").insert({"user_id": user["id"], "application_id": body.application_id, **db_payload}).execute().data[0]

    # Return full result (including extra fields) to the frontend
    await log_action(user["id"], "ai.interview_kit_generated", "interview_kit", record["id"])
    return {**record, **result}


@router.post("/learning-roadmap")
async def learning_roadmap(body: LearningRoadmapRequest, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    app = _get_app_and_resume(db, body.application_id, user["id"])

    skill_gaps = await analyze_skill_gap(user["id"], app["master_resumes"]["parsed_content"], app.get("job_description_parsed") or {})
    roadmap = await generate_learning_roadmap(user["id"], skill_gaps, app["company_name"], app["job_title"])

    existing = db.table("learning_roadmaps").select("id").eq("application_id", body.application_id).execute().data
    payload = {"user_id": user["id"], "application_id": body.application_id, "skill_gaps": skill_gaps, "roadmap": roadmap}
    if existing:
        record = db.table("learning_roadmaps").update(payload).eq("application_id", body.application_id).execute().data[0]
    else:
        record = db.table("learning_roadmaps").insert(payload).execute().data[0]

    await log_action(user["id"], "ai.roadmap_generated", "learning_roadmap", record["id"])
    return record


@router.post("/multi-jd")
async def multi_jd(body: MultiJDRequest, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    master = db.table("master_resumes").select("parsed_content").eq("id", body.master_resume_id).eq("user_id", user["id"]).single().execute().data
    if not master or not master.get("parsed_content"):
        raise HTTPException(status_code=404, detail="Master resume not found or not parsed")

    applications = []
    for app_id in body.application_ids:
        app = db.table("job_applications").select("*").eq("id", app_id).eq("user_id", user["id"]).single().execute().data
        if app:
            applications.append(app)

    if len(applications) < 2:
        raise HTTPException(status_code=400, detail="Multi-JD analysis requires at least 2 applications")

    result = await analyze_multi_jd(user["id"], master["parsed_content"], applications)
    record = db.table("multi_jd_analyses").insert({
        "user_id": user["id"],
        "application_ids": body.application_ids,
        **result,
    }).execute().data[0]

    await log_action(user["id"], "ai.multi_jd_analyzed", metadata={"count": len(applications)})
    return record


@router.post("/rewrite")
async def rewrite_content(body: RewriteRequest, user: dict = Depends(get_current_user)):
    from ....services.ai_service import llm_complete

    instructions = {
        "rewrite": "Rewrite the following text to be clearer and more impactful. Preserve all factual content.",
        "expand": "Expand the following text with more detail. Do not add new factual claims — only elaborate on what's stated.",
        "shorten": "Shorten the following text while preserving all key information.",
        "ats_optimize": "Optimize the following text for ATS systems. Add relevant keywords from the job context if they genuinely match the content. Do not fabricate experience.",
        "improve_impact": "Rewrite with stronger action verbs and emphasize quantifiable impact. Do not invent metrics.",
    }
    instruction = instructions.get(body.instruction, instructions["rewrite"])
    result = await llm_complete(user["id"], instruction, body.content, temperature=0.4)
    await log_action(user["id"], f"ai.rewrite.{body.instruction}", "job_application", body.application_id)
    return {"result": result}
