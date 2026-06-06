"""Export tailored resumes and cover letters to PDF, DOCX, and Markdown."""
import io
from typing import Any
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib import colors


def resume_to_pdf(resume_data: dict[str, Any], markdown_content: str = "") -> bytes:
    """Generate PDF from structured resume data."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    story = []

    # Custom styles
    name_style = ParagraphStyle("Name", parent=styles["Normal"], fontSize=20, fontName="Helvetica-Bold", spaceAfter=4)
    contact_style = ParagraphStyle("Contact", parent=styles["Normal"], fontSize=9, textColor=colors.gray, spaceAfter=8)
    section_style = ParagraphStyle("Section", parent=styles["Normal"], fontSize=11, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=2)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, spaceAfter=2)
    bullet_style = ParagraphStyle("Bullet", parent=styles["Normal"], fontSize=10, leftIndent=12, spaceAfter=1)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold", spaceAfter=1)
    meta_style = ParagraphStyle("Meta", parent=styles["Normal"], fontSize=9, textColor=colors.gray, spaceAfter=2)

    c = resume_data.get("contact", {})

    # Name
    if c.get("name"):
        story.append(Paragraph(c["name"], name_style))

    # Contact line
    contact_parts = [p for p in [c.get("email"), c.get("phone"), c.get("location"), c.get("linkedin")] if p]
    if contact_parts:
        story.append(Paragraph(" | ".join(contact_parts), contact_style))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))

    # Summary
    if resume_data.get("summary"):
        story.append(Paragraph("SUMMARY", section_style))
        story.append(Paragraph(resume_data["summary"], body_style))

    # Experience
    if resume_data.get("experience"):
        story.append(Paragraph("EXPERIENCE", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        for exp in resume_data["experience"]:
            end = "Present" if exp.get("current") else exp.get("end_date", "")
            story.append(Paragraph(f"{exp.get('title', '')} — {exp.get('company', '')}", subtitle_style))
            story.append(Paragraph(f"{exp.get('start_date', '')} – {end} | {exp.get('location', '')}", meta_style))
            for bullet in exp.get("bullets", []):
                story.append(Paragraph(f"• {bullet}", bullet_style))
            story.append(Spacer(1, 4))

    # Education
    if resume_data.get("education"):
        story.append(Paragraph("EDUCATION", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        for edu in resume_data["education"]:
            story.append(Paragraph(f"{edu.get('degree', '')} in {edu.get('field', '')} — {edu.get('institution', '')}", subtitle_style))
            story.append(Paragraph(edu.get("graduation_date", ""), meta_style))

    # Skills
    skills = resume_data.get("skills", {})
    all_skills = []
    for v in skills.values():
        if isinstance(v, list):
            all_skills.extend(v)
    if all_skills:
        story.append(Paragraph("SKILLS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        story.append(Paragraph(", ".join(all_skills), body_style))

    # Certifications
    if resume_data.get("certifications"):
        story.append(Paragraph("CERTIFICATIONS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        for cert in resume_data["certifications"]:
            story.append(Paragraph(f"• {cert.get('name', '')} — {cert.get('issuer', '')} ({cert.get('date', '')})", bullet_style))

    # Projects
    if resume_data.get("projects"):
        story.append(Paragraph("PROJECTS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        for proj in resume_data["projects"]:
            story.append(Paragraph(proj.get("name", ""), subtitle_style))
            if proj.get("description"):
                story.append(Paragraph(proj["description"], body_style))
            for bullet in proj.get("bullets", []):
                story.append(Paragraph(f"• {bullet}", bullet_style))

    doc.build(story)
    return buffer.getvalue()


def cover_letter_to_pdf(content: str, candidate_name: str = "") -> bytes:
    """Generate PDF from cover letter text."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=inch, leftMargin=inch, topMargin=inch, bottomMargin=inch)
    styles = getSampleStyleSheet()
    body_style = ParagraphStyle("CL", parent=styles["Normal"], fontSize=11, leading=16, spaceAfter=12)
    story = []
    for para in content.split("\n\n"):
        if para.strip():
            story.append(Paragraph(para.strip().replace("\n", " "), body_style))
    doc.build(story)
    return buffer.getvalue()


def resume_to_docx(resume_data: dict[str, Any]) -> bytes:
    """Generate DOCX from structured resume data."""
    doc = Document()

    # Margins
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    c = resume_data.get("contact", {})

    # Name
    if c.get("name"):
        h = doc.add_heading(c["name"], 0)
        h.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in h.runs:
            run.font.size = Pt(20)

    # Contact
    contact_parts = [p for p in [c.get("email"), c.get("phone"), c.get("location"), c.get("linkedin")] if p]
    if contact_parts:
        p = doc.add_paragraph(" | ".join(contact_parts))
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(0x80, 0x80, 0x80)

    def add_section_header(title: str):
        h = doc.add_heading(title, level=2)
        for run in h.runs:
            run.font.size = Pt(11)

    if resume_data.get("summary"):
        add_section_header("Summary")
        doc.add_paragraph(resume_data["summary"])

    if resume_data.get("experience"):
        add_section_header("Experience")
        for exp in resume_data["experience"]:
            end = "Present" if exp.get("current") else exp.get("end_date", "")
            p = doc.add_paragraph()
            p.add_run(f"{exp.get('title', '')} — {exp.get('company', '')}").bold = True
            doc.add_paragraph(f"{exp.get('start_date', '')} – {end} | {exp.get('location', '')}").runs[0].font.size = Pt(9)
            for bullet in exp.get("bullets", []):
                doc.add_paragraph(bullet, style="List Bullet")

    if resume_data.get("education"):
        add_section_header("Education")
        for edu in resume_data["education"]:
            p = doc.add_paragraph()
            p.add_run(f"{edu.get('degree', '')} in {edu.get('field', '')} — {edu.get('institution', '')}").bold = True
            doc.add_paragraph(edu.get("graduation_date", "")).runs[0].font.size = Pt(9)

    skills = resume_data.get("skills", {})
    all_skills = []
    for v in skills.values():
        if isinstance(v, list):
            all_skills.extend(v)
    if all_skills:
        add_section_header("Skills")
        doc.add_paragraph(", ".join(all_skills))

    if resume_data.get("certifications"):
        add_section_header("Certifications")
        for cert in resume_data["certifications"]:
            doc.add_paragraph(f"{cert.get('name', '')} — {cert.get('issuer', '')} ({cert.get('date', '')})", style="List Bullet")

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def cover_letter_to_docx(content: str) -> bytes:
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1.25)
        section.right_margin = Inches(1.25)
    for para in content.split("\n\n"):
        if para.strip():
            doc.add_paragraph(para.strip())
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()
