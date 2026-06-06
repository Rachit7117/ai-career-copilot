"""Generate interview preparation kits grounded in real resume experience."""
import json
from typing import Any
from .ai_service import llm_json

SYSTEM = """You are an elite interview coach. Generate a comprehensive interview kit.

CRITICAL: STAR stories must be based EXCLUSIVELY on experiences from the master resume.
Do NOT invent situations, actions, or results. If the resume lacks a specific experience,
note "insufficient information in resume" rather than fabricating.

Return JSON:
{
  "recruiter_questions": [
    {"question": "", "guidance": "", "key_points": []}
  ],
  "hiring_manager_questions": [
    {"question": "", "guidance": "", "key_points": []}
  ],
  "technical_questions": [
    {"question": "", "topic_area": "", "guidance": "", "ideal_answer_framework": ""}
  ],
  "behavioral_questions": [
    {"question": "", "competency": "", "guidance": ""}
  ],
  "case_questions": [
    {"question": "", "framework": "", "guidance": ""}
  ],
  "star_stories": [
    {
      "situation": "exact situation from resume",
      "task": "specific task candidate faced",
      "action": "actions taken based on resume",
      "result": "outcome from resume",
      "applicable_questions": ["question themes this story fits"],
      "resume_source": "which experience this comes from"
    }
  ],
  "company_research_questions": ["questions to ask the interviewer"],
  "salary_negotiation_tips": ["tip based on role and location"]
}"""


async def generate_interview_kit(
    user_id: str,
    company_name: str,
    job_title: str,
    job_description: str,
    master_resume: dict[str, Any],
    jd_parsed: dict[str, Any],
) -> dict[str, Any]:
    prompt = f"""MASTER RESUME (experiences to draw from):
{json.dumps(master_resume, indent=2)[:5000]}

JOB DETAILS:
Company: {company_name}
Title: {job_title}

JOB DESCRIPTION:
{job_description[:2000]}

JD ANALYSIS:
{json.dumps(jd_parsed, indent=2)[:2000]}

Generate a comprehensive interview preparation kit. STAR stories must only use real resume experiences."""

    return await llm_json(user_id, SYSTEM, prompt)
