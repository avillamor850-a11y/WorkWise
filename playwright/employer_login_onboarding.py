"""
Pick an existing employer from SQLite, log in, optionally complete onboarding,
then ensure navigation to /jobs.

Run from repo root:
  python playwright/employer_login_onboarding.py --base-url http://127.0.0.1:8000

With onboarding automation:
  python playwright/employer_login_onboarding.py --base-url http://127.0.0.1:8000 --complete-onboarding --headed --manual-final-onboarding-step
"""

from __future__ import annotations

import argparse
import getpass
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Page, sync_playwright

from employer_login_post_job import list_employer_users, login_employer
from employer_register import (
    complete_employer_onboarding,
    generate_employer_mock_profile_with_groq,
    normalize_base_url,
)
from groq_e2e import _load_env_file_vars

_DEBUG_LOG = Path(__file__).resolve().parents[1] / "debug-953054.log"
_DEBUG_SESSION = "953054"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _debug_ndjson(*, hypothesis_id: str, location: str, message: str, data: dict) -> None:
    # #region agent log
    payload = {
        "sessionId": _DEBUG_SESSION,
        "runId": "pre-fix",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with _DEBUG_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, default=str) + "\n")
    except OSError:
        pass
    # #endregion


def _is_employer_onboarding_path(url: str) -> bool:
    path = urlparse(url).path.rstrip("/") or "/"
    if path == "/onboarding/employer":
        return True
    return path.startswith("/onboarding/employer/")


def _employer_onboarding_url_regex():
    return re.compile(r"/onboarding/employer(?:/|\?|#|$)")


def _wait_for_employer_onboarding(page: Page, *, timeout_ms: int) -> bool:
    try:
        page.wait_for_url(_employer_onboarding_url_regex(), timeout=timeout_ms)
        return True
    except Exception:
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pick an employer, log in, optionally complete onboarding, then open /jobs."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="App root URL")
    parser.add_argument("--headed", action="store_true", help="Show browser")
    parser.add_argument(
        "--auto-close",
        action="store_true",
        help="With --headed, close browser immediately (default: wait for Enter).",
    )
    parser.add_argument("--slowmo", type=int, default=0, help="Slow motion (ms)")
    parser.add_argument(
        "--database",
        type=Path,
        default=_repo_root() / "database.sqlite",
        help="SQLite database path (default: repo database.sqlite).",
    )
    parser.add_argument(
        "--password",
        default="",
        help="Optional password override (if omitted, prompted securely).",
    )
    parser.add_argument(
        "--complete-onboarding",
        action="store_true",
        help="Wait for /onboarding/employer (SPA/manual nav), then complete steps 1-5.",
    )
    parser.add_argument(
        "--onboarding-wait-ms",
        type=int,
        default=180_000,
        help="Max time to wait for /onboarding/employer with --complete-onboarding (default 180000).",
    )
    parser.add_argument(
        "--manual-final-onboarding-step",
        action="store_true",
        help="With --headed and --complete-onboarding, do not click final Complete Profile; wait for you.",
    )
    parser.add_argument(
        "--skip-logo",
        action="store_true",
        help="Skip optional company logo upload during onboarding step 2.",
    )
    args = parser.parse_args()

    if args.manual_final_onboarding_step:
        if not args.complete_onboarding:
            parser.error("--manual-final-onboarding-step requires --complete-onboarding.")
        if not args.headed:
            parser.error("--manual-final-onboarding-step requires --headed.")

    base = normalize_base_url(str(args.base_url))
    db_path = args.database.resolve()

    try:
        rows = list_employer_users(db_path=db_path)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
    if not rows:
        print("No employer users found (user_type employer/client).", file=sys.stderr)
        sys.exit(1)

    print("\nEmployer accounts (from database):\n")
    for i, row in enumerate(rows, start=1):
        disp = (row.get("display_name") or "").strip() or "(no name)"
        utype = row.get("user_type") or ""
        print(f"  {i}) {row.get('email')} — {disp}  [{utype}]")

    while True:
        raw = input("\nEnter number to log in as: ").strip()
        try:
            selected = int(raw)
        except ValueError:
            print("Please enter a valid integer.")
            continue
        if 1 <= selected <= len(rows):
            chosen = rows[selected - 1]
            break
        print(f"Enter a number between 1 and {len(rows)}.")

    email = str(chosen.get("email") or "").strip()
    if not email:
        print("Selected user has no email.", file=sys.stderr)
        sys.exit(1)

    password = str(args.password or "").strip() or getpass.getpass(f"Password for {email}: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, slow_mo=args.slowmo)
        context = browser.new_context()
        page = context.new_page()

        try:
            login_employer(page, base_url=base, email=email, password=password)
        except RuntimeError as exc:
            print(str(exc), file=sys.stderr)
            browser.close()
            sys.exit(1)

        print(f"OK: Logged in — {page.url}")
        _debug_ndjson(
            hypothesis_id="H1",
            location="employer_login_onboarding:after-login",
            message="url snapshot immediately after login helper",
            data={
                "url": page.url,
                "path": page.evaluate("() => window.location.pathname"),
            },
        )

        if args.complete_onboarding:
            current_path = urlparse(page.url).path
            is_match = _is_employer_onboarding_path(page.url)
            _debug_ndjson(
                hypothesis_id="H2",
                location="employer_login_onboarding:onboarding-gate",
                message="evaluating onboarding state before wait",
                data={
                    "url": page.url,
                    "pathname_from_urlparse": current_path,
                    "gate_match": is_match,
                },
            )
            print("Waiting for /onboarding/employer (SPA may still navigate, or open it manually)…")
            reached = _wait_for_employer_onboarding(
                page, timeout_ms=max(1, int(args.onboarding_wait_ms))
            )
            _debug_ndjson(
                hypothesis_id="H5",
                location="employer_login_onboarding:onboarding-wait",
                message="wait_for_url result",
                data={
                    "reached": reached,
                    "url": page.url,
                    "path": page.evaluate("() => window.location.pathname"),
                    "wait_ms": int(args.onboarding_wait_ms),
                },
            )

            if reached and _is_employer_onboarding_path(page.url):
                _debug_ndjson(
                    hypothesis_id="H3",
                    location="employer_login_onboarding:onboarding-branch",
                    message="starting employer onboarding automation",
                    data={"url": page.url},
                )
                _load_env_file_vars(
                    dotenv_path=Path(__file__).resolve().parents[1] / ".env",
                    required_keys=["GROQ_API_KEY"],
                )
                mock = generate_employer_mock_profile_with_groq(base_url=base)
                complete_employer_onboarding(
                    page,
                    mock=mock,
                    skip_logo=args.skip_logo,
                    submit_final=not args.manual_final_onboarding_step,
                )
                print("OK: Employer onboarding completed.")
            else:
                _debug_ndjson(
                    hypothesis_id="H4",
                    location="employer_login_onboarding:onboarding-branch",
                    message="skipping onboarding after wait timeout/path mismatch",
                    data={"url": page.url, "reached": reached},
                )
                print(
                    "Skip onboarding automation: did not reach /onboarding/employer within wait, "
                    "or URL mismatch "
                    f"(current: {page.url})."
                )

        page.goto(urljoin(base.rstrip("/") + "/", "jobs"), wait_until="domcontentloaded")
        print(f"OK: On jobs page — {page.url}")

        if args.headed and not args.auto_close:
            print("\nBrowser left open — press Enter here to close and exit.")
            try:
                input()
            except EOFError:
                pass

        browser.close()


if __name__ == "__main__":
    main()
