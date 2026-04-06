"""
E2E: employer posts a job, gig worker submits a proposal, employer accepts -> escrow transaction.

Prerequisites:
  - App running (php artisan serve; npm run dev if UI requires Vite)
  - GROQ_API_KEY in .env (for job draft, same as employer job scripts)
  - SQLite users: at least one employer (or legacy client) and one gig_worker with known passwords
  - ID verification / KYC must allow /jobs/{id}, /bids, and login for both accounts locally

Run from repo root:
  python playwright/bid_accept_escrow_e2e.py --base-url http://127.0.0.1:8000

Optional:
  --min-escrow AMOUNT   ensure employer escrow_balance in SQLite is at least AMOUNT (default 50000)
  --assert-db           verify a completed escrow transaction exists for the job's project
  --database PATH       SQLite path (default: repo database.sqlite)
  --submit-job          with --headed, auto-click Post Job after filling create form
"""

from __future__ import annotations

import argparse
import getpass
import re
import sqlite3
import sys
from pathlib import Path

from playwright.sync_api import Page, expect, sync_playwright

from employer_login_post_job import list_employer_users, login_employer
from employer_register import complete_job_create, generate_job_posting_with_groq, normalize_base_url
from gig_worker_register import _wait_inertia_overlay_hidden
from groq_e2e import _load_env_file_vars


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def list_gig_worker_users(*, db_path: Path) -> list[dict]:
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
            WHERE user_type = 'gig_worker'
            ORDER BY email COLLATE NOCASE
            """
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def prompt_choice(rows: list[dict], *, heading: str) -> dict:
    print(f"\n{heading}\n")
    for i, r in enumerate(rows, start=1):
        disp = (r.get("display_name") or "").strip() or "(no name)"
        ut = r.get("user_type") or ""
        print(f"  {i}) {r.get('email')} — {disp}  [{ut}]")
    while True:
        raw = input("\nEnter number: ").strip()
        try:
            n = int(raw)
        except ValueError:
            print("Please enter a valid integer.")
            continue
        if 1 <= n <= len(rows):
            return rows[n - 1]
        print(f"Enter a number between 1 and {len(rows)}.")


def ensure_min_escrow(*, db_path: Path, user_id: int, min_balance: float) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            UPDATE users SET escrow_balance = CASE
                WHEN COALESCE(escrow_balance, 0) < ? THEN ?
                ELSE escrow_balance END
            WHERE id = ?
            """,
            (min_balance, min_balance, user_id),
        )
        conn.commit()
    finally:
        conn.close()


def parse_job_id_from_url(url: str) -> int:
    m = re.search(r"/jobs/(\d+)", url)
    if not m:
        raise RuntimeError(f"Could not parse job id from URL: {url!r}")
    return int(m.group(1))


def proposal_cover_letter() -> str:
    return (
        "I have relevant experience for this scope and can deliver on time with clear updates. "
        "My approach: confirm requirements, implement in small milestones, and hand off with brief docs."
    )


def compute_bid_amount(job: dict) -> float:
    try:
        bmax = float(str(job.get("budget_max") or "500").replace(",", ""))
    except ValueError:
        bmax = 500.0
    try:
        bmin = float(str(job.get("budget_min") or "5").replace(",", ""))
    except ValueError:
        bmin = 5.0
    if bmax < bmin:
        bmin, bmax = bmax, bmin
    target = min(100.0, bmax)
    return max(bmin, target)


def fill_proposal_form_on_job_show(
    page: Page,
    *,
    bid_amount: float,
    estimated_days: int = 7,
    cover_letter: str,
) -> None:
    """Open the bid form on /jobs/{id} and fill amount, timeline, and cover letter (does not submit)."""
    _wait_inertia_overlay_hidden(page, label="gw-job-show", timeout=60_000)
    page.get_by_role("button", name=re.compile(r"submit a proposal", re.I)).click(timeout=15_000)
    _wait_inertia_overlay_hidden(page, label="gw-bid-form", timeout=30_000)

    # Labels are not htmlFor-linked; scope to the bid form by its submit button.
    bid_form = page.locator("form").filter(
        has=page.get_by_role("button", name=re.compile(r"submit proposal", re.I))
    )
    num_inputs = bid_form.locator('input[type="number"]')
    expect(num_inputs.first).to_be_visible(timeout=10_000)
    num_inputs.nth(0).fill(f"{bid_amount:.2f}")
    num_inputs.nth(1).fill(str(estimated_days))
    bid_form.locator("textarea").fill(cover_letter)


