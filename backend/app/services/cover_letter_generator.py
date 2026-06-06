"""Generate tailored cover letters grounded in master resume."""
import json
from typing import Any
from .ai_service import llm_complete

SYSTEM = """You are an expert cover letter writer. Write a compelling, personalized cover letter.

STRICT RULES:
- Use ONLY experiences, skills, and achievements from the master resume provided
- Do NOT invent or fabricate any information
- Reference specific companies, roles, or projects only if they appear in the master resume
- Be specific and authentic, not generic
- Length: 3-4 paragraphs, professional tone
- Do NOT use the phrase "I am writing to apply" — be more direct and engaging
- Address the cover letter to the hiring manager if name is known, else "Hiring Team"

Structure:
1. Opening: Strong hook connecting candidate's specific background to this role
2. Body 1: Most relevant experience/achievement from resume that matches JD requirements
3. Body 2: Why this specific company and alignment with their mission/product
4. Closing: Clear call to action"""


async def generate_cover_letter(
    user_id: str,
    company_name: str,
    job_title: str,
    job_description: str,
    master_resume: dict[str, Any],
    hiring_manager: str = "",
) -> str:
    prompt = f"""MASTER RESUME (source of truth — use ONLY this):
{json.dumps(master_resume, indent=2)[:5000]}

JOB DETAILS:
Company: {company_name}
Title: {job_title}
Hiring Manager: {hiring_manager or "Unknown"}

JOB DESCRIPTION:
{job_description[:3000]}

Write a tailored cover letter using ONLY information from the master resume above."""

    return await llm_complete(user_id, SYSTEM, prompt, temperature=0.4)
