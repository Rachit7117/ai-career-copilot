"""Multi-JD analysis — compare multiple job descriptions against the master resume."""
import json
from typing import Any
from .ai_service import llm_json

SYSTEM = """You are a career strategist analyzing multiple job opportunities for a candidate.

Return JSON:
{
  "opportunity_ranking": [
    {
      "application_id": "",
      "company_name": "",
      "job_title": "",
      "rank": 1,
      "overall_fit_score": 0-100,
      "reasoning": "",
      "pros": [],
      "cons": []
    }
  ],
  "common_skill_gaps": [
    {"skill": "", "appears_in_n_roles": 0, "importance": "critical|high|medium|low"}
  ],
  "common_keywords": ["keyword appearing in multiple JDs"],
  "resume_improvements": [
    {
      "area": "summary|experience|skills|education",
      "suggestion": "",
      "impact": "would improve fit for N roles",
      "priority": "critical|high|medium|low"
    }
  ],
  "strategic_recommendation": "paragraph with strategic advice on which roles to prioritize"
}"""


async def analyze_multi_jd(
    user_id: str,
    master_resume: dict[str, Any],
    applications: list[dict[str, Any]],
) -> dict[str, Any]:
    apps_summary = []
    for app in applications:
        apps_summary.append({
            "application_id": app.get("id"),
            "company_name": app.get("company_name"),
            "job_title": app.get("job_title"),
            "jd_parsed": app.get("job_description_parsed", {}),
            "ats_score": app.get("ats_score"),
            "overall_match_score": app.get("overall_match_score"),
        })

    prompt = f"""MASTER RESUME:
{json.dumps(master_resume, indent=2)[:4000]}

JOB APPLICATIONS ({len(applications)} total):
{json.dumps(apps_summary, indent=2)[:5000]}

Analyze all opportunities and provide strategic multi-JD analysis."""

    return await llm_json(user_id, SYSTEM, prompt)
