"""Generate learning roadmaps for skill gaps."""
import json
from typing import Any
from .ai_service import llm_json

SYSTEM = """You are a senior learning & development expert. Create a practical learning roadmap.

For each skill gap, provide actionable resources. Focus on free/low-cost resources first.

Return JSON:
{
  "roadmap": [
    {
      "skill": "skill name",
      "why_it_matters": "specific reason for this role",
      "priority": "critical|high|medium|low",
      "estimated_effort": "e.g. 2 weeks part-time",
      "estimated_hours": 20,
      "learning_path": [
        {
          "step": 1,
          "title": "Start with fundamentals",
          "resources": [
            {
              "type": "youtube|documentation|course|article|book",
              "title": "resource title",
              "url": "",
              "description": "what you'll learn",
              "free": true,
              "estimated_time": "3 hours"
            }
          ]
        }
      ],
      "milestone": "what you can do after completing this",
      "how_to_demonstrate": "how to show this skill in interviews/resume"
    }
  ],
  "quick_wins": ["things to add to resume immediately based on existing knowledge"],
  "study_plan": {
    "week_1": [],
    "week_2": [],
    "week_3": [],
    "week_4": []
  },
  "total_estimated_hours": 0
}"""


async def generate_learning_roadmap(
    user_id: str,
    skill_gaps: dict[str, Any],
    company_name: str,
    job_title: str,
) -> dict[str, Any]:
    prompt = f"""SKILL GAPS IDENTIFIED:
{json.dumps(skill_gaps, indent=2)[:4000]}

TARGET ROLE: {job_title} at {company_name}

Create a practical, time-boxed learning roadmap to close these gaps.
Include real, specific resources (YouTube channels, official docs, Coursera/Udemy courses, etc.)."""

    return await llm_json(user_id, SYSTEM, prompt)
