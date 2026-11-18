"""
Module: backend.core.report_generator
Purpose: Generates official PDF Cohort Cognitive Dependency reports using ReportLab.

Features:
  - Cohort CDS summary and risk distribution
  - High-risk student dependency roster
  - Pedagogical recommendations for instructors
  - Returns raw PDF bytes for streaming

Created: 18/11/2026
"""

import io
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from schemas.instructor import CohortOverviewResponse


def generate_cohort_pdf_report(cohort_data: CohortOverviewResponse, course_name: str = "Computer Science") -> bytes:
    """Generate a formatted PDF audit report for instructor cohort oversight."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=15,
    )
    h2_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )

    story = []

    # Title & Header
    story.append(Paragraph("CogniCode — Cohort Cognitive Dependency Audit", title_style))
    story.append(
        Paragraph(
            f"Course: {course_name} · Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y')} · Supervised by PUCIT BSEF23-63",
            subtitle_style,
        )
    )

    # 1. Executive Summary Table
    story.append(Paragraph("1. Executive Cohort Telemetry", h2_style))
    summary_data = [
        ["Total Enrolled", "Cohort Mean CDS", "Low Dependency", "Moderate Dependency", "High Risk Band"],
        [
            str(cohort_data.total_students),
            f"{cohort_data.average_cds} / 100",
            f"{cohort_data.low_risk_count} ({round(cohort_data.low_risk_count / max(1, cohort_data.total_students) * 100)}%)",
            f"{cohort_data.moderate_risk_count} ({round(cohort_data.moderate_risk_count / max(1, cohort_data.total_students) * 100)}%)",
            f"{cohort_data.high_risk_count} ({round(cohort_data.high_risk_count / max(1, cohort_data.total_students) * 100)}%)",
        ],
    ]
    t1 = Table(summary_data, colWidths=[100, 100, 110, 115, 105])
    t1.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(t1)
    story.append(Spacer(1, 14))

    # 2. High Risk Student Roster
    story.append(Paragraph("2. High Dependency Student Roster (Requires Intervention)", h2_style))
    if cohort_data.high_risk_students:
        roster_data = [["Student Name", "Email / Roll No", "CDS Score", "Risk Band", "Struggling Topics", "Sol Requests"]]
        for stu in cohort_data.high_risk_students[:10]:
            topics_str = ", ".join(stu.topics_struggling[:2]) if stu.topics_struggling else "General Algorithms"
            roster_data.append([
                stu.name,
                stu.email,
                f"{stu.cds_score:.1f}",
                stu.risk_band.upper(),
                topics_str,
                str(stu.solution_requests),
            ])
        t2 = Table(roster_data, colWidths=[105, 140, 60, 65, 110, 50])
        t2.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fee2e2")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#991b1b")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (2, 0), (3, -1), "CENTER"),
                ("ALIGN", (5, 0), (5, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fca5a5")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(t2)
    else:
        story.append(
            Paragraph("No students currently fall into the high cognitive dependency risk band (CDS >= 71.0).", body_style)
        )
    story.append(Spacer(1, 14))

    # 3. Actionable Pedagogical Recommendations
    story.append(Paragraph("3. Pedagogical Recommendations for Cohort Oversight", h2_style))
    recs = [
        "<b>1. Enforce Attempt Gating:</b> For high-risk students, ensure Level 4 code hints remain locked until AST analysis registers at least one concrete conditional or loop modification.",
        "<b>2. Review Recursion Base Cases:</b> Heatmap analytics identify recursion and tree boundary conditions as primary dependency triggers.",
        "<b>3. Metacognitive Journaling:</b> Require students to review their end-of-session reflection summaries before launching subsequent tutoring sessions.",
    ]
    for r in recs:
        story.append(Paragraph(r, body_style))
        story.append(Spacer(1, 4))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
