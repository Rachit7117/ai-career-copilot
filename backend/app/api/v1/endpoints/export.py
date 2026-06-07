"""Export endpoints — PDF, DOCX, Markdown."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from ....core.security import get_current_user
from ....core.supabase import get_admin_client
from ....services.export_service import markdown_to_pdf, markdown_to_docx, cover_letter_to_pdf, cover_letter_to_docx

router = APIRouter(prefix="/export", tags=["export"])


class ExportRequest(BaseModel):
    entity_type: str   # tailored_resume | cover_letter | learning_roadmap
    entity_id: str
    format: str        # pdf | docx | md | txt


@router.post("/")
async def export_document(body: ExportRequest, user: dict = Depends(get_current_user)):
    db = get_admin_client()

    if body.entity_type == "tailored_resume":
        record = db.table("tailored_resumes").select("*").eq("id", body.entity_id).eq("user_id", user["id"]).single().execute().data
        if not record:
            raise HTTPException(status_code=404, detail="Resume not found")

        md = record.get("content_md") or ""
        if not md:
            raise HTTPException(status_code=400, detail="Resume has no content. Please regenerate it.")

        if body.format == "pdf":
            content = markdown_to_pdf(md)
            return Response(content=content, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="resume.pdf"'})
        elif body.format == "docx":
            content = markdown_to_docx(md)
            return Response(content=content, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": 'attachment; filename="resume.docx"'})
        elif body.format in ("md", "txt"):
            return Response(content=md.encode(), media_type="text/markdown", headers={"Content-Disposition": f'attachment; filename="resume.{body.format}"'})

    elif body.entity_type == "cover_letter":
        record = db.table("cover_letters").select("*").eq("id", body.entity_id).eq("user_id", user["id"]).single().execute().data
        if not record:
            raise HTTPException(status_code=404, detail="Cover letter not found")

        if body.format == "pdf":
            content = cover_letter_to_pdf(record["content"])
            return Response(content=content, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="cover_letter.pdf"'})
        elif body.format == "docx":
            content = cover_letter_to_docx(record["content"])
            return Response(content=content, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": 'attachment; filename="cover_letter.docx"'})
        elif body.format in ("md", "txt"):
            return Response(content=record["content"].encode(), media_type="text/plain", headers={"Content-Disposition": f'attachment; filename="cover_letter.{body.format}"'})

    raise HTTPException(status_code=400, detail="Invalid entity_type or format")
