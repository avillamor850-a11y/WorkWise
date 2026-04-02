"""
Gig worker signup + onboarding step 2 only (static profile fields, random email).

- No Groq / AI; no GROQ_API_KEY required.
- Edit FIRST_NAME, LAST_NAME, PASSWORD, PROFESSIONAL_TITLE, BIO, HOURLY_RATE below.
- Email is unique per run (secrets.token_hex).
- Stops after filling step 2 (#professional_title, #bio, #hourly_rate); you click Next manually.

Requires app running, Playwright installed:
  pip install -r playwright/requirements.txt
  playwright install chromium

Run (repo root):
  python playwright/gig_worker_register_static_step2.py --base-url http://127.0.0.1:8000 --headed --slowmo 150
"""

from __future__ import annotations

import argparse
import re
import secrets
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Page, expect, sync_playwright

# ------------------------------------------------------------------------------
# STATIC VALUES — edit here for each test persona
# ------------------------------------------------------------------------------
FIRST_NAME = "Marcus"
LAST_NAME = "Reed"
PASSWORD = "Ajhv#456"
PROFESSIONAL_TITLE = "Graphic Designer"
BIO = (
    "I create visually compelling designs for brands, including logos, marketing materials, and digital assets that capture attention and communicate clearly."
)
HOURLY_RATE = "38"


def normalize_base_url(url: str) -> str:
    url = url.rstrip("/")
    if not urlparse(url).scheme:
        url = "http://" + url
    return url


def generate_random_email(*, prefix: str = "gigworker", domain: str = "example.com") -> str:
    return f"{prefix}_{secrets.token_hex(5)}@{domain}"


# --- Inertia overlay + DOM click helpers (same behavior as gig_worker_register.py, no Groq) ---


def _wait_inertia_overlay_hidden(page: Page, *, label: str = "", timeout: int = 60_000) -> None:
    page.wait_for_timeout(400)
    try:
        page.wait_for_function(
            """
            () => {
                const el = document.querySelector('[role="status"][aria-busy="true"]');
                if (!el) return true;
                const style = window.getComputedStyle(el);
                const opacity = parseFloat(style.opacity || '1');
                const rect = el.getBoundingClientRect();
                if (rect.width < 2 || rect.height < 2) return true;
                if (opacity < 0.05) return true;
                const pe = style.pointerEvents;
                if (pe === 'none') return true;
                return false;
            }
            """,
            timeout=timeout,
        )
    except Exception as exc:
        raise TimeoutError(
            f"Inertia loading overlay did not clear ({label or 'unknown step'}). URL={page.url!r}"
        ) from exc


def _wait_inertia_overlay_hidden_optional(page: Page, *, label: str = "", timeout: int = 30_000) -> None:
    try:
        _wait_inertia_overlay_hidden(page, label=label, timeout=timeout)
    except TimeoutError:
        pass


def _onboarding_primary_click(
    page: Page,
    text_must_include: str,
    *,
    label: str,
    exclude_substring: str | None = None,
    prefer_blue_primary: bool = False,
) -> None:
    _wait_inertia_overlay_hidden_optional(page, label=f"{label}-overlay", timeout=25_000)
    page.wait_for_timeout(150)
    result = page.evaluate(
        """([must, avoid, preferBlue]) => {
          const mustL = must.toLowerCase();
          const avoidL = (avoid || '').toLowerCase();
          const visible = (el) => {
            const st = window.getComputedStyle(el);
            if (st.visibility === 'hidden' || st.display === 'none') return false;
            if (parseFloat(st.opacity || '1') < 0.05) return false;
            const r = el.getBoundingClientRect();
            return r.width >= 4 && r.height >= 4;
          };
          let buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
            if (b.disabled || !visible(b)) return false;
            const tc = (b.textContent || '').toLowerCase().replace(/\\s+/g, ' ').trim();
            if (!tc.includes(mustL)) return false;
            if (avoidL && tc.includes(avoidL)) return false;
            return true;
          });
          if (!buttons.length) {
            return {
              ok: false,
              snippets: Array.from(document.querySelectorAll('button'))
                .map((x) => ({ t: (x.textContent || '').trim().slice(0, 70), disabled: x.disabled }))
                .filter((x) => x.t)
                .slice(0, 20),
            };
          }
          buttons.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
          if (preferBlue) {
            const blues = buttons.filter((b) => (b.className || '').includes('blue-600'));
            if (blues.length) buttons = blues;
          }
          const b = buttons[0];
          b.click();
          return { ok: true, matched: (b.textContent || '').trim().slice(0, 120) };
        }""",
        [text_must_include, exclude_substring or "", prefer_blue_primary],
    )
    if not result.get("ok"):
        raise RuntimeError(
            f"Onboarding could not click {text_must_include!r} ({label}). URL={page.url!r} details={result!r}"
        )


def _onboarding_open_step2_professional_info(page: Page) -> None:
    """Step 1 → 2: retry Get Started until #professional_title is visible (hydration race)."""
    for attempt in range(12):
        _onboarding_primary_click(
            page,
            "get started",
            label=f"onboarding-step1-get-started-a{attempt}",
            prefer_blue_primary=True,
        )
        page.wait_for_timeout(500)
        try:
            page.locator("#professional_title").wait_for(state="visible", timeout=2_500)
            return
        except Exception:
            pass
    raise RuntimeError(
        f"Get Started did not open step 2 (#professional_title) after retries. URL={page.url!r}"
    )


