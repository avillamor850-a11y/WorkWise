"""
Pick an existing gig worker from SQLite, log in, optionally complete onboarding,
then ensure navigation to /jobs.

Run from repo root:
  python playwright/gig_worker_login_onboarding.py --base-url http://127.0.0.1:8000

With onboarding automation:
  python playwright/gig_worker_login_onboarding.py --base-url http://127.0.0.1:8000 --complete-onboarding --headed --manual-final-onboarding-step
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

from bid_accept_escrow_e2e import list_gig_worker_users, prompt_choice
from employer_login_post_job import login_employer
from employer_register import normalize_base_url
from gig_worker_register import (
    _fetch_skill_suggestions_via_page_request,
    complete_gig_worker_onboarding,
    generate_mock_profile_with_groq,
    generate_skills_with_proficiency_via_groq,
)
from groq_e2e import _load_env_file_vars

_DEBUG_LOG = Path(__file__).resolve().parents[1] / "debug-953054.log"
_DEBUG_SESSION = "953054"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _debug_ndjson(
    *,
    hypothesis_id: str,
    location: str,
    message: str,
    data: dict,
    run_id: str = "pre-fix",
) -> None:
    # #region agent log
    line = {
        "sessionId": _DEBUG_SESSION,
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with _DEBUG_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(line, default=str) + "\n")
    except OSError:
        pass
    # #endregion


def _is_gig_onboarding_path(url: str) -> bool:
    """Use pathname only so query strings do not break the check."""
    path = urlparse(url).path.rstrip("/") or "/"
    if path == "/onboarding/gig-worker":
        return True
    return path.startswith("/onboarding/gig-worker/")


def _gig_onboarding_url_regex():
    """Match full URL ending /onboarding/gig-worker with optional path/query/hash."""
    return re.compile(r"/onboarding/gig-worker(?:/|\?|#|$)")


def _wait_for_gig_worker_onboarding(page: Page, *, timeout_ms: int) -> bool:
    """
    Wait until Inertia navigates to gig worker onboarding (or user opens it).
    Returns False on timeout.
    """
    try:
        page.wait_for_url(_gig_onboarding_url_regex(), timeout=timeout_ms)
        return True
    except Exception:
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pick a gig worker, log in, optionally complete onboarding, then open /jobs."
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
        help="Wait for /onboarding/gig-worker (SPA or manual nav), then complete steps 1-5.",
    )
    parser.add_argument(
        "--onboarding-wait-ms",
        type=int,
        default=180_000,
        help="Max time to wait for /onboarding/gig-worker when --complete-onboarding (default 180000).",
    )
    parser.add_argument(
        "--manual-final-onboarding-step",
        action="store_true",
        help="With --headed and --complete-onboarding, do not click final Submit Profile; wait for you.",
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
        rows = list_gig_worker_users(db_path=db_path)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
    if not rows:
        print("No gig_worker users found in database.", file=sys.stderr)
        sys.exit(1)

    chosen = prompt_choice(rows, heading="Gig worker accounts (pick user to log in)")
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

        if args.complete_onboarding:
            path_after_login = page.evaluate("() => window.location.pathname")
            # #region agent log
            _debug_ndjson(
                hypothesis_id="H1",
                location="gig_worker_login_onboarding:after-login",
                message="url snapshot before wait_for onboarding",
                data={
                    "url": page.url,
                    "path": path_after_login,
                    "matches_onboarding_regex": bool(_is_gig_onboarding_path(page.url)),
                },
            )
            # #endregion

            print(
                "Waiting for /onboarding/gig-worker (Inertia may still be navigating, or open it manually)…"
            )
            reached = _wait_for_gig_worker_onboarding(
                page, timeout_ms=max(1, int(args.onboarding_wait_ms))
            )
            path_after_wait = page.evaluate("() => window.location.pathname")
            # #region agent log
            _debug_ndjson(
                hypothesis_id="H2",
                location="gig_worker_login_onboarding:after-wait",
                message="wait_for_url onboarding result",
                data={
                    "reached": reached,
                    "url": page.url,
                    "path": path_after_wait,
                    "wait_ms": int(args.onboarding_wait_ms),
                },
            )
            # #endregion

            if reached and _is_gig_onboarding_path(page.url):
                # #region agent log
                _debug_ndjson(
                    hypothesis_id="H3",
                    location="gig_worker_login_onboarding:branch",
                    message="running complete_gig_worker_onboarding",
                    data={"url": page.url},
                )
                # #endregion
                _load_env_file_vars(
                    dotenv_path=Path(__file__).resolve().parents[1] / ".env",
                    required_keys=["GROQ_API_KEY"],
                )
                mock = generate_mock_profile_with_groq(base_url=base)
                suggestions = _fetch_skill_suggestions_via_page_request(page=page, base_url=base, limit=50)

                mock["skills_with_proficiency"] = generate_skills_with_proficiency_via_groq(
                    base_url=base, page=page, suggestions=suggestions
                )
                complete_gig_worker_onboarding(
                    page,
                    mock=mock,
                    submit_final=not args.manual_final_onboarding_step,
                )
                print("OK: Gig worker onboarding completed.")
            else:
                # #region agent log
                _debug_ndjson(
                    hypothesis_id="H4",
                    location="gig_worker_login_onboarding:branch",
                    message="skip onboarding after wait timeout or path mismatch",
                    data={"url": page.url, "reached": reached},
                )
                # #endregion
                print(
                    "Skip onboarding automation: did not reach /onboarding/gig-worker within wait, "
                    f"or URL mismatch (current: {page.url})."
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