def submit_proposal_on_job_show(page: Page, *, bid_amount: float, estimated_days: int = 7) -> None:
    fill_proposal_form_on_job_show(
        page,
        bid_amount=bid_amount,
        estimated_days=estimated_days,
        cover_letter=proposal_cover_letter(),
    )

    bid_form = page.locator("form").filter(
        has=page.get_by_role("button", name=re.compile(r"submit proposal", re.I))
    )
    submit = bid_form.get_by_role("button", name=re.compile(r"submit proposal", re.I))
    expect(submit).to_be_enabled(timeout=10_000)
    submit.evaluate("el => el.click()")

    _wait_inertia_overlay_hidden(page, label="gw-after-bid-submit", timeout=90_000)
    expect(page.get_by_text(re.compile(r"Proposals?\s*\(\d+\)", re.I))).to_be_visible(
        timeout=30_000
    )


def employer_accept_first_pending_bid(page: Page, *, job_url: str) -> None:
    page.goto(job_url, wait_until="domcontentloaded")
    _wait_inertia_overlay_hidden(page, label="emp-job-reload", timeout=60_000)

    accept_btn = page.get_by_role("button", name=re.compile(r"^accept$", re.I))
    expect(accept_btn.first).to_be_visible(timeout=30_000)
    accept_btn.first.evaluate("el => el.click()")

    confirm = page.get_by_role("button", name=re.compile(r"accept proposal", re.I))
    expect(confirm).to_be_visible(timeout=15_000)
    confirm.evaluate("el => el.click()")

    _wait_inertia_overlay_hidden(page, label="emp-after-accept", timeout=120_000)
    try:
        page.wait_for_function(
            """() => {
                const p = window.location.pathname;
                if (/^\\/jobs\\/\\d+/.test(p)) return true;
                if (p.includes('contract')) return true;
                if (p.includes('sign')) return true;
                return false;
            }""",
            timeout=60_000,
        )
    except Exception:
        pass


