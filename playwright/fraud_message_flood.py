"""
E2E: Message flood triggers medium-risk fraud warning (request still allowed).

Sends N messages in one session (default 11). The 11th POST triggers FraudDetectionMiddleware
when 10+ messages from the sender already exist in the last 5 minutes: session flash warning +
fraud_detection_alerts row. Chat uses fetch(); flash appears after a follow-up Inertia navigation.

Requires:
  - App running (e.g. php artisan serve)
  - Sender in SQLite with ID verification (messages routes use require.id.verification)
  - Another user id as receiver (exists in users)

Run from repo root:
  python playwright/fraud_message_flood.py --base-url http://127.0.0.1:8000 --receiver-id 2

Optional:
  --messages N      number of sends (default 11; flood on last when N >= 11)
  --assert-db       verify fraud_detection_alerts in SQLite
  --database PATH   SQLite path (default repo database.sqlite)
"""

from __future__ import annotations

import argparse
import getpass
import sqlite3
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import Page, expect, sync_playwright

from employer_login_post_job import login_employer
from employer_register import normalize_base_url

WARNING_SUBSTRING = "flagged for review"
ALERT_SUBSTRING = "High message volume"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def list_sender_users(*, db_path: Path) -> list[dict]:
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
            WHERE user_type IN ('employer', 'client', 'gig_worker')
              AND (COALESCE(is_admin, 0) = 0)
            ORDER BY email COLLATE NOCASE
            """
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def list_receiver_users(*, db_path: Path, exclude_id: int) -> list[dict]:
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
            WHERE id != ?
              AND (COALESCE(is_admin, 0) = 0)
            ORDER BY email COLLATE NOCASE
            """,
            (exclude_id,),
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def prompt_sender_choice(rows: list[dict]) -> dict:
    print("\nSender accounts — must have ID verification for /messages (from database):\n")
    for i, r in enumerate(rows, start=1):
        disp = (r.get("display_name") or "").strip() or "(no name)"
        ut = r.get("user_type") or ""
        print(f"  {i}) {r.get('email')} — {disp}  [{ut}]")
    while True:
        raw = input("\nEnter number to log in as sender: ").strip()
        try:
            n = int(raw)
        except ValueError:
            print("Please enter a valid integer.")
            continue
        if 1 <= n <= len(rows):
            return rows[n - 1]
        print(f"Enter a number between 1 and {len(rows)}.")


def resolve_receiver_id(
    *,
    db_path: Path,
    sender_id: int,
    receiver_id_arg: int | None,
) -> int:
    if receiver_id_arg is not None:
        rows = list_receiver_users(db_path=db_path, exclude_id=sender_id)
        ids = {int(r["id"]) for r in rows}
        if receiver_id_arg == sender_id:
            print("--receiver-id must differ from sender id.", file=sys.stderr)
            sys.exit(1)
        if receiver_id_arg not in ids:
            # Still allow if user exists but is admin? Plan: receiver must exist.
            conn = sqlite3.connect(str(db_path))
            try:
                cur = conn.execute(
                    "SELECT id FROM users WHERE id = ?", (receiver_id_arg,)
                )
                if cur.fetchone() is None:
                    print(
                        f"No user with id={receiver_id_arg} in database.",
                        file=sys.stderr,
                    )
                    sys.exit(1)
            finally:
                conn.close()
        return receiver_id_arg

    rows = list_receiver_users(db_path=db_path, exclude_id=sender_id)
    if not rows:
        print(
            "No receiver candidates (need another user id != sender). "
            "Pass --receiver-id.",
            file=sys.stderr,
        )
        sys.exit(1)
    print("\nReceiver accounts (pick who receives the flood):\n")
    for i, r in enumerate(rows, start=1):
        disp = (r.get("display_name") or "").strip() or "(no name)"
        ut = r.get("user_type") or ""
        print(f"  {i}) id={r.get('id')} {r.get('email')} — {disp}  [{ut}]")
    while True:
        raw = input("\nEnter number to select receiver: ").strip()
        try:
            n = int(raw)
        except ValueError:
            print("Please enter a valid integer.")
            continue
        if 1 <= n <= len(rows):
            return int(rows[n - 1]["id"])
        print(f"Enter a number between 1 and {len(rows)}.")


def count_message_flood_alerts(*, db_path: Path, user_id: int) -> int:
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


def _post_messages_url(base: str) -> str:
    b = base.rstrip("/")
    return urljoin(b + "/", "messages")


