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

MARKDOWN_STRUCTURE = """
Use EXACTLY this markdown structure (Harvard Resume Format):

```
# FULL NAME
email | phone | location | linkedin_url

## SUMMARY
2-3 line summary tailored to the role.

## EXPERIENCE

**Job Title**
*Company Name | Start Date – End Date | Location*
- Achievement bullet starting with action verb
- Achievement bullet with quantified result

**Job Title**
*Company Name | Start Date – End Date | Location*
- Achievement bullet

## EDUCATION

**Degree in Field**
*Institution | Graduation Year*

## SKILLS
Skill 1, Skill 2, Skill 3, Skill 4 (comma-separated on ONE line per category)

## CERTIFICATIONS
- Certification Name — Issuer (Date)
```

CRITICAL FORMATTING RULES:
- Name must be on line 1 as `# NAME`
- Contact on line 2 as plain text with | separators
- Job titles in **bold** on their own line
- Company/date/location in *italics* on the next line
- Bullets use `-` prefix
- Skills on ONE line, comma-separated (not one per line)
- NO asterisks (*) for bullets — use only `-`
- NO nested bullets
"""

ATS_SYSTEM = f"""{GROUNDING_NOTICE}

You are an ATS optimization expert. Generate a keyword-rich resume.

RULES:
- Use EXACT keywords from the job description where candidate has matching experience
- Mirror JD language in bullets and summary
- Standard sections: Summary, Experience, Skills, Education, Certifications
- Bullet points start with strong action verbs
- Skills section: group by category on separate lines, comma-separated

{MARKDOWN_STRUCTURE}"""

RECRUITER_SYSTEM = f"""{GROUNDING_NOTICE}

You are a professional resume writer creating a compelling, human-readable resume.

RULES:
- Write a strong narrative summary (3-4 lines) tailored to the specific role and company
- Lead every bullet with the RESULT, then the action (e.g., "Drove 40% retention improvement by...")
- Highlight most RELEVANT experience for this specific role
- Make it feel personal and compelling, not robotic

{MARKDOWN_STRUCTURE}"""

IMPACT_SYSTEM = f"""{GROUNDING_NOTICE}

You are a C-suite resume coach focused on business impact and achievements.

RULES:
- Add a "## KEY ACHIEVEMENTS" section right after Summary with top 3 wins
- Every bullet = quantified result + action + context
- Format: "Scaled [X] from [A] to [B] by [action], generating [impact]"
- Use power verbs: Scaled, Generated, Drove, Transformed, Accelerated
- Cut all "responsible for" — only achievements count

{MARKDOWN_STRUCTURE}"""


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

    content_md = content_md.strip()

    # Always rebuild the name + contact header from master_resume to guarantee correct format
    contact = master_resume.get("contact", {})
    name = contact.get("name", "")
    parts = [p for p in [contact.get("email"), contact.get("phone"), contact.get("location"), contact.get("linkedin")] if p]

    if name:
        # Strip any existing # header line(s) the AI may have generated (could be malformed)
        import re as _re
        # Remove leading # lines + any contact-looking line right after
        content_md = _re.sub(r'^#[^\n]*\n[^\n#]*\n*', '', content_md).strip()
        contact_line = " | ".join(parts) if parts else ""
        header = f"# {name}\n{contact_line}\n\n" if contact_line else f"# {name}\n\n"
        content_md = header + content_md

    # Fix skills section: collapse bullet lists into comma-separated line
    import re
    def collapse_skills(md: str) -> str:
        lines = md.split("\n")
        result = []
        in_skills = False
        skill_bullets = []
        for line in lines:
            if re.match(r'^## (SKILLS?|Technical Skills?|Core Competencies)', line, re.I):
                in_skills = True
                result.append(line)
                continue
            if in_skills:
                if line.startswith("## "):
                    if skill_bullets:
                        result.append(", ".join(skill_bullets))
                        result.append("")
                        skill_bullets = []
                    in_skills = False
                    result.append(line)
                elif line.startswith("- ") or line.startswith("* "):
                    skill_bullets.append(line[2:].strip())
                elif line.strip() == "" and skill_bullets:
                    continue
                else:
                    result.append(line)
            else:
                result.append(line)
        if skill_bullets:
            result.append(", ".join(skill_bullets))
        return "\n".join(result)

    content_md = collapse_skills(content_md)

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
