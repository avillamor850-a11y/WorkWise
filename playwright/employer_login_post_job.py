"""
Pick an existing employer from the local SQLite DB, log in (no registration), post a job with Groq-generated copy.

Requires:
  - WorkWise running (e.g. php artisan serve)
  - GROQ_API_KEY in .env or environment
  - At least one user with user_type employer (or legacy client) in database.sqlite
  - You must know that user's password (not stored in DB)

Run from repo root:
  python playwright/employer_login_post_job.py --base-url http://127.0.0.1:8000

Optional:
  --database PATH   (default: repo database.sqlite)
  --headed          show browser (stays open until you press Enter in the terminal)
  --auto-close      with --headed, close the browser immediately without waiting
  --submit-job      with --headed, still auto-click Post Job (default: headed = fill only, you submit manually)
"""

from __future__ import annotations

import argparse
import getpass
import json
import sqlite3
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import Page, sync_playwright

from employer_register import (
    complete_job_create,
    generate_job_posting_with_groq,
    normalize_base_url,
)
from groq_e2e import _load_env_file_vars


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def list_employer_users(*, db_path: Path) -> list[dict]:
    if not db_path.is_file():
        raise FileNotFoundError(f"Database file not found: {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            """
            SELECT id, email, user_type,
              TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS display_name
            FROM users
            WHERE user_type IN ('employer', 'client')
            ORDER BY email COLLATE NOCASE
            """
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def prompt_choice(rows: list[dict]) -> dict:
    print("\nEmployer accounts (from database):\n")
    for i, r in enumerate(rows, start=1):
        disp = (r.get("display_name") or "").strip() or "(no name)"
        ut = r.get("user_type") or ""
        print(f"  {i}) {r.get('email')} — {disp}  [{ut}]")
    while True:
        raw = input("\nEnter number to log in as: ").strip()
        try:
            n = int(raw)
        except ValueError:
            print("Please enter a valid integer.")
            continue
        if 1 <= n <= len(rows):
            return rows[n - 1]
        print(f"Enter a number between 1 and {len(rows)}.")


def login_employer(page: Page, *, base_url: str, email: str, password: str) -> None:
    base = base_url.rstrip("/")
    page.goto(urljoin(base + "/", "login"), wait_until="domcontentloaded")

    page.locator("#email").wait_for(state="visible", timeout=20_000)
    page.locator("#email").fill(email)
    page.locator("#password").fill(password)

    submit = page.locator('[data-testid="login-submit"]')
    submit.wait_for(state="visible", timeout=10_000)
    try:
        submit.click(timeout=10_000)
    except Exception:
        submit.evaluate("el => el.click()")

    # Login.jsx may try Supabase first; Laravel fallback can take several seconds.
    try:
        page.wait_for_function(
            """() => {
                const p = window.location.pathname;
                if (p === '/login' || p.startsWith('/login/')) return false;
                return true;
            }""",
            timeout=90_000,
        )
    except Exception as exc:
        raise RuntimeError(
            f"Login did not leave /login within 90s. URL={page.url!r} "
            "(check password, Supabase config, or use a Laravel-only test email if applicable)."
        ) from exc

    path = page.evaluate("() => window.location.pathname")
    if path == "/login" or path.startswith("/login/"):
        raise RuntimeError(f"Still on login page after wait. URL={page.url!r}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pick an employer from SQLite, log in, post a Groq-generated job."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="App root URL")
    parser.add_argument("--headed", action="store_true", help="Show browser")
    parser.add_argument(
        "--auto-close",
        action="store_true",
        help="With --headed, close the browser immediately (default: wait for Enter in terminal).",
    )
    parser.add_argument(
        "--submit-job",
        action="store_true",
        help="With --headed, auto-click Post Job after filling the form (default: headed runs stop before submit).",
    )
    parser.add_argument("--slowmo", type=int, default=0, help="Slow motion (ms)")
    parser.add_argument(
        "--database",
        type=Path,
        default=_repo_root() / "database.sqlite",
        help="Path to SQLite database (default: repo database.sqlite)",
    )
    args = parser.parse_args()

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
            "No employer users found (user_type 'employer' or legacy 'client'). "
            "Register an employer or seed the database.",
            file=sys.stderr,
        )
        sys.exit(1)

    chosen = prompt_choice(rows)
    email = str(chosen.get("email") or "").strip()
    if not email:
        print("Selected row has no email.", file=sys.stderr)
        sys.exit(1)

    password = getpass.getpass(f"Password for {email}: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        sys.exit(1)

    print(f"\nLogging in as {email} …")
    job = generate_job_posting_with_groq(base_url=base)
    print("Groq job draft ready; opening browser …")

    do_submit = (not args.headed) or args.submit_job
    if args.headed and not args.submit_job:
        print(
            "(Headed) Form will be filled on /jobs/create — Post Job will not be clicked automatically."
        )

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

        try:
            complete_job_create(page, base_url=base, job=job, submit=do_submit)
            if do_submit:
                print(f"OK: Job posted — {page.url}")
            else:
                print(
                    f"OK: Job form filled — click Post Job in the browser when ready. Current URL: {page.url}"
                )
        except Exception as e:
            print(str(e), file=sys.stderr)
            browser.close()
            sys.exit(1)

        # #region agent log
        _pre = {
            "sessionId": "7e85dd",
            "runId": "verify",
            "hypothesisId": "H-branch",
            "location": "employer_login_post_job.py:pre-close",
            "message": "before wait/close decision",
            "data": {
                "headed": bool(args.headed),
                "auto_close": bool(args.auto_close),
                "submit_job_flag": bool(args.submit_job),
                "do_submit": bool(do_submit),
                "will_prompt_enter": bool(args.headed and not args.auto_close),
            },
            "timestamp": int(time.time() * 1000),
        }
        try:
            with open(_repo_root() / "debug-7e85dd.log", "a", encoding="utf-8") as f:
                f.write(json.dumps(_pre) + "\n")
        except OSError:
            pass
        # #endregion

        if args.headed and not args.auto_close:
            # #region agent log
            _w = {
                "sessionId": "7e85dd",
                "runId": "verify",
                "hypothesisId": "H-keep-open",
                "location": "employer_login_post_job.py:wait-prompt",
                "message": "entered headed keep-open branch",
                "data": {},
                "timestamp": int(time.time() * 1000),
            }
            try:
                with open(_repo_root() / "debug-7e85dd.log", "a", encoding="utf-8") as f:
                    f.write(json.dumps(_w) + "\n")
            except OSError:
                pass
            # #endregion
            print(
                "\nBrowser left open — press Enter here to close the browser and exit."
            )
            try:
                input()
            except EOFError:
                pass

        # #region agent log
        _c = {
            "sessionId": "7e85dd",
            "runId": "verify",
            "hypothesisId": "H-close",
            "location": "employer_login_post_job.py:before-browser-close",
            "message": "calling browser.close()",
            "data": {},
            "timestamp": int(time.time() * 1000),
        }
        try:
            with open(_repo_root() / "debug-7e85dd.log", "a", encoding="utf-8") as f:
                f.write(json.dumps(_c) + "\n")
        except OSError:
            pass
        # #endregion

        browser.close()


if __name__ == "__main__":
    main()
