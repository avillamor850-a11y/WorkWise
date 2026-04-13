"""
Employer wallet: log in, open Add Funds, continue to Stripe step; save PNG screenshots.

Requires: php artisan serve on BASE_URL (default http://127.0.0.1:8000)

Run from repo root:
  python playwright/employer_wallet_add_funds.py
  python playwright/employer_wallet_add_funds.py --email you@example.com --password secret
"""

from __future__ import annotations

import argparse
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import Page, sync_playwright


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


ARTIFACTS = _repo_root() / "playwright" / "artifacts"


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
    page.wait_for_function(
        """() => {
            const p = window.location.pathname;
            return !(p === '/login' || p.startsWith('/login/'));
        }""",
        timeout=90_000,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument(
        "--email",
        default="emmett.kaufman4268484380264422@example.com",
        help="Employer email (must exist in DB)",
    )
    parser.add_argument("--password", default="password123")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(viewport={"width": 1400, "height": 900}).new_page()

        try:
            login_employer(page, base_url=base, email=args.email, password=args.password)
        except Exception:
            page.screenshot(path=str(ARTIFACTS / "employer_wallet_login_fail.png"), full_page=True)
            browser.close()
            raise

        page.goto(urljoin(base + "/", "employer/wallet"), wait_until="networkidle")
        page.screenshot(path=str(ARTIFACTS / "employer_wallet_1_loaded.png"), full_page=True)

        page.get_by_role("button", name="Add Funds").click()
        page.get_by_role("heading", name="Add Funds to Escrow").wait_for(state="visible", timeout=15_000)
        page.screenshot(path=str(ARTIFACTS / "employer_wallet_2_amount_modal.png"), full_page=True)

        page.locator('input[type="number"]').fill("50")
        page.get_by_role("button", name="Continue to Payment").click()

        page.get_by_role("heading", name="Complete Your Deposit").wait_for(state="visible", timeout=30_000)
        # Allow Stripe.js / Elements to render
        page.wait_for_timeout(4000)
        page.screenshot(path=str(ARTIFACTS / "employer_wallet_3_payment_modal.png"), full_page=True)

        browser.close()

    print("Screenshots written to:", ARTIFACTS)


if __name__ == "__main__":
    main()
