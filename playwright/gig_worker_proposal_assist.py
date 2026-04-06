"""
Gig worker: pick a user from local SQLite by number, enter password, browse jobs, then fill
the proposal form (amount, days, cover letter) without submitting — you click Submit proposal.

Prerequisites:
  - App running (e.g. php artisan serve)
  - KYC / ID verification must allow /jobs and /jobs/{id} for the account if enforced locally
  - At least one user with user_type gig_worker in database.sqlite (password not stored; you type it)

Run from repo root:
  python playwright/gig_worker_proposal_assist.py --base-url http://127.0.0.1:8000 --headed
"""

from __future__ import annotations

import argparse
import getpass
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright

from bid_accept_escrow_e2e import (
    fill_proposal_form_on_job_show,
    list_gig_worker_users,
    prompt_choice,
    proposal_cover_letter,
)
from employer_login_post_job import login_employer
from employer_register import normalize_base_url


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _default_cover_letter() -> str:
    return proposal_cover_letter()


def _load_cover_letter(*, path: Path | None) -> str:
    if path is None:
        return _default_cover_letter()
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        print(f"Cover letter file is empty: {path}", file=sys.stderr)
        sys.exit(1)
    return text


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Log in as gig worker, wait for a job page, fill proposal form (no auto-submit)."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="App root URL")
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Show browser (recommended for this flow).",
    )
    parser.add_argument(
        "--database",
        type=Path,
        default=_repo_root() / "database.sqlite",
        help="SQLite database path (default: repo database.sqlite).",
    )
    parser.add_argument(
        "--auto-close",
        action="store_true",
        help="Close the browser immediately after fill (default: wait for Enter in terminal).",
    )
    parser.add_argument("--slowmo", type=int, default=0, help="Slow motion (ms)")
    parser.add_argument(
        "--wait-job-timeout-ms",
        type=int,
        default=3_600_000,
        help="Max time to wait for you to open /jobs/{id} (default: 3600000 = 1 hour).",
    )
    parser.add_argument(
        "--amount",
        type=float,
        default=100.0,
        help="Bid amount to fill (default: 100).",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Estimated days to fill (default: 7).",
    )
    parser.add_argument(
        "--cover-letter",
        type=Path,
        default=None,
        help="Path to UTF-8 text file for the cover letter (default: built-in short template).",
    )
    args = parser.parse_args()

    base = normalize_base_url(str(args.base_url))
    cover = _load_cover_letter(path=args.cover_letter)
    db_path = args.database.resolve()

    try:
        gw_rows = list_gig_worker_users(db_path=db_path)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
    if not gw_rows:
        print(
            "No gig_worker users in database. Register a gig worker or seed the database.",
            file=sys.stderr,
        )
        sys.exit(1)

    chosen = prompt_choice(gw_rows, heading="Gig worker accounts (pick user to log in)")
    email = str(chosen.get("email") or "").strip()
    if not email:
        print("Selected row has no email.", file=sys.stderr)
        sys.exit(1)
    password = getpass.getpass(f"Password for {email}: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        sys.exit(1)

    print(f"\nLogging in as {email} …")
    job_url_re = re.compile(r".*/jobs/\d+.*")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, slow_mo=args.slowmo)
        context = browser.new_context()
        page = context.new_page()

        try:
            login_employer(page, base_url=base, email=email, password=password)
        except RuntimeError as e:
            print(str(e), file=sys.stderr)
            browser.close()
            sys.exit(1)

        print(f"OK: Logged in — {page.url}")
        page.goto(urljoin(base.rstrip("/") + "/", "jobs"), wait_until="domcontentloaded")
        print(
            "\nBrowse and open a job. The script continues automatically when the URL looks like …/jobs/<id>."
        )

        try:
            page.wait_for_url(job_url_re, timeout=args.wait_job_timeout_ms)
        except Exception as e:
            print(f"Timed out waiting for a job page: {e}", file=sys.stderr)
            browser.close()
            sys.exit(1)

        print(f"OK: On job page — {page.url}")
        print("Filling proposal form (you will submit manually in the browser)…")

        try:
            fill_proposal_form_on_job_show(
                page,
                bid_amount=float(args.amount),
                estimated_days=int(args.days),
                cover_letter=cover,
            )
        except Exception as e:
            print(f"Fill failed: {e}", file=sys.stderr)
            browser.close()
            sys.exit(1)

        print(
            "\nProposal fields filled. Review and click Submit proposal in the browser when ready."
        )

        if args.headed and not args.auto_close:
            print("\nBrowser stays open — press Enter here to close and exit.")
            try:
                input()
            except EOFError:
                pass

        browser.close()


if __name__ == "__main__":
    main()
