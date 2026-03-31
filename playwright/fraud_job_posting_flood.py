"""
E2E: Job posting flood triggers medium-risk fraud warning (request still allowed).

Posts N jobs in one session (default 4). The 4th post triggers FraudDetectionMiddleware
when 3+ jobs already exist in the last 2 hours: flash warning + fraud_detection_alerts row.

Requires:
  - App running (e.g. php artisan serve)
  - GROQ_API_KEY in .env (same as employer_login_post_job)
  - Employer user in SQLite with access to /jobs/create (onboarding + ID verification per routes)

Run from repo root:
  python playwright/fraud_job_posting_flood.py --base-url http://127.0.0.1:8000

Optional:
  --jobs N          number of job posts (default 4; fraud warning expected when N >= 4)
  --assert-db       after last post, verify fraud_detection_alerts in SQLite
  --database PATH   SQLite path (default repo database.sqlite)
"""

from __future__ import annotations

import argparse
import copy
import getpass
import sqlite3
import sys
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from employer_login_post_job import list_employer_users, login_employer, prompt_choice
from employer_register import complete_job_create, generate_job_posting_with_groq, normalize_base_url
from groq_e2e import _load_env_file_vars

WARNING_SUBSTRING = "flagged for review"
ALERT_SUBSTRING = "Multiple project"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def count_job_flood_alerts(*, db_path: Path, user_id: int) -> int:
    if not db_path.is_file():
        raise FileNotFoundError(f"Database file not found: {db_path}")
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(
            """
            SELECT COUNT(*) FROM fraud_detection_alerts
            WHERE user_id = ?
              AND alert_message LIKE ?
            """,
            (user_id, f"%{ALERT_SUBSTRING}%"),
        )
        return int(cur.fetchone()[0])
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Post multiple jobs to trigger medium-risk fraud warning on flood."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="App root URL")
    parser.add_argument("--headed", action="store_true", help="Show browser")
    parser.add_argument(
        "--auto-close",
        action="store_true",
        help="With --headed, close browser immediately (no Enter prompt).",
    )
    parser.add_argument("--slowmo", type=int, default=0, help="Slow motion (ms)")
    parser.add_argument(
        "--database",
        type=Path,
        default=_repo_root() / "database.sqlite",
        help="Path to SQLite database",
    )
    parser.add_argument(
        "--jobs",
        type=int,
        default=4,
        help="How many jobs to post in sequence (default 4 triggers flood on last).",
    )
    parser.add_argument(
        "--assert-db",
        action="store_true",
        help="After posting, assert fraud_detection_alerts contains job-flood message for user.",
    )
    args = parser.parse_args()

    if args.jobs < 1:
        print("--jobs must be >= 1", file=sys.stderr)
        sys.exit(1)

    base = normalize_base_url(str(args.base_url))
    db_path = args.database.resolve()

    _load_env_file_vars(dotenv_path=_repo_root() / ".env", required_keys=["GROQ_API_KEY"])

    try:
        rows = list_employer_users(db_path=db_path)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    if not rows:
        print(
            "No employer users found (user_type 'employer' or legacy 'client').",
            file=sys.stderr,
        )
        sys.exit(1)

    chosen = prompt_choice(rows)
    user_id = int(chosen["id"])
    email = str(chosen.get("email") or "").strip()
    if not email:
        print("Selected row has no email.", file=sys.stderr)
        sys.exit(1)

    password = getpass.getpass(f"Password for {email}: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        sys.exit(1)

    print(f"\nGenerating one Groq job draft; posting {args.jobs} job(s) with unique titles …")
    base_job = generate_job_posting_with_groq(base_url=base)
    base_title = str(base_job.get("title") or "E2E Job").strip()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, slow_mo=args.slowmo)
        context = browser.new_context()
        page = context.new_page()

        try:
            login_employer(page, base_url=base, email=email, password=password)
            print(f"OK: Logged in — {page.url}")
        except RuntimeError as e:
            print(str(e), file=sys.stderr)
            browser.close()
            sys.exit(1)

        before_alerts = 0
        if args.assert_db:
            try:
                before_alerts = count_job_flood_alerts(db_path=db_path, user_id=user_id)
            except Exception as e:
                print(f"Warning: could not read baseline alert count: {e}", file=sys.stderr)

        for i in range(1, args.jobs + 1):
            job = copy.deepcopy(base_job)
            job["title"] = f"{base_title} (flood {i}/{args.jobs})"
            desc = str(job.get("description") or "")
            job["description"] = f"{desc}\n\n[E2E flood iteration {i}]"

            print(f"  Posting job {i}/{args.jobs} …")
            try:
                complete_job_create(page, base_url=base, job=job, submit=True)
            except Exception as e:
                print(f"Job {i} failed: {e}", file=sys.stderr)
                browser.close()
                sys.exit(1)

            if not page.evaluate(
                """() => /^\\/jobs\\/\\d+/.test(window.location.pathname)"""
            ):
                print(
                    f"Expected /jobs/{{id}} after job {i}, got {page.url!r}",
                    file=sys.stderr,
                )
                browser.close()
                sys.exit(1)

            print(f"OK: Job {i} — {page.url}")

            # Medium-risk flash only on the 4th post (3 prior jobs in 2h window).
            if args.jobs >= 4 and i == 4:
                warn_locator = page.get_by_text(WARNING_SUBSTRING, exact=False)
                try:
                    expect(warn_locator.first).to_be_visible(timeout=15_000)
                    print(f"OK: Fraud warning toast visible ({WARNING_SUBSTRING!r}).")
                except Exception as e:
                    print(
                        f"Expected warning text {WARNING_SUBSTRING!r} after job {i}: {e}",
                        file=sys.stderr,
                    )
                    browser.close()
                    sys.exit(1)

        if args.assert_db and args.jobs >= 4:
            time.sleep(0.5)
            try:
                after = count_job_flood_alerts(db_path=db_path, user_id=user_id)
            except Exception as e:
                print(f"DB assert failed: {e}", file=sys.stderr)
                browser.close()
                sys.exit(1)
            delta = after - before_alerts
            if delta < 1:
                print(
                    f"ASSERT-DB failed: expected new fraud_detection_alerts row with "
                    f"{ALERT_SUBSTRING!r} for user_id={user_id} (before={before_alerts}, after={after}).",
                    file=sys.stderr,
                )
                browser.close()
                sys.exit(1)
            print(f"OK: DB fraud alerts for flood message increased by {delta} (total matching: {after}).")

        if args.headed and not args.auto_close:
            print("\nBrowser open — press Enter to close.")
            try:
                input()
            except EOFError:
                pass

        browser.close()

    print("\nDone: job posting flood E2E completed.")


if __name__ == "__main__":
    main()
