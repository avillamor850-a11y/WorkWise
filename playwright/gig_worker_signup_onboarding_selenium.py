"""
Selenium E2E automation for gig worker signup + full onboarding.

Flow:
  1) /role-selection -> choose "I'm a gig worker" -> Continue
  2) /register -> fill signup form -> Create my account
  3) /onboarding/gig-worker steps 1..5 -> Submit profile

Run:
  python playwright/gig_worker_signup_onboarding_selenium.py --base-url http://127.0.0.1:8000 --headed
"""

from __future__ import annotations

import argparse
import json
import random
import string
import time
from pathlib import Path
from urllib.parse import urljoin

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver import ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

_DEBUG_LOG_PATH = Path(__file__).resolve().parents[1] / "debug-ae4463.log"
_DEBUG_SESSION_ID = "ae4463"


def debug_log(*, run_id: str, hypothesis_id: str, location: str, message: str, data: dict) -> None:
    payload = {
        "sessionId": _DEBUG_SESSION_ID,
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=True) + "\n")


def normalize_base_url(url: str) -> str:
    value = (url or "").strip().rstrip("/")
    if not value.startswith(("http://", "https://")):
        value = f"http://{value}"
    return value


def build_random_email(prefix: str = "gigworker") -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"{prefix}.{suffix}@example.com"


def maybe_sleep(ms: int) -> None:
    if ms > 0:
        time.sleep(ms / 1000.0)


def wait_for_path_contains(driver: webdriver.Chrome, wait: WebDriverWait, fragment: str, timeout_s: int = 45) -> None:
    end_time = time.time() + timeout_s
    while time.time() < end_time:
        if fragment in driver.current_url:
            return
        try:
            wait.until(lambda d: d.execute_script("return document.readyState") in ("interactive", "complete"))
        except Exception:
            pass
        time.sleep(0.2)
    raise TimeoutException(f"URL did not contain {fragment!r}. Current URL: {driver.current_url}")


def wait_for_path_not_contains(driver: webdriver.Chrome, fragment: str, timeout_s: int = 75) -> None:
    end_time = time.time() + timeout_s
    while time.time() < end_time:
        if fragment not in driver.current_url:
            return
        time.sleep(0.25)
    raise TimeoutException(f"URL still contains {fragment!r}. Current URL: {driver.current_url}")


def click_xpath(wait: WebDriverWait, xpath: str):
    element = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
    element.click()
    return element


def fill_by_id(wait: WebDriverWait, element_id: str, value: str) -> None:
    element = wait.until(EC.visibility_of_element_located((By.ID, element_id)))
    element.clear()
    element.send_keys(value)


def fill_by_xpath(wait: WebDriverWait, xpath: str, value: str) -> None:
    element = wait.until(EC.visibility_of_element_located((By.XPATH, xpath)))
    element.clear()
    element.send_keys(value)


def _xpath_str_literal(s: str) -> str:
    s = s or ""
    if "'" not in s:
        return f"'{s}'"
    if '"' not in s:
        return f'"{s}"'
    parts = s.split("'")
    return "concat(" + ",\"'\",".join([f"'{p}'" for p in parts]) + ")"


def click_button_text(wait: WebDriverWait, text: str) -> None:
    """Use only when the button has no extra label text (e.g. role Continue, Create my account)."""
    lit = _xpath_str_literal(text)
    click_xpath(wait, f"//button[normalize-space()={lit}]")


def click_button_text_starts_with(driver: webdriver.Chrome, wait: WebDriverWait, prefix: str) -> None:
    """
    Primary onboarding CTAs append Material icon text (e.g. arrow_forward), so
    normalize-space(.) is 'Get Started arrow_forward', not exactly 'Get Started'.
    """
    lit = _xpath_str_literal(prefix)
    xpath = f"//button[starts-with(normalize-space(.), {lit})]"
    element = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
    driver.execute_script("arguments[0].scrollIntoView({block:'center',inline:'nearest'});", element)
    try:
        element.click()
    except Exception:
        driver.execute_script("arguments[0].click();", element)


def add_skill(wait: WebDriverWait, skill: str, slow_ms: int = 0) -> None:
    search = wait.until(EC.visibility_of_element_located((By.ID, "skill-search")))
    search.clear()
    search.send_keys(skill)
    maybe_sleep(slow_ms)
    click_xpath(wait, "//input[@id='skill-search']/following-sibling::button[normalize-space()='Add']")
    # Wait until input is cleared by app state to confirm skill was processed.
    wait.until(lambda d: d.find_element(By.ID, "skill-search").get_attribute("value") == "")


def configure_driver(headed: bool = True) -> webdriver.Chrome:
    options = ChromeOptions()
    if not headed:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1000")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    return webdriver.Chrome(options=options)