def select_gig_worker_role(page: Page) -> None:
    card = page.locator("div.cursor-pointer").filter(
        has=page.get_by_role("heading", name=re.compile(r"i'?m a gig worker", re.I))
    )
    expect(card).to_be_visible(timeout=15_000)
    card.first.click()

    continue_btn = page.get_by_role("button", name=re.compile(r"^continue$", re.I))
    expect(continue_btn).to_be_enabled(timeout=15_000)
    continue_btn.click()
    expect(page).to_have_url(re.compile(r"/register"), timeout=15_000)


def submit_registration(
    page: Page,
    *,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
) -> None:
    expect(page.get_by_role("heading", name=re.compile(r"sign up to find work", re.I))).to_be_visible(
        timeout=15_000
    )

    page.evaluate(
        """() => {
          for (const id of ['first_name', 'last_name', 'email']) {
            const el = document.getElementById(id);
            if (!el) continue;
            el.autocomplete = 'off';
            el.value = '';
          }
        }"""
    )

    page.locator("#first_name").fill(first_name)
    page.locator("#last_name").fill(last_name)
    page.locator("#email").fill(email)
    page.locator("#password").fill(password)
    page.locator("#password_confirmation").fill(password)

    page.get_by_role("checkbox").check()

    submit_btn = page.get_by_role("button", name=re.compile(r"create my account", re.I))
    expect(submit_btn).to_be_enabled(timeout=5_000)
    submit_btn.click()

    try:
        page.wait_for_function(
            """() => {
                const p = window.location.pathname;
                return p.includes('/onboarding/gig-worker') || p.includes('/id-verification');
            }""",
            timeout=60_000,
        )
    except Exception as exc:
        errors = page.locator("p.text-sm.text-red-600").all_inner_texts()
        raise RuntimeError(
            f"Registration did not leave /register within 60s. "
            f"URL={page.url!r} validation_errors={errors!r}"
        ) from exc


def _wait_onboarding_step1_ready(page: Page) -> None:
    expect(page).to_have_url(re.compile(r"/onboarding/gig-worker"), timeout=15_000)
    page.wait_for_function(
        """
        () => {
          const t = document.body && (document.body.innerText || document.body.textContent) || '';
          return t.includes('Welcome to WorkWise') && /get started/i.test(t);
        }
        """,
        timeout=90_000,
    )
    page.wait_for_timeout(1_200)
    _wait_inertia_overlay_hidden_optional(page, label="after-land-onboarding", timeout=30_000)


def fill_onboarding_step2(
    page: Page,
    *,
    professional_title: str,
    bio: str,
    hourly_rate: str,
) -> None:
    title_el = page.locator("#professional_title")
    expect(title_el).to_be_visible(timeout=15_000)
    title_el.fill(professional_title.strip())
    page.locator("#hourly_rate").fill(str(hourly_rate).strip())
    page.locator("#bio").fill(bio.strip())


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Gig worker: static fields + random email; fill onboarding step 2 only."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="App root URL")
    parser.add_argument("--headed", action="store_true", help="Show browser")
    parser.add_argument("--slowmo", type=int, default=0, help="Slow motion (ms)")
    parser.add_argument(
        "--auto-close",
        action="store_true",
        help="With --headed, close browser without waiting for Enter.",
    )
    parser.add_argument(
        "--email-domain",
        default="example.com",
        help="Domain for generated email (default: example.com)",
    )
    parser.add_argument(
        "--email-prefix",
        default="gigworker",
        help="Prefix for generated email local part",
    )
    args = parser.parse_args()

    base = normalize_base_url(args.base_url)
    email = generate_random_email(prefix=args.email_prefix, domain=args.email_domain)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, slow_mo=args.slowmo)
        context = browser.new_context()
        page = context.new_page()

        page.goto(urljoin(base + "/", "role-selection"), wait_until="domcontentloaded")
        _wait_inertia_overlay_hidden_optional(page, label="gig-worker-role-selection-land", timeout=30_000)
        select_gig_worker_role(page)

        submit_registration(
            page,
            first_name=FIRST_NAME,
            last_name=LAST_NAME,
            email=email,
            password=PASSWORD,
        )

        url = page.url
        if re.search(r"id-verification", url):
            print("Registered but redirected to ID verification; cannot fill onboarding step 2 in this session.")
            print(f"Email used: {email}")
            if args.headed and not args.auto_close:
                try:
                    input("\nPress Enter to close browser…")
                except EOFError:
                    pass
            browser.close()
            raise SystemExit(1)

        if not re.search(r"/onboarding/gig-worker", url):
            browser.close()
            raise RuntimeError(f"Unexpected URL after registration: {url}")

        _wait_onboarding_step1_ready(page)
        _onboarding_open_step2_professional_info(page)
        fill_onboarding_step2(
            page,
            professional_title=PROFESSIONAL_TITLE,
            bio=BIO,
            hourly_rate=HOURLY_RATE,
        )

        print("OK: Registration complete; onboarding step 2 fields filled.")
        print(f"Email: {email}")
        print("Continue from step 2 in the browser (e.g. Next step) manually.")

        if args.headed and not args.auto_close:
            print("\nBrowser left open — press Enter to close and exit.")
            try:
                input()
            except EOFError:
                pass

        browser.close()


if __name__ == "__main__":
    main()
