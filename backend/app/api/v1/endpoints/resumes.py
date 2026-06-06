"""Master Resume endpoints."""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from ....core.security import get_current_user
from ....core.supabase import get_admin_client
from ....services.resume_parser import extract_text, parse_resume
from ....services.audit import log_action

router = APIRouter(prefix="/resumes", tags=["resumes"])


class ResumeUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    parsed_content: Optional[dict] = None


@router.get("/")
async def list_resumes(user: dict = Depends(get_current_user)):
    db = get_admin_client()
    result = db.table("master_resumes").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return result.data


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_resume(
    name: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    file_bytes = await file.read()
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
    if ext not in ("pdf", "docx", "txt", "md"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX, TXT, or MD.")

    # Upload to Supabase Storage
    db = get_admin_client()
    storage_path = f"{user['id']}/{filename}"
    db.storage.from_("resumes").upload(storage_path, file_bytes, {"content-type": file.content_type or "application/octet-stream"})
    file_url = db.storage.from_("resumes").get_public_url(storage_path)

    # Extract and parse text
    raw_text = extract_text(file_bytes, ext)
    parsed = await parse_resume(user["id"], raw_text)

    # Insert record
    record = db.table("master_resumes").insert({
        "user_id": user["id"],
        "name": name,
        "file_url": file_url,
        "file_type": ext,
        "raw_content": raw_text[:50000],
        "parsed_content": parsed,
        "is_active": False,
    }).execute()

    await log_action(user["id"], "resume.uploaded", "master_resume", record.data[0]["id"])
    return record.data[0]


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    result = db.table("master_resumes").select("*").eq("id", resume_id).eq("user_id", user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    return result.data


@router.patch("/{resume_id}")
async def update_resume(resume_id: str, body: ResumeUpdate, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}

    # If setting as active, deactivate others first
    if update_data.get("is_active"):
        db.table("master_resumes").update({"is_active": False}).eq("user_id", user["id"]).execute()

    result = db.table("master_resumes").update(update_data).eq("id", resume_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    await log_action(user["id"], "resume.updated", "master_resume", resume_id)
    return result.data[0]


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(resume_id: str, user: dict = Depends(get_current_user)):
    db = get_admin_client()
    result = db.table("master_resumes").delete().eq("id", resume_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    await log_action(user["id"], "resume.deleted", "master_resume", resume_id)


@router.post("/{resume_id}/reparse")
async def reparse_resume(resume_id: str, user: dict = Depends(get_current_user)):
    """Re-run AI parsing on an existing resume's raw content."""
    db = get_admin_client()
    result = db.table("master_resumes").select("raw_content").eq("id", resume_id).eq("user_id", user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    parsed = await parse_resume(user["id"], result.data["raw_content"])
    updated = db.table("master_resumes").update({"parsed_content": parsed}).eq("id", resume_id).execute()
    return updated.data[0]