def run_signup_onboarding(
    *,
    base_url: str,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    portfolio_url: str,
    resume_path: str | None,
    headed: bool,
    slow_ms: int,
    auto_close: bool,
) -> None:
    driver = configure_driver(headed=headed)
    wait = WebDriverWait(driver, 30)
    debug_run_id = "post-fix"

    try:
        # Role selection
        driver.get(urljoin(base_url + "/", "role-selection"))
        # #region agent log
        debug_log(
            run_id=debug_run_id,
            hypothesis_id="H1,H3",
            location="run_signup_onboarding:role-selection:land",
            message="landed on role-selection",
            data={"url": driver.current_url},
        )
        # #endregion
        try:
            role_cards = driver.find_elements(By.CSS_SELECTOR, "div.cursor-pointer")
            card_texts = [(c.text or "").strip().replace("\n", " ")[:120] for c in role_cards[:4]]
            continue_buttons = driver.find_elements(By.XPATH, "//button[normalize-space()='Continue']")
            continue_enabled = bool(continue_buttons and continue_buttons[0].is_enabled())
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="H1,H2,H4",
                location="run_signup_onboarding:role-selection:pre-click",
                message="snapshot before selecting role",
                data={
                    "roleCardCount": len(role_cards),
                    "roleCardTexts": card_texts,
                    "continueEnabledBeforeSelect": continue_enabled,
                },
            )
            # #endregion
        except Exception as exc:
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="H1,H2,H4",
                location="run_signup_onboarding:role-selection:pre-click",
                message="failed collecting pre-click snapshot",
                data={"errorType": type(exc).__name__, "error": str(exc)[:200]},
            )
            # #endregion

        # Click the actual card container, then verify Continue becomes enabled.
        click_xpath(
            wait,
            "//div[contains(@class,'cursor-pointer') and .//*[contains(normalize-space(),\"I'm a gig worker\")]]",
        )
        # #region agent log
        debug_log(
            run_id=debug_run_id,
            hypothesis_id="H1,H4",
            location="run_signup_onboarding:role-selection:after-role-click",
            message="clicked gig worker selector",
            data={"url": driver.current_url},
        )
        # #endregion
        maybe_sleep(slow_ms)
        try:
            continue_buttons = driver.find_elements(By.XPATH, "//button[normalize-space()='Continue']")
            continue_enabled = bool(continue_buttons and continue_buttons[0].is_enabled())
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="H2,H4",
                location="run_signup_onboarding:role-selection:after-role-click",
                message="continue state after selecting role",
                data={"continueEnabledAfterSelect": continue_enabled},
            )
            # #endregion
        except Exception as exc:
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="H2,H4",
                location="run_signup_onboarding:role-selection:after-role-click",
                message="failed reading continue state after role select",
                data={"errorType": type(exc).__name__, "error": str(exc)[:200]},
            )
            # #endregion
        wait.until(lambda d: d.find_element(By.XPATH, "//button[normalize-space()='Continue']").is_enabled())
        # #region agent log
        debug_log(
            run_id=debug_run_id,
            hypothesis_id="H2,H4",
            location="run_signup_onboarding:role-selection:before-continue-click",
            message="continue is enabled after role selection",
            data={"url": driver.current_url},
        )
        # #endregion
        click_button_text(wait, "Continue")
        try:
            wait_for_path_contains(driver, wait, "/register")
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="H3,H5",
                location="run_signup_onboarding:role-selection:after-continue",
                message="redirect to register success",
                data={"url": driver.current_url},
            )
            # #endregion
        except Exception as exc:
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="H3,H5",
                location="run_signup_onboarding:role-selection:after-continue",
                message="redirect to register failed",
                data={"url": driver.current_url, "errorType": type(exc).__name__, "error": str(exc)[:240]},
            )
            # #endregion
            raise

        # Register
        fill_by_id(wait, "first_name", first_name)
        fill_by_id(wait, "last_name", last_name)
        fill_by_id(wait, "email", email)
        fill_by_id(wait, "password", password)
        fill_by_id(wait, "password_confirmation", password)

        terms = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='checkbox']")))
        if not terms.is_selected():
            terms.click()

        maybe_sleep(slow_ms)
        click_button_text(wait, "Create my account")
        wait_for_path_contains(driver, wait, "/onboarding/gig-worker")
        # #region agent log
        debug_log(
            run_id=debug_run_id,
            hypothesis_id="S1,S2,S3",
            location="run_signup_onboarding:onboarding:land",
            message="landed on onboarding",
            data={"url": driver.current_url},
        )
        # #endregion

        # Step 1
        maybe_sleep(slow_ms)
        try:
            gs_xpath = "//button[starts-with(normalize-space(.), 'Get Started')]"
            get_started = wait.until(EC.element_to_be_clickable((By.XPATH, gs_xpath)))
            rect = driver.execute_script(
                "const r=arguments[0].getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};",
                get_started,
            )
            visible_text = (get_started.text or "").strip().replace("\n", " ")[:80]
            enabled = get_started.is_enabled()
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="S1,S2,S4",
                location="run_signup_onboarding:onboarding:step1:pre-click",
                message="get started pre-click state",
                data={"enabled": enabled, "rect": rect, "buttonTextSample": visible_text, "url": driver.current_url},
            )
            # #endregion
        except Exception as exc:
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="S1,S2",
                location="run_signup_onboarding:onboarding:step1:pre-click",
                message="failed to capture get started pre-click state",
                data={"errorType": type(exc).__name__, "error": str(exc)[:200], "url": driver.current_url},
            )
            # #endregion
            raise

        click_button_text_starts_with(driver, wait, "Get Started")
        # #region agent log
        debug_log(
            run_id=debug_run_id,
            hypothesis_id="S1,S4",
            location="run_signup_onboarding:onboarding:step1:clicked",
            message="get started click dispatched",
            data={"url": driver.current_url},
        )
        # #endregion
        try:
            wait.until(EC.visibility_of_element_located((By.ID, "professional_title")))
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="S3,S5",
                location="run_signup_onboarding:onboarding:step1:post-click",
                message="advanced to step2 after get started",
                data={"url": driver.current_url},
            )
            # #endregion
        except Exception as exc:
            body_text_sample = (driver.find_element(By.TAG_NAME, "body").text or "")[:220]
            # #region agent log
            debug_log(
                run_id=debug_run_id,
                hypothesis_id="S1,S2,S4,S5",
                location="run_signup_onboarding:onboarding:step1:post-click",
                message="did not advance to step2 after get started",
                data={"url": driver.current_url, "errorType": type(exc).__name__, "error": str(exc)[:200], "bodySample": body_text_sample},
            )
            # #endregion
            raise

        # Step 2
        fill_by_id(wait, "professional_title", "Frontend Developer")
        fill_by_id(wait, "hourly_rate", "850")
        fill_by_id(
            wait,
            "bio",
            "I build responsive web apps with React and JavaScript. "
            "I focus on clean UI implementation, testing, and reliable delivery.",
        )
        maybe_sleep(slow_ms)
        click_button_text_starts_with(driver, wait, "Next Step")

        # Step 3
        for skill in ("React", "JavaScript", "UI Design"):
            add_skill(wait, skill, slow_ms=slow_ms)
            maybe_sleep(250)
        click_button_text_starts_with(driver, wait, "Continue to Portfolio")

        # Step 4
        fill_by_xpath(
            wait,
            "//input[@type='url' and contains(@placeholder,'https://yourportfolio.com')]",
            portfolio_url,
        )
        if resume_path:
            resolved = str(Path(resume_path).resolve())
            file_input = wait.until(
                EC.presence_of_element_located((By.XPATH, "//input[@type='file' and contains(@accept,'.pdf')]"))
            )
            file_input.send_keys(resolved)

        maybe_sleep(slow_ms)
        click_button_text_starts_with(driver, wait, "Continue to Step 5")

        # Step 5
        maybe_sleep(slow_ms)
        click_button_text_starts_with(driver, wait, "Submit Profile")
        wait_for_path_not_contains(driver, "/onboarding/gig-worker", timeout_s=90)

        print("SUCCESS: Selenium gig worker signup + onboarding completed.")
        print(f"Email: {email}")
        print(f"Final URL: {driver.current_url}")

    finally:
        if headed and not auto_close:
            print("\nBrowser left open for inspection. Press Enter to close.")
            try:
                input()
            except EOFError:
                pass
        driver.quit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Selenium signup + full onboarding for WorkWise gig worker")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Application root URL")
    parser.add_argument("--first-name", default="Auto", help="First name for registration")
    parser.add_argument("--last-name", default="Worker", help="Last name for registration")
    parser.add_argument("--email", default="", help="If omitted, a random email is generated")
    parser.add_argument("--password", default="WorkWise!123", help="Password (must satisfy app policy)")
    parser.add_argument("--portfolio-url", default="https://example.com/portfolio", help="Portfolio URL for step 4")
    parser.add_argument("--resume-path", default="", help="Optional resume file path (.pdf/.doc/.docx)")
    parser.add_argument("--headed", action="store_true", help="Show browser")
    parser.add_argument("--auto-close", action="store_true", help="Close immediately in headed mode")
    parser.add_argument("--slow-ms", type=int, default=0, help="Small delay between key actions")
    args = parser.parse_args()

    run_signup_onboarding(
        base_url=normalize_base_url(args.base_url),
        first_name=args.first_name,
        last_name=args.last_name,
        email=(args.email.strip() or build_random_email()),
        password=args.password,
        portfolio_url=args.portfolio_url,
        resume_path=(args.resume_path.strip() or None),
        headed=args.headed,
        slow_ms=args.slow_ms,
        auto_close=args.auto_close,
    )


if __name__ == "__main__":
    main()
