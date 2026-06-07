"""ATS keyword analysis and scoring."""
import json
from typing import Any
from .ai_service import llm_json

ATS_SYSTEM = """You are an ATS (Applicant Tracking System) expert analyzer.
Analyze how well the resume matches the job description.

Return JSON:
{
  "ats_score": 0-100,
  "skill_match_score": 0-100,
  "experience_match_score": 0-100,
  "overall_match_score": 0-100,
  "matched_keywords": ["keyword1", ...],
  "missing_keywords": ["keyword1", ...],
  "matched_skills": ["skill1", ...],
  "missing_skills": ["skill1", ...],
  "recommendations": ["specific actionable recommendation", ...],
  "keyword_density_analysis": {"keyword": "found|missing", ...},
  "section_scores": {
    "summary": 0-100,
    "experience": 0-100,
    "skills": 0-100,
    "education": 0-100
  },
  "ats_compatibility_issues": ["issue1", ...]
}"""


async def analyze_ats(
    user_id: str,
    resume_content: dict[str, Any],
    jd_parsed: dict[str, Any],
    job_description_raw: str,
) -> dict[str, Any]:
    # Handle both markdown string and dict formats
    if isinstance(resume_content, dict) and "content_md" in resume_content:
        resume_text = resume_content["content_md"][:5000]
    elif isinstance(resume_content, str):
        resume_text = resume_content[:5000]
    else:
        resume_text = json.dumps(resume_content, indent=2)[:5000]

    prompt = f"""RESUME:
{resume_text}

JOB DESCRIPTION (raw):
{job_description_raw[:3000]}

JOB DESCRIPTION (parsed):
{json.dumps(jd_parsed, indent=2)[:2000]}

Perform comprehensive ATS analysis."""

    return await llm_json(user_id, ATS_SYSTEM, prompt)


SKILL_GAP_SYSTEM = """You are a skill gap analyst. Compare the candidate's resume against the job requirements.
Only identify REAL gaps — skills not present in the resume. Do NOT fabricate gaps or requirements.

Return JSON:
{
  "missing_skills": [{"skill": "", "importance": "critical|high|medium|low", "reason": ""}],
  "missing_tools": [{"tool": "", "importance": "critical|high|medium|low", "reason": ""}],
  "missing_concepts": [{"concept": "", "importance": "critical|high|medium|low"}],
  "missing_responsibilities": [{"responsibility": "", "importance": "critical|high|medium|low"}],
  "transferable_strengths": ["strength that maps well to this role"],
  "gap_summary": "brief paragraph"
}"""


async def analyze_skill_gap(
    user_id: str,
    master_resume: dict[str, Any],
    jd_parsed: dict[str, Any],
) -> dict[str, Any]:
    prompt = f"""MASTER RESUME (what the candidate has):
{json.dumps(master_resume, indent=2)[:5000]}

JOB REQUIREMENTS (what the role needs):
{json.dumps(jd_parsed, indent=2)[:3000]}

Identify real skill gaps."""

    return await llm_json(user_id, SKILL_GAP_SYSTEM, prompt)
