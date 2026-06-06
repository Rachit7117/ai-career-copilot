"""Parse uploaded resume files into structured JSON."""
import io
import json
from typing import Any
import pypdf
import docx
from .ai_service import llm_json

PARSE_SYSTEM = """You are a precise resume parser. Extract ONLY what is explicitly written in the resume.
Do NOT invent, infer, or add anything not present.

Return JSON matching this exact schema:
{
  "contact": {"name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "website": ""},
  "summary": "",
  "experience": [
    {
      "company": "", "title": "", "location": "", "start_date": "", "end_date": "",
      "current": false, "bullets": ["..."]
    }
  ],
  "education": [
    {"institution": "", "degree": "", "field": "", "graduation_date": "", "gpa": "", "honors": ""}
  ],
  "skills": {"technical": [], "tools": [], "languages": [], "soft": []},
  "certifications": [{"name": "", "issuer": "", "date": "", "expiry": ""}],
  "projects": [{"name": "", "description": "", "technologies": [], "url": "", "bullets": []}],
  "achievements": [],
  "publications": [],
  "volunteer": []
}"""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs)


def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="replace")


def extract_text(file_bytes: bytes, file_type: str) -> str:
    if file_type == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif file_type == "docx":
        return extract_text_from_docx(file_bytes)
    elif file_type in ("txt", "md"):
        return extract_text_from_txt(file_bytes)
    raise ValueError(f"Unsupported file type: {file_type}")


async def parse_resume(user_id: str, raw_text: str) -> dict[str, Any]:
    return await llm_json(user_id, PARSE_SYSTEM, f"Parse this resume:\n\n{raw_text[:12000]}")


JD_PARSE_SYSTEM = """You are a job description analyst. Extract structured data from the job description.

Return JSON:
{
  "required_skills": [],
  "preferred_skills": [],
  "required_tools": [],
  "keywords": [],
  "responsibilities": [],
  "seniority": "",
  "domain": "",
  "education_requirement": "",
  "years_of_experience": "",
  "must_haves": [],
  "nice_to_haves": []
}"""


async def parse_job_description(user_id: str, jd_text: str) -> dict[str, Any]:
    return await llm_json(user_id, JD_PARSE_SYSTEM, f"Parse this job description:\n\n{jd_text[:8000]}")
