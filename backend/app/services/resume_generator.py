"""Generate tailored resumes grounded in the master resume. Never fabricates."""
import json
from typing import Any
from .ai_service import llm_json

GROUNDING_NOTICE = """CRITICAL RULE: You are STRICTLY FORBIDDEN from inventing any:
- Companies, job titles, or employment history
- Skills, tools, or technologies not mentioned in the master resume
- Projects, certifications, or education
- Quantified metrics not present in the master resume
- Any experience or achievement

You may ONLY: rewrite, reorder, improve wording, surface relevant existing content, optimize for ATS keywords.
If the master resume does not contain something required by the JD — acknowledge the gap, do not fabricate."""

ATS_SYSTEM = f"""{GROUNDING_NOTICE}

Generate an ATS-optimized version of the resume for this job description.
- Mirror JD keywords exactly where the candidate has matching experience
- Use standard section headers (Experience, Education, Skills, etc.)
- Remove graphics-heavy formatting language
- Prioritize keyword density from the JD

Return JSON matching the master resume schema with the same fields."""

RECRUITER_SYSTEM = f"""{GROUNDING_NOTICE}

Generate a human-readable recruiter version of this resume.
- Lead with a strong, accurate summary tailored to the role
- Make bullets compelling and easy to scan
- Quantify achievements where numbers already exist in the master resume
- Highlight most relevant experience first

Return JSON matching the master resume schema."""

IMPACT_SYSTEM = f"""{GROUNDING_NOTICE}

Generate an impact-focused version emphasizing achievements and results.
- Surface the strongest achievement bullets from the master resume
- Use strong action verbs
- Highlight quantifiable results that already exist in the resume
- Focus on business impact

Return JSON matching the master resume schema."""


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
    prompt = f"""MASTER RESUME (source of truth):
{json.dumps(master_resume, indent=2)[:6000]}

JOB DESCRIPTION ANALYSIS:
{json.dumps(jd_parsed, indent=2)[:3000]}

Generate the {version_type.upper()} version of this resume tailored for this role.
Return ONLY the structured resume JSON."""

    return await llm_json(user_id, system, prompt)


async def resume_to_markdown(resume_data: dict[str, Any]) -> str:
    """Convert structured resume JSON to clean markdown."""
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

    if resume_data.get("projects"):
        lines.append("## Projects")
        for proj in resume_data["projects"]:
            lines.append(f"**{proj.get('name', '')}**")
            if proj.get("description"):
                lines.append(proj["description"])
            for bullet in proj.get("bullets", []):
                lines.append(f"- {bullet}")
            if proj.get("technologies"):
                lines.append(f"*Technologies: {', '.join(proj['technologies'])}*")
            lines.append("")

    return "\n".join(lines)
