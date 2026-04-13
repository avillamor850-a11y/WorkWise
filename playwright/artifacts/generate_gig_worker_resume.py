import os
import re
import json
import sqlite3
from pathlib import Path
from datetime import datetime

import requests
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch


DB_PATH = r"C:\Users\Administrator\Desktop\WorkWise5\WorkWise\database.sqlite"
OUTPUT_DIR = Path(r"C:\Users\Administrator\Desktop\WorkWise5\WorkWise\playwright\artifacts")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # change if needed
DEBUG_LOG_PATH = Path("debug-2e90a4.log")
DEBUG_SESSION_ID = "2e90a4"


def debug_log(run_id, hypothesis_id, location, message, data):
    payload = {
        "sessionId": DEBUG_SESSION_ID,
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(datetime.now().timestamp() * 1000),
    }
    with DEBUG_LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=True) + "\n")


def safe_text(value, fallback="Not provided"):
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def slugify_filename(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[-\s]+", "_", text)
    return text or "gig_worker"


def parse_skills_with_experience(raw):
    if not raw:
        return []
    if isinstance(raw, list):
        data = raw
    else:
        try:
            data = json.loads(raw)
        except Exception:
            return []

    skills = []
    for item in data:
        if isinstance(item, dict):
            name = item.get("skill") or item.get("name")
            years = item.get("years")
            level = item.get("level")
            skills.append({
                "name": name.strip() if isinstance(name, str) else None,
                "years": years,
                "level": level
            })
        elif isinstance(item, str):
            skills.append({"name": item.strip(), "years": None, "level": None})

    return [s for s in skills if s.get("name")]


def fetch_gig_workers(conn):
    query = """
        SELECT
            id,
            first_name,
            last_name,
            email,
            professional_title,
            bio,
            hourly_rate,
            portfolio_link,
            skills_with_experience,
            city,
            country,
            created_at
        FROM users
        WHERE user_type = 'gig_worker'
        ORDER BY COALESCE(first_name, '') ASC, COALESCE(last_name, '') ASC
    """
    cur = conn.cursor()
    cur.execute(query)
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def fetch_skill_pivot_names(conn, user_id):
    query = """
        SELECT s.name
        FROM skills s
        JOIN skill_user su ON su.skill_id = s.id
        WHERE su.user_id = ?
        ORDER BY s.name ASC
    """
    cur = conn.cursor()
    cur.execute(query, (user_id,))
    return [r[0] for r in cur.fetchall() if r[0]]


def build_ai_mock_details(worker, skills, groq_api_key):
    if not groq_api_key:
        return None

    prompt = f"""
Create concise, professional mock resume enhancements for a gig worker.
Use realistic details based on provided profile. Do not fabricate certifications or employers by name.
Return STRICT JSON with keys:
- professional_summary (2-3 sentences)
- key_achievements (array of 3 strings)
- suggested_projects (array of 2 strings)

Worker:
Name: {worker.get('first_name', '')} {worker.get('last_name', '')}
Title: {worker.get('professional_title')}
Bio: {worker.get('bio')}
Hourly Rate: {worker.get('hourly_rate')}
Location: {worker.get('city')}, {worker.get('country')}
Skills: {", ".join(skills) if skills else "None"}
"""

    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": "You are a resume assistant. Output valid JSON only."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=45)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()

        # attempt to extract JSON if wrapped
        if content.startswith("```"):
            content = content.strip("`")
            if content.lower().startswith("json"):
                content = content[4:].strip()

        parsed = json.loads(content)
        return parsed
    except Exception as e:
        print(f"[WARN] Groq call failed, continuing without AI mock details: {e}")
        return None


def generate_pdf(worker, skill_entries, pivot_skill_names, ai_details):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    full_name = f"{safe_text(worker.get('first_name'), '').strip()} {safe_text(worker.get('last_name'), '').strip()}".strip()
    full_name = full_name if full_name else f"Gig Worker #{worker.get('id')}"
    filename = f"{slugify_filename(full_name)}_resume_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    out_path = OUTPUT_DIR / filename

    doc = SimpleDocTemplate(str(out_path), pagesize=LETTER, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = []

    title = f"{full_name} - Resume"
    story.append(Paragraph(f"<b>{title}</b>", styles["Title"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("<b>Contact & Profile</b>", styles["Heading2"]))
    story.append(Paragraph(f"Email: {safe_text(worker.get('email'))}", styles["BodyText"]))
    story.append(Paragraph(f"Location: {safe_text(worker.get('city'))}, {safe_text(worker.get('country'))}", styles["BodyText"]))
    story.append(Paragraph(f"Professional Title: {safe_text(worker.get('professional_title'))}", styles["BodyText"]))
    story.append(Paragraph(f"Hourly Rate: {safe_text(worker.get('hourly_rate'))}", styles["BodyText"]))
    story.append(Paragraph(f"Portfolio: {safe_text(worker.get('portfolio_link'))}", styles["BodyText"]))
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("<b>Professional Summary</b>", styles["Heading2"]))
    bio = safe_text(worker.get("bio"), "No bio provided.")
    story.append(Paragraph(bio, styles["BodyText"]))
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("<b>Skills</b>", styles["Heading2"]))
    if skill_entries:
        for s in skill_entries:
            line = f"- {s['name']}"
            if s.get("years") is not None:
                line += f" ({s['years']} years)"
            if s.get("level"):
                line += f", Level: {s['level']}"
            story.append(Paragraph(line, styles["BodyText"]))
    elif pivot_skill_names:
        for name in pivot_skill_names:
            story.append(Paragraph(f"- {name}", styles["BodyText"]))
    else:
        story.append(Paragraph("No skills available.", styles["BodyText"]))
    story.append(Spacer(1, 0.15 * inch))

    if ai_details:
        story.append(Paragraph("<b>AI-Enhanced Mock Details</b>", styles["Heading2"]))
        summary = safe_text(ai_details.get("professional_summary"), "N/A")
        story.append(Paragraph(f"<b>Enhanced Summary:</b> {summary}", styles["BodyText"]))
        story.append(Spacer(1, 0.1 * inch))

        achievements = ai_details.get("key_achievements") or []
        story.append(Paragraph("<b>Key Achievements</b>", styles["BodyText"]))
        if achievements:
            for a in achievements:
                story.append(Paragraph(f"- {safe_text(a)}", styles["BodyText"]))
        else:
            story.append(Paragraph("- N/A", styles["BodyText"]))
        story.append(Spacer(1, 0.1 * inch))

        projects = ai_details.get("suggested_projects") or []
        story.append(Paragraph("<b>Suggested Project Highlights</b>", styles["BodyText"]))
        if projects:
            for p in projects:
                story.append(Paragraph(f"- {safe_text(p)}", styles["BodyText"]))
        else:
            story.append(Paragraph("- N/A", styles["BodyText"]))

    doc.build(story)
    return out_path


def main():
    # #region agent log
    debug_log("pre-fix", "H4", "generate_gig_worker_resume.py:main", "main_entry", {"db_path": DB_PATH})
    # #endregion
    if not Path(DB_PATH).exists():
        print(f"[ERROR] Database not found: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    workers = fetch_gig_workers(conn)
    if not workers:
        print("No gig workers found in database.")
        return

    print("\nGig Workers:")
    for i, w in enumerate(workers, start=1):
        name = f"{safe_text(w.get('first_name'), '').strip()} {safe_text(w.get('last_name'), '').strip()}".strip()
        title = safe_text(w.get("professional_title"), "No title")
        worker_id = w.get("id")
        fallback_name = f"User #{worker_id}"
        display_name = name or fallback_name
        # #region agent log
        debug_log("pre-fix", "H1", "generate_gig_worker_resume.py:worker_loop", "worker_display_values", {"index": i, "worker_id": worker_id, "name": display_name, "title": title})
        # #endregion
        print(f"{i}. {display_name} - {title} (ID: {worker_id})")

    while True:
        choice = input(f"\nSelect a gig worker (1-{len(workers)}): ").strip()
        if choice.isdigit():
            idx = int(choice)
            if 1 <= idx <= len(workers):
                selected = workers[idx - 1]
                break
        print("Invalid selection. Please enter a valid number.")

    use_ai = input("Use Groq AI for mock details? (y/n): ").strip().lower() == "y"
    groq_api_key = os.getenv("GROQ_API_KEY") if use_ai else None
    if use_ai and not groq_api_key:
        print("[WARN] GROQ_API_KEY not set. Proceeding without AI details.")
        use_ai = False

    skill_entries = parse_skills_with_experience(selected.get("skills_with_experience"))
    pivot_skills = fetch_skill_pivot_names(conn, selected["id"])
    # #region agent log
    debug_log("pre-fix", "H3", "generate_gig_worker_resume.py:skills", "skill_resolution", {"selected_id": selected.get("id"), "json_skills_count": len(skill_entries), "pivot_skills_count": len(pivot_skills)})
    # #endregion

    # merge fallback skill names if JSON skill list missing
    if not skill_entries and pivot_skills:
        skill_entries = [{"name": s, "years": None, "level": None} for s in pivot_skills]

    ai_details = build_ai_mock_details(
        worker=selected,
        skills=[s["name"] for s in skill_entries],
        groq_api_key=groq_api_key if use_ai else None
    ) if use_ai else None

    out_path = generate_pdf(selected, skill_entries, pivot_skills, ai_details)
    print(f"\nResume created successfully:\n{out_path}")


if __name__ == "__main__":
    main()