def assert_escrow_transaction_for_job(*, db_path: Path, job_id: int, employer_id: int) -> None:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            """
            SELECT t.id, t.type, t.status, t.amount, t.payer_id, p.job_id
            FROM transactions t
            INNER JOIN projects p ON t.project_id = p.id
            WHERE p.job_id = ? AND t.type = 'escrow' AND t.payer_id = ?
            ORDER BY t.id DESC
            LIMIT 1
            """,
            (job_id, employer_id),
        )
        row = cur.fetchone()
        if not row:
            raise AssertionError(
                f"No escrow transaction found for job_id={job_id} payer_id={employer_id}"
            )
        if str(row["status"]) != "completed":
            raise AssertionError(f"Expected completed escrow row, got status={row['status']!r}")
        print(
            f"OK (--assert-db): transaction id={row['id']} escrow amount={row['amount']} job_id={row['job_id']}"
        )
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="E2E: post job, gig worker bids, employer accepts -> escrow transaction."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--auto-close", action="store_true")
    parser.add_argument("--slowmo", type=int, default=0)
    parser.add_argument(
        "--submit-job",
        action="store_true",
        help="With --headed, auto-submit job create (default: headless always submits).",
    )
    parser.add_argument(
        "--database",
        type=Path,
        default=_repo_root() / "database.sqlite",
    )
    parser.add_argument(
        "--min-escrow",
        type=float,
        default=50_000.0,
        help="Minimum employer escrow_balance set in SQLite before posting (default 50000).",
    )
    parser.add_argument(
        "--assert-db",
        action="store_true",
        help="After accept, assert a completed escrow transaction for this job in SQLite.",
    )
    args = parser.parse_args()

    base = normalize_base_url(str(args.base_url))
    db_path = args.database.resolve()

    _load_env_file_vars(dotenv_path=_repo_root() / ".env", required_keys=["GROQ_API_KEY"])

    try:
        emp_rows = list_employer_users(db_path=db_path)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
    if not emp_rows:
        print("No employer/client users in database.", file=sys.stderr)
        sys.exit(1)

    try:
        gw_rows = list_gig_worker_users(db_path=db_path)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
    if not gw_rows:
        print("No gig_worker users in database.", file=sys.stderr)
        sys.exit(1)

    emp = prompt_choice(emp_rows, heading="Employer accounts (pick job poster)")
    gw = prompt_choice(gw_rows, heading="Gig worker accounts (pick bidder)")
    emp_id = int(emp["id"])
    gw_id = int(gw["id"])
    if emp_id == gw_id:
        print("Employer and gig worker must be different users.", file=sys.stderr)
        sys.exit(1)

    emp_email = str(emp.get("email") or "").strip()
    gw_email = str(gw.get("email") or "").strip()
    emp_pw = getpass.getpass(f"Password for employer {emp_email}: ")
    gw_pw = getpass.getpass(f"Password for gig worker {gw_email}: ")
    if not emp_pw or not gw_pw:
        print("Passwords cannot be empty.", file=sys.stderr)
        sys.exit(1)

    job = generate_job_posting_with_groq(base_url=base)
    bid_amount = compute_bid_amount(job)
    need_escrow = max(float(args.min_escrow), bid_amount)
    ensure_min_escrow(db_path=db_path, user_id=emp_id, min_balance=need_escrow)
    print(
        f"SQLite: ensured employer id={emp_id} escrow >= {need_escrow:.2f} (bid will be {bid_amount:.2f})"
    )

    do_submit = (not args.headed) or args.submit_job
    if args.headed and not args.submit_job:
        print(
            "Headed mode without --submit-job stops before posting in other scripts; "
            "this flow needs a posted job. Re-run with --submit-job or omit --headed.",
            file=sys.stderr,
        )
        sys.exit(1)

    print("Opening browser (employer context)…")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, slow_mo=args.slowmo)
        try:
            ctx_emp = browser.new_context()
            page_emp = ctx_emp.new_page()
            try:
                login_employer(page_emp, base_url=base, email=emp_email, password=emp_pw)
            except RuntimeError as e:
                print(str(e), file=sys.stderr)
                sys.exit(1)

            try:
                complete_job_create(page_emp, base_url=base, job=job, submit=do_submit)
            except Exception as e:
                print(str(e), file=sys.stderr)
                sys.exit(1)

            job_url = page_emp.url
            job_id = parse_job_id_from_url(job_url)
            print(f"OK: Job posted job_id={job_id} url={job_url}")

            ctx_gw = browser.new_context()
            page_gw = ctx_gw.new_page()
            try:
                login_employer(page_gw, base_url=base, email=gw_email, password=gw_pw)
            except RuntimeError as e:
                print(str(e), file=sys.stderr)
                sys.exit(1)

            page_gw.goto(job_url, wait_until="domcontentloaded")
            print(f"Gig worker submitting proposal (₱{bid_amount:.2f})…")
            try:
                submit_proposal_on_job_show(page_gw, bid_amount=bid_amount)
            except Exception as e:
                print(f"Bid submit failed: {e}", file=sys.stderr)
                sys.exit(1)

            print("Employer accepting proposal…")
            try:
                employer_accept_first_pending_bid(page_emp, job_url=job_url)
            except Exception as e:
                print(f"Accept failed: {e}", file=sys.stderr)
                sys.exit(1)

            print(f"OK: Accept flow finished — {page_emp.url}")

            if args.assert_db:
                assert_escrow_transaction_for_job(
                    db_path=db_path, job_id=job_id, employer_id=emp_id
                )

        finally:
            if args.headed and not args.auto_close:
                print("\nPress Enter to close the browser…")
                try:
                    input()
                except EOFError:
                    pass
            browser.close()


if __name__ == "__main__":
    main()
