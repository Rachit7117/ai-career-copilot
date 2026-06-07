"""Generate tailored resumes grounded in the master resume. Never fabricates."""
import json
from typing import Any
from .ai_service import llm_complete, llm_json

GROUNDING_NOTICE = """CRITICAL RULE — STRICTLY FORBIDDEN:
- Inventing companies, job titles, or employment history
- Adding skills, tools, or technologies not in the master resume
- Creating projects, certifications, or education not listed
- Fabricating metrics, numbers, or quantified results
- Any experience or achievement not present in the source resume

ALLOWED: Rewrite wording, reorder bullets, surface relevant existing content, optimize phrasing."""

ATS_SYSTEM = f"""{GROUNDING_NOTICE}

You are an ATS optimization expert. Generate a clean, keyword-rich resume in MARKDOWN format.

RULES:
- Use EXACT keywords from the job description where the candidate has matching experience
- Standard section headers: Summary, Experience, Skills, Education, Certifications
- Bullet points start with strong action verbs (Led, Built, Drove, Scaled, etc.)
- Include only skills/tools explicitly mentioned in the master resume
- Optimize for ATS parsers: no tables, no columns, clean formatting
- Summary should be 2-3 lines with role title + top 3 matching strengths

Output clean markdown only. No JSON. No explanation."""

RECRUITER_SYSTEM = f"""{GROUNDING_NOTICE}

You are a professional resume writer. Generate a compelling, human-readable resume in MARKDOWN format.

RULES:
- Write a strong narrative summary (3-4 lines) tailored to the specific role and company
- Make every bullet scannable and impactful — lead with the result, then the action
- Highlight the most RELEVANT experience prominently for this role
- Group skills meaningfully (not just a flat list)
- Add a "Why [Company]" or "Career Highlight" callout if the resume has strong relevant wins
- Make it feel personal and compelling, not robotic

Output clean markdown only. No JSON. No explanation."""

IMPACT_SYSTEM = f"""{GROUNDING_NOTICE}

You are a C-suite resume coach focused on business impact. Generate an achievement-driven resume in MARKDOWN format.

RULES:
- Every bullet must start with a quantified result if numbers exist in the master resume
  Format: "Drove [RESULT] by [ACTION] — [CONTEXT]"
- Surface the TOP 3 career achievements in a dedicated "Key Achievements" section at the top
- Use power verbs: Scaled, Generated, Drove, Transformed, Reduced, Accelerated
- Cut anything that isn't an achievement — no "responsible for" or "worked on"
- Prioritize business impact: revenue, growth, efficiency, user numbers, cost savings

Output clean markdown only. No JSON. No explanation."""


async def generate_tailored_resume(
    user_id: str,
    master_resume: dict[str, Any],
    jd_parsed: dict[str, Any],
    version_type: str,
) -> dict[str, Any]:
    system_prompts = {
        "ats": ATS_SYSTEM,
        "recruiter": RECRUITER_SYSTEM,
        "impact": IMPACT_SYSTEM,
    }
    system = system_prompts.get(version_type, ATS_SYSTEM)

    prompt = f"""MASTER RESUME (source of truth — do not fabricate beyond this):
{json.dumps(master_resume, indent=2)[:6000]}

JOB DESCRIPTION ANALYSIS:
{json.dumps(jd_parsed, indent=2)[:2000]}

Generate the {version_type.upper()} version of this resume tailored for this specific role.
Remember: output clean markdown only."""

    content_md = await llm_complete(user_id, system, prompt, temperature=0.2)

    # Clean up any accidental code fences
    if content_md.strip().startswith("```"):
        lines = content_md.strip().split("\n")
        content_md = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    return {"content_md": content_md, "version_type": version_type}


async def resume_to_markdown(resume_data: dict[str, Any]) -> str:
    """Convert structured resume JSON to clean markdown (legacy fallback)."""
    c = resume_data.get("contact", {})
    lines = []

    name = c.get("name", "")
    if name:
        lines.append(f"# {name}")
    contact_parts = [p for p in [c.get("email"), c.get("phone"), c.get("location"), c.get("linkedin")] if p]
    if contact_parts:
        lines.append(" | ".join(contact_parts))
    lines.append("")

    if resume_data.get("summary"):
        lines += ["## Summary", resume_data["summary"], ""]

    if resume_data.get("experience"):
        lines.append("## Experience")
        for exp in resume_data["experience"]:
            end = "Present" if exp.get("current") else exp.get("end_date", "")
            lines.append(f"**{exp.get('title', '')}** — {exp.get('company', '')}")
            lines.append(f"*{exp.get('start_date', '')} – {end}* | {exp.get('location', '')}")
            for bullet in exp.get("bullets", []):
                lines.append(f"- {bullet}")
            lines.append("")

    if resume_data.get("education"):
        lines.append("## Education")
        for edu in resume_data["education"]:
            lines.append(f"**{edu.get('degree', '')}** in {edu.get('field', '')} — {edu.get('institution', '')}")
            lines.append(f"*{edu.get('graduation_date', '')}*")
            lines.append("")

    skills = resume_data.get("skills", {})
    all_skills = []
    for category, skill_list in skills.items():
        if skill_list:
            all_skills.extend(skill_list)
    if all_skills:
        lines += ["## Skills", ", ".join(all_skills), ""]

    if resume_data.get("certifications"):
        lines.append("## Certifications")
        for cert in resume_data["certifications"]:
            lines.append(f"- **{cert.get('name', '')}** — {cert.get('issuer', '')} ({cert.get('date', '')})")
        lines.append("")

    return "\n".join(lines)