def send_one_message(page: Page, *, base: str, text: str) -> None:
    ta = page.locator('textarea[placeholder="Type your message..."]')
    ta.wait_for(state="visible", timeout=20_000)
    submit = page.locator(
        'form:has(textarea[placeholder="Type your message..."]) button[type="submit"]'
    )

    def is_messages_post(resp) -> bool:
        if resp.request.method != "POST":
            return False
        u = resp.url.rstrip("/")
        return u.endswith("/messages")

    with page.expect_response(is_messages_post, timeout=30_000):
        ta.fill(text)
        submit.click()

    ta.wait_for(state="visible", timeout=10_000)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Send many messages to trigger medium-risk fraud warning on message flood."
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
        "--messages",
        type=int,
        default=11,
        help="How many messages to send (default 11 triggers flood on last).",
    )
    parser.add_argument(
        "--receiver-id",
        type=int,
        default=None,
        help="Receiver user id (omit to pick interactively from DB).",
    )
    parser.add_argument(
        "--assert-db",
        action="store_true",
        help="After run, verify fraud_detection_alerts contains message-flood text for sender.",
    )
    args = parser.parse_args()

    if args.messages < 1:
        print("--messages must be >= 1", file=sys.stderr)
        sys.exit(1)

    base = normalize_base_url(str(args.base_url))
    db_path = args.database.resolve()

    try:
        senders = list_sender_users(db_path=db_path)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    if not senders:
        print(
            "No sender candidates (employer, client, or gig_worker, non-admin).",
            file=sys.stderr,
        )
        sys.exit(1)

    chosen = prompt_sender_choice(senders)
    sender_id = int(chosen["id"])
    email = str(chosen.get("email") or "").strip()
    if not email:
        print("Selected row has no email.", file=sys.stderr)
        sys.exit(1)

    receiver_id = resolve_receiver_id(
        db_path=db_path,
        sender_id=sender_id,
        receiver_id_arg=args.receiver_id,
    )

    password = getpass.getpass(f"Password for {email}: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        sys.exit(1)

    print(
        f"\nSending {args.messages} message(s) to user id={receiver_id} "
        f"(flood warning on last when messages >= 11) …"
    )

    before_alerts = 0
    if args.assert_db:
        try:
            before_alerts = count_message_flood_alerts(db_path=db_path, user_id=sender_id)
        except Exception as e:
            print(f"Warning: could not read baseline alert count: {e}", file=sys.stderr)

    conv_url = urljoin(base + "/", f"messages/{receiver_id}")

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

        page.goto(conv_url, wait_until="domcontentloaded")
        print(f"OK: Opened conversation — {page.url}")

        for i in range(1, args.messages + 1):
            body = f"E2E flood {i}/{args.messages}"
            print(f"  Sending message {i}/{args.messages} …")
            try:
                send_one_message(page, base=base, text=body)
            except Exception as e:
                print(f"Message {i} failed: {e}", file=sys.stderr)
                browser.close()
                sys.exit(1)
            print(f"OK: Message {i} sent.")

        if args.messages >= 11:
            print("  Navigating to /messages to surface flash warning …")
            page.goto(_post_messages_url(base), wait_until="domcontentloaded")
            warn_locator = page.get_by_text(WARNING_SUBSTRING, exact=False)
            try:
                expect(warn_locator.first).to_be_visible(timeout=15_000)
                print(f"OK: Fraud warning visible ({WARNING_SUBSTRING!r}).")
            except Exception as e:
                print(
                    f"Expected warning text {WARNING_SUBSTRING!r} after navigation: {e}",
                    file=sys.stderr,
                )
                browser.close()
                sys.exit(1)

        if args.assert_db and args.messages >= 11:
            time.sleep(0.5)
            try:
                after = count_message_flood_alerts(db_path=db_path, user_id=sender_id)
            except Exception as e:
                print(f"DB assert failed: {e}", file=sys.stderr)
                browser.close()
                sys.exit(1)
            delta = after - before_alerts
            if delta < 1:
                print(
                    f"ASSERT-DB failed: expected new fraud_detection_alerts row with "
                    f"{ALERT_SUBSTRING!r} for user_id={sender_id} "
                    f"(before={before_alerts}, after={after}).",
                    file=sys.stderr,
                )
                browser.close()
                sys.exit(1)
            print(
                f"OK: DB fraud alerts for message flood increased by {delta} "
                f"(total matching: {after})."
            )

        if args.headed and not args.auto_close:
            print("\nBrowser open — press Enter to close.")
            try:
                input()
            except EOFError:
                pass

        browser.close()

    print("\nDone: message flood E2E completed.")


if __name__ == "__main__":
    main()
