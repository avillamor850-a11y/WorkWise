"""
Automate employer registration for WorkWise (Laravel + Inertia).

Flow:
  1. /role-selection  -> choose "I'm an employer" -> Continue
  2. /register        -> fill form -> Create my account
  3. Expect redirect to employer onboarding (/onboarding/employer)
  4. Optional: --complete-onboarding -> steps 1–5 -> /employer/dashboard

Employer steps 2–4 only advance after a successful Inertia POST (onSuccess); wait for the
global loading overlay to clear after each primary action.

Setup:
  pip install -r playwright/requirements.txt
  playwright install chromium

Run (app must be running):
  python playwright/employer_register.py --base-url http://127.0.0.1:8000

  python playwright/employer_register.py --base-url http://127.0.0.1:8000 --complete-onboarding

  Register, finish onboarding, then post a job (Groq-generated copy) in the same session:

  python playwright/employer_register.py --base-url http://127.0.0.1:8000 --complete-onboarding --post-job

Mock registration + onboarding data is generated per run using GROQ_API_KEY from .env (see playwright/README.md).
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import random
import sys
import re
import secrets
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Page, expect, sync_playwright

from groq_e2e import (
    _agent_session_log,
    _build_ai_email,
    _call_groq_chat_json,
    _load_env_file_vars,
    _unique_suffix_digits,
)

_DEBUG_LOG = Path(__file__).resolve().parents[1] / ".cursor" / "debug-playwright-employer.log"
_DEBUG_SESSION_LOG = Path(__file__).resolve().parents[1] / "debug-c43e15.log"


def _debug_ndjson(*, location: str, message: str, hypothesis_id: str, data: dict) -> None:
    line = {
        "sessionId": "c43e15",
        "timestamp": int(time.time() * 1000),
        "location": location,
        "message": message,
        "hypothesisId": hypothesis_id,
        "data": data,
    }
    with _DEBUG_SESSION_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(line, default=str) + "\n")

_MINIMAL_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

_ALLOWED_COMPANY_SIZES = ["individual", "2-10", "11-50", "51-200", "200+"]
_ALLOWED_BUDGETS = ["under_500", "500-2000", "2000-5000", "5000-10000", "10000+"]
_ALLOWED_DURATIONS = ["short_term", "medium_term", "long_term", "ongoing"]
_ALLOWED_EXPERIENCE = ["any", "beginner", "intermediate", "expert"]
_ALLOWED_HIRING_FREQUENCY = ["one_time", "occasional", "regular", "ongoing"]


def _snap_to_allowed(raw: str, allowed: list[str], *, rng: random.Random) -> str:
    v = (raw or "").strip()
    if v in allowed:
        return v
    by_lower = {a.lower(): a for a in allowed}
    if v.lower() in by_lower:
        return by_lower[v.lower()]
    return rng.choice(allowed)


def _ensure_https_website(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return "https://example.com"
    if not re.match(r"^https?://", u, flags=re.I):
        u = "https://" + u.lstrip("/")
    return u[:255]


def _ensure_description_length(desc: str, *, minimum: int = 50, maximum: int = 1000) -> str:
    d = (desc or "").strip()
    if len(d) < minimum:
        d = (
            d
            + " We are building our team through WorkWise and value clear communication, "
            "reliable delivery, and practical collaboration with gig talent."
        )
    if len(d) > maximum:
        d = d[:maximum].rstrip()
    return d


def generate_employer_mock_profile_with_groq(*, base_url: str) -> dict:
    """
    Pre-browser mock: registration identity, company fields, and hiring preference enums.
    `industry` is filled later from DOM options + Groq inside complete_employer_onboarding.
    """
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment; cannot generate employer mock profile.")

    run_nonce = secrets.token_hex(8)
    prompt = (
        "Generate mock data for a WorkWise employer E2E registration and onboarding run.\n"
        f"Run correlation id (must influence your choices): {run_nonce}\n"
        "Invent a NEW fictional employer persona and company for THIS run only.\n"
        "Return JSON only (no markdown) with keys:\n"
        "- first_name\n"
        "- last_name\n"
        "- company_name (<=200 chars)\n"
        "- company_website (must be a valid https URL)\n"
        "- company_description (>=50 and <=1000 chars)\n"
        "- company_size — exactly one of: individual, 2-10, 11-50, 51-200, 200+\n"
        "- typical_project_budget — exactly one of: under_500, 500-2000, 2000-5000, 5000-10000, 10000+\n"
        "- typical_project_duration — exactly one of: short_term, medium_term, long_term, ongoing\n"
        "- preferred_experience_level — exactly one of: any, beginner, intermediate, expert\n"
        "- hiring_frequency — exactly one of: one_time, occasional, regular, ongoing\n"
    )

    _agent_session_log(
        "H-employer-mock",
        "employer_register.generate_employer_mock_profile_with_groq",
        "calling groq (employer identity + company + prefs)",
        data={"baseUrl": base_url, "runNonce": run_nonce},
        run_id="pre",
    )

    rng = random.Random(secrets.randbits(128))
    try:
        result = _call_groq_chat_json(
            api_key=api_key,
            prompt=prompt,
            temperature=0.97,
            top_p=0.92,
        )
    except Exception as exc:
        _agent_session_log(
            "H-employer-mock",
            "employer_register.generate_employer_mock_profile_with_groq",
            "groq failed; employer fallback mock",
            data={"error": str(exc)[:200], "runNonce": run_nonce},
            run_id="pre",
        )
        first_name = rng.choice(["Jordan", "Taylor", "Morgan", "Riley", "Casey", "Quinn", "Avery", "Blake"])
        last_name = rng.choice(
            ["Chen", "Murphy", "Okonkwo", "Berg", "Nielsen", "Patel", "Kowalski", "Santos", "Haddad", "Varga"]
        )
        company_name = rng.choice(
            [
                "Northwind Automation Labs",
                "Cedarline Product Studio",
                "Brightforge Digital Services",
                "Harborlight Operations Group",
                "Silvermaple Consulting Co",
            ]
        )
        company_website = rng.choice(
            [
                "https://example.com",
                "https://northwind-automation.example.com",
                "https://cedarline-studio.example.com",
            ]
        )
        company_description = _ensure_description_length(
            rng.choice(
                [
                    "We hire specialized gig talent for delivery-focused initiatives across product, operations, "
                    "and customer experience. Our teams value clarity, fast feedback loops, and measurable outcomes.",
                    "We partner with independent professionals to scale execution without sacrificing quality. "
                    "Communication, ownership, and pragmatic tooling are central to how we work with talent.",
                ]
            )
        )
        company_size = rng.choice(_ALLOWED_COMPANY_SIZES)
        typical_project_budget = rng.choice(_ALLOWED_BUDGETS)
        typical_project_duration = rng.choice(_ALLOWED_DURATIONS)
        preferred_experience_level = rng.choice(_ALLOWED_EXPERIENCE)
        hiring_frequency = rng.choice(_ALLOWED_HIRING_FREQUENCY)
    else:
        if not isinstance(result, dict):
            raise RuntimeError(f"Unexpected Groq result type: {type(result)}")
        first_name = str(result.get("first_name") or "").strip()
        last_name = str(result.get("last_name") or "").strip()
        company_name = str(result.get("company_name") or "").strip()
        company_website = _ensure_https_website(str(result.get("company_website") or ""))
        company_description = _ensure_description_length(str(result.get("company_description") or ""))
        company_size = _snap_to_allowed(str(result.get("company_size") or ""), _ALLOWED_COMPANY_SIZES, rng=rng)
        typical_project_budget = _snap_to_allowed(
            str(result.get("typical_project_budget") or ""), _ALLOWED_BUDGETS, rng=rng
        )
        typical_project_duration = _snap_to_allowed(
            str(result.get("typical_project_duration") or ""), _ALLOWED_DURATIONS, rng=rng
        )
        preferred_experience_level = _snap_to_allowed(
            str(result.get("preferred_experience_level") or ""), _ALLOWED_EXPERIENCE, rng=rng
        )
        hiring_frequency = _snap_to_allowed(
            str(result.get("hiring_frequency") or ""), _ALLOWED_HIRING_FREQUENCY, rng=rng
        )

    if not first_name or not last_name:
        raise RuntimeError("Employer mock missing first_name or last_name after generation.")
    if not company_name:
        company_name = f"WorkWise E2E Employer {secrets.token_hex(4)}"
    if len(company_name) > 200:
        company_name = company_name[:200].rstrip()

    suffix = _unique_suffix_digits()
    email = _build_ai_email(first_name=first_name, last_name=last_name, suffix=suffix, domain="example.com")

    _agent_session_log(
        "H-employer-mock",
        "employer_register.generate_employer_mock_profile_with_groq",
        "employer mock generated",
        data={
            "first": first_name,
            "last": last_name,
            "emailLocalPart": email.split("@", 1)[0],
            "companyLen": len(company_name),
            "descLen": len(company_description),
        },
        run_id="pre",
    )

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "company_name": company_name,
        "company_website": company_website,
        "company_description": company_description,
        "company_size": company_size,
        "typical_project_budget": typical_project_budget,
        "typical_project_duration": typical_project_duration,
        "preferred_experience_level": preferred_experience_level,
        "hiring_frequency": hiring_frequency,
        "industry": "",
    }


def _industry_option_values(page: Page) -> list[str]:
    raw = page.locator("#industry option").evaluate_all(
        "els => els.map(e => (e.value || '').trim()).filter(v => v.length > 0)"
    )
    return [str(v) for v in (raw or [])]


def pick_industry_with_groq(*, industries: list[str]) -> str:
    if not industries:
        raise RuntimeError("No industry options loaded from the page.")
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        return secrets.choice(industries)

    run_nonce = secrets.token_hex(8)
    shuffled = list(industries)
    random.Random(secrets.randbits(64)).shuffle(shuffled)
    prompt = (
        "Pick exactly ONE industry for employer onboarding.\n"
        f"Run correlation id: {run_nonce}\n"
        "Return JSON only with key: industry (string).\n"
        "industry MUST exactly match one entry from the list (same characters as in the list).\n"
        f"industries: {json.dumps(shuffled)}\n"
    )
    _agent_session_log(
        "H-employer-industry",
        "employer_register.pick_industry_with_groq",
        "calling groq",
        data={"count": len(industries), "runNonce": run_nonce},
        run_id="pre",
    )
    try:
        result = _call_groq_chat_json(api_key=api_key, prompt=prompt, temperature=0.85, top_p=0.9)
        picked = str((result or {}).get("industry") or "").strip()
    except Exception as exc:
        _agent_session_log(
            "H-employer-industry",
            "employer_register.pick_industry_with_groq",
            "groq failed; random industry",
            data={"error": str(exc)[:200]},
            run_id="pre",
        )
        return secrets.choice(industries)

    canon = {i.lower(): i for i in industries}
    return canon.get(picked.lower(), secrets.choice(industries))


def _service_category_labels_from_page(page: Page) -> list[str]:
    raw = page.evaluate(
        """() => {
          const out = [];
          for (const b of document.querySelectorAll('button[type="button"]')) {
            const t = (b.textContent || '').replace(/\\s+/g, ' ').trim();
            const m = t.match(/^\\+\\s+(.+)$/);
            if (m) out.push(m[1].trim());
          }
          return [...new Set(out)];
        }"""
    )
    return [str(x) for x in (raw or []) if x]


def pick_service_category_with_groq(*, categories: list[str]) -> str:
    if not categories:
        raise RuntimeError("No '+ category' service buttons found on hiring preferences step.")
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        return secrets.choice(categories)

    run_nonce = secrets.token_hex(8)
    shuffled = list(categories)
    random.Random(secrets.randbits(64)).shuffle(shuffled)
    prompt = (
        "Pick exactly ONE hiring service category for employer onboarding.\n"
        f"Run correlation id: {run_nonce}\n"
        "Return JSON only with key: service (string).\n"
        "service MUST exactly match one entry from the list.\n"
        f"services: {json.dumps(shuffled)}\n"
    )
    _agent_session_log(
        "H-employer-service",
        "employer_register.pick_service_category_with_groq",
        "calling groq",
        data={"count": len(categories), "runNonce": run_nonce},
        run_id="pre",
    )
    try:
        result = _call_groq_chat_json(api_key=api_key, prompt=prompt, temperature=0.85, top_p=0.9)
        picked = str((result or {}).get("service") or "").strip()
    except Exception as exc:
        _agent_session_log(
            "H-employer-service",
            "employer_register.pick_service_category_with_groq",
            "groq failed; random service",
            data={"error": str(exc)[:200]},
            run_id="pre",
        )
        return secrets.choice(categories)

    canon = {c.lower(): c for c in categories}
    return canon.get(picked.lower(), secrets.choice(categories))


def _click_plus_service_chip(page: Page, category: str) -> None:
    pat = re.compile(r"^\+\s+" + re.escape((category or "").strip()) + r"$", re.I)
    btn = page.locator('button[type="button"]').filter(has_text=pat).first
    expect(btn).to_be_visible(timeout=15_000)
    btn.evaluate("el => el.click()")


def _log_debug(payload: dict) -> None:
    _DEBUG_LOG.parent.mkdir(parents=True, exist_ok=True)
    payload.setdefault("timestamp", time.time())
    with _DEBUG_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, default=str) + "\n")


def _debug_0009cb(*, hypothesis_id: str, location: str, message: str, data: dict) -> None:
    # #region agent log
    logp = Path(__file__).resolve().parents[1] / "debug-0009cb.log"
    payload = {
        "sessionId": "0009cb",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    with logp.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, default=str) + "\n")
    # #endregion


def _onboarding_ui_snapshot(page: Page) -> dict:
    return page.evaluate(
        """() => {
          const ol = document.querySelector('[role="status"][aria-busy="true"]');
          const btns = Array.from(document.querySelectorAll('button')).map((b) => ({
            t: (b.textContent || '').replace(/\\s+/g,' ').trim().slice(0, 100),
            d: !!b.disabled,
          })).filter((x) => x.t).slice(0, 35);
          const h1 = document.querySelector('h1');
          return {
            path: window.location.pathname,
            overlay: !!ol,
            h1: h1 ? (h1.textContent || '').trim().slice(0, 120) : '',
            btns,
          };
        }"""
    )


def _employer_manual_final_timeout_hint(*, snapshot: dict) -> str:
    h1 = (snapshot.get("h1") or "").strip()
    if "review your profile" in h1.lower():
        return (
            "Still on Review Your Profile after timeout: try the blue Complete Profile control again; "
            "avoid Edit, Back, and browser history Back."
        )
    return (
        f"Browser left the final review (current heading: {h1!r}). "
        "Return to Step 5 and use only Complete Profile."
    )


def _wait_employer_dashboard_after_manual_final(
    page: Page, *, timeout_s: float = 120.0
) -> None:
    deadline = time.monotonic() + timeout_s
    warned_left_review = False
    while time.monotonic() < deadline:
        path = page.evaluate("() => window.location.pathname")
        if path == "/employer/dashboard" or path.startswith("/employer/dashboard/"):
            return
        snap = _onboarding_ui_snapshot(page)
        h1 = (snap.get("h1") or "").lower()
        if "review your profile" not in h1:
            if not warned_left_review:
                warned_left_review = True
                print(
                    "\n[playwright] You left the Review Your Profile screen. Return to Step 5 and use "
                    "Complete Profile only (avoid Edit, Back, browser Back).\n",
                    file=sys.stderr,
                )
                _debug_0009cb(
                    hypothesis_id="H-emp-left-review",
                    location="complete_employer_onboarding:manual-poll",
                    message="user navigated off final review during wait",
                    data=snap,
                )
        else:
            warned_left_review = False
        page.wait_for_timeout(500)

    snap = _onboarding_ui_snapshot(page)
    _debug_0009cb(
        hypothesis_id="H-emp-timeout",
        location="complete_employer_onboarding",
        message="timeout waiting for employer dashboard",
        data={"url": page.url, "snapshot": snap},
    )
    hint = _employer_manual_final_timeout_hint(snapshot=snap)
    raise RuntimeError(
        f"Employer onboarding did not reach /employer/dashboard. URL={page.url!r} {hint}"
    )


def normalize_base_url(url: str) -> str:
    url = url.rstrip("/")
    if not urlparse(url).scheme:
        url = "http://" + url
    return url


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
        _log_debug(
            {
                "hypothesisId": "H-inertia-overlay",
                "location": label or "wait_inertia_overlay",
                "message": "blocking overlay still present after timeout",
                "data": {"url": page.url},
            }
        )
        raise TimeoutError(
            f"Inertia loading overlay did not clear ({label or 'unknown step'}). URL={page.url!r}"
        ) from exc


def _wait_inertia_overlay_hidden_optional(page: Page, *, label: str = "", timeout: int = 30_000) -> None:
    try:
        _wait_inertia_overlay_hidden(page, label=label, timeout=timeout)
    except TimeoutError:
        _log_debug(
            {
                "hypothesisId": "H-inertia-overlay-optional",
                "location": label,
                "message": "overlay optional timeout; continuing",
                "data": {"url": page.url},
            }
        )


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
        _log_debug(
            {
                "hypothesisId": "H-dom-click-miss",
                "location": label,
                "message": "no matching button",
                "data": {"url": page.url, "wanted": text_must_include, "result": result},
            }
        )
        raise RuntimeError(
            f"Onboarding could not click {text_must_include!r} ({label}). URL={page.url!r} details={result!r}"
        )


def _employer_open_step2_company_identity(page: Page) -> None:
    for attempt in range(12):
        _log_debug(
            {
                "hypothesisId": "employer-step1-attempt",
                "location": "open-step2",
                "message": "try Get Started",
                "data": {"attempt": attempt, "url": page.url},
            }
        )
        _onboarding_primary_click(
            page,
            "get started",
            label=f"employer-step1-get-started-a{attempt}",
            prefer_blue_primary=True,
        )
        page.wait_for_timeout(500)
        try:
            page.locator("#industry").wait_for(state="visible", timeout=2_500)
            return
        except Exception:
            pass
    raise RuntimeError(
        f"Get Started did not open employer step 2 (#industry). URL={page.url!r}"
    )


def select_employer_role(page: Page) -> None:
    card = page.locator("div.cursor-pointer").filter(
        has=page.get_by_role("heading", name=re.compile(r"i'?m an employer", re.I))
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
    expect(
        page.get_by_role("heading", name=re.compile(r"sign up to hire talent", re.I))
    ).to_be_visible(timeout=15_000)

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
                return p.includes('/onboarding/employer') || p.includes('/id-verification');
            }""",
            timeout=60_000,
        )
    except Exception as exc:
        errors = page.locator("p.text-sm.text-red-600").all_inner_texts()
        _log_debug(
            {
                "hypothesisId": "H-inertia-wait",
                "location": "submit_registration:after-click",
                "message": "timeout waiting for post-register URL",
                "data": {"url": page.url, "validation_errors": errors},
            }
        )
        raise RuntimeError(
            f"Registration did not leave /register within 60s. URL={page.url!r} errors={errors!r}"
        ) from exc


def complete_employer_onboarding(
    page: Page,
    *,
    mock: dict,
    skip_logo: bool = False,
    submit_final: bool = True,
) -> None:
    expect(page).to_have_url(re.compile(r"/onboarding/employer"), timeout=15_000)

    page.wait_for_function(
        """
        () => {
          const t = document.body && (document.body.innerText || document.body.textContent) || '';
          return t.includes('Build your employer presence') && /get started/i.test(t);
        }
        """,
        timeout=90_000,
    )
    page.wait_for_timeout(1_200)
    _wait_inertia_overlay_hidden_optional(page, label="employer-after-land", timeout=30_000)

    _employer_open_step2_company_identity(page)

    company_name_el = page.locator("#company_name")
    expect(company_name_el).to_be_visible(timeout=15_000)
    company_name_el.fill(str(mock.get("company_name") or "").strip())

    industry = page.locator("#industry")
    expect(industry).to_be_enabled(timeout=10_000)
    industry_values = _industry_option_values(page)
    chosen_industry = pick_industry_with_groq(industries=industry_values)
    mock["industry"] = chosen_industry
    industry.select_option(value=chosen_industry)

    page.locator("#company_size").select_option(value=str(mock.get("company_size") or "2-10"))

    if not skip_logo:
        file_input = page.locator('input[type="file"][accept*="image"]').first
        if file_input.count() > 0:
            file_input.set_input_files(
                {
                    "name": "employer-logo.png",
                    "mimeType": "image/png",
                    "buffer": _MINIMAL_PNG_BYTES,
                }
            )
            page.wait_for_timeout(400)

    _onboarding_primary_click(page, "next step", label="employer-step2-next")
    _wait_inertia_overlay_hidden(page, label="employer-after-step2")

    page.locator("#company_website").fill(str(mock.get("company_website") or "").strip())
    page.locator("#company_description").fill(str(mock.get("company_description") or "").strip())

    _onboarding_primary_click(page, "next step", label="employer-step3-next")
    _wait_inertia_overlay_hidden(page, label="employer-after-step3")

    expect(page.get_by_role("heading", name=re.compile(r"hiring preferences", re.I))).to_be_visible(
        timeout=30_000
    )

    categories = _service_category_labels_from_page(page)
    if categories:
        service_pick = pick_service_category_with_groq(categories=categories)
        _click_plus_service_chip(page, service_pick)
    else:
        service_chip = page.locator('button[type="button"]').filter(has_text=re.compile(r"^\+\s+")).first
        expect(service_chip).to_be_visible(timeout=20_000)
        service_chip.evaluate("el => el.click()")
    page.wait_for_timeout(300)

    page.locator("#typical_project_budget").select_option(value=str(mock.get("typical_project_budget") or ""))
    page.locator("#typical_project_duration").select_option(value=str(mock.get("typical_project_duration") or ""))
    page.locator("#preferred_experience_level").select_option(
        value=str(mock.get("preferred_experience_level") or "")
    )
    page.locator("#hiring_frequency").select_option(value=str(mock.get("hiring_frequency") or ""))

    _onboarding_primary_click(page, "review profile", label="employer-step4-review")
    _wait_inertia_overlay_hidden(page, label="employer-after-step4")

    expect(
        page.get_by_role("heading", name=re.compile(r"review your profile", re.I))
    ).to_be_visible(timeout=30_000)

    if submit_final:
        _onboarding_primary_click(page, "complete profile", label="employer-step5-submit")
    else:
        _debug_0009cb(
            hypothesis_id="H-emp-manual-pre",
            location="complete_employer_onboarding:manual-final",
            message="state before readiness waits",
            data=_onboarding_ui_snapshot(page),
        )
        page.get_by_text(re.compile(r"step 5 of 5", re.I)).first.wait_for(
            state="visible", timeout=30_000
        )
        _wait_inertia_overlay_hidden_optional(
            page, label="employer-manual-final-overlay", timeout=60_000
        )
        submit_btn = (
            page.locator("button")
            .filter(has_text=re.compile(r"Complete Profile", re.I))
            .first
        )
        submit_btn.wait_for(state="visible", timeout=20_000)
        expect(submit_btn).to_be_enabled(timeout=15_000)
        submit_btn.scroll_into_view_if_needed()
        _debug_0009cb(
            hypothesis_id="H-emp-manual-post",
            location="complete_employer_onboarding:manual-final",
            message="step5 complete profile button ready for user",
            data=_onboarding_ui_snapshot(page),
        )
        print(
            '(Headed) On "Review Your Profile": use the blue Complete Profile button only.\n'
            "  Do not use pencil Edit, Back, or browser history Back.\n"
            "  Waiting for redirect to /employer/dashboard …"
        )

    if submit_final:
        try:
            page.wait_for_function(
                """() => {
                    const p = window.location.pathname;
                    return p === '/employer/dashboard' || p.startsWith('/employer/dashboard/');
                }""",
                timeout=120_000,
            )
        except Exception as exc:
            _log_debug(
                {
                    "hypothesisId": "H-employer-dashboard",
                    "location": "complete_employer_onboarding",
                    "message": "timeout waiting for employer dashboard",
                    "data": {"url": page.url},
                }
            )
            _debug_0009cb(
                hypothesis_id="H-emp-timeout",
                location="complete_employer_onboarding",
                message="timeout waiting for employer dashboard",
                data={"url": page.url, "snapshot": _onboarding_ui_snapshot(page)},
            )
            raise RuntimeError(
                f"Employer onboarding did not reach /employer/dashboard. URL={page.url!r}"
            ) from exc
    else:
        _wait_employer_dashboard_after_manual_final(page)


def _maybe_accept_fuzzy_skill_prompt(page: Page) -> None:
    use_btn = page.get_by_role("button", name=re.compile(r'^Use\s+"'))
    try:
        if use_btn.count() > 0 and use_btn.first.is_visible():
            use_btn.first.click(timeout=2_000)
            page.wait_for_timeout(300)
    except Exception:
        pass


def _pad_job_description(desc: str, *, minimum: int = 100, maximum: int = 4000) -> str:
    d = (desc or "").strip()
    filler = (
        " Deliverables, timeline, and communication expectations should be explicit. "
        "The hire will collaborate async, share progress checkpoints, and document handoff notes for maintainability."
    )
    while len(d) < minimum:
        d = (d + filler).strip()
    if len(d) > maximum:
        d = d[:maximum].rstrip()
    return d


def _coerce_job_float(v, *, default: float, minimum: float = 5.0) -> float:
    try:
        x = float(v)
    except (TypeError, ValueError):
        x = default
    if x < minimum:
        x = minimum
    return round(x, 2)


def generate_job_posting_with_groq(*, base_url: str) -> dict:
    """
    Groq JSON for /jobs/create: title, description (100+ chars), budgets, duration, remote, optional category, skill_hints.
    """
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment; cannot generate job posting mock.")

    run_nonce = secrets.token_hex(8)
    prompt = (
        "Generate mock data for posting a gig job on WorkWise (E2E test).\n"
        f"Run correlation id: {run_nonce}\n"
        "Return JSON only (no markdown) with keys:\n"
        "- title (concise job title, <=200 chars)\n"
        "- description (>=100 chars, <=3500; specific requirements and deliverables)\n"
        "- budget_type: exactly fixed or hourly\n"
        "- budget_min: number >= 5\n"
        "- budget_max: number >= budget_min\n"
        "- estimated_duration_days: integer >= 1\n"
        "- is_remote: boolean (prefer true for simpler E2E)\n"
        "- location: string (empty string if is_remote is true)\n"
        "- project_category: string or empty (optional; a plausible category label like Web Development, Graphic Design)\n"
        "- skill_hints: array of 1 to 3 short skill strings (e.g. JavaScript, Figma) for UI fallback\n"
    )

    _agent_session_log(
        "H-employer-job",
        "employer_register.generate_job_posting_with_groq",
        "calling groq (job posting)",
        data={"baseUrl": base_url, "runNonce": run_nonce},
        run_id="pre",
    )

    rng = random.Random(secrets.randbits(128))
    try:
        result = _call_groq_chat_json(
            api_key=api_key,
            prompt=prompt,
            temperature=0.95,
            top_p=0.92,
            max_tokens=1400,
        )
    except Exception as exc:
        _agent_session_log(
            "H-employer-job",
            "employer_register.generate_job_posting_with_groq",
            "groq failed; job fallback",
            data={"error": str(exc)[:200], "runNonce": run_nonce},
            run_id="pre",
        )
        title = rng.choice(
            [
                "E2E: React dashboard polish + bugfix pass",
                "E2E: Laravel API documentation and Postman collection",
                "E2E: Mobile-responsive landing page refresh",
            ]
        )
        description = _pad_job_description(
            "We need an independent professional to execute a scoped deliverable with clear acceptance criteria, "
            "weekly async updates, and a short handoff document. Quality bar: production-ready output, accessible UI, "
            "and pragmatic test coverage where applicable. Timeline is tight but realistic; scope is frozen after kickoff."
        )
        budget_type = "fixed"
        bmin = 500.0
        bmax = 2500.0
        estimated_duration_days = 21
        is_remote = True
        location = ""
        project_category = ""
        skill_hints = ["JavaScript", "React", "CSS"]
    else:
        if not isinstance(result, dict):
            raise RuntimeError(f"Unexpected Groq job result type: {type(result)}")
        title = str(result.get("title") or "").strip()
        description = _pad_job_description(str(result.get("description") or ""))
        budget_type = str(result.get("budget_type") or "fixed").strip().lower()
        if budget_type not in ("fixed", "hourly"):
            budget_type = "fixed"
        bmin = _coerce_job_float(result.get("budget_min"), default=100.0)
        bmax = _coerce_job_float(result.get("budget_max"), default=max(bmin, 500.0))
        if bmax < bmin:
            bmax = bmin
        try:
            estimated_duration_days = max(1, int(float(result.get("estimated_duration_days") or 14)))
        except (TypeError, ValueError):
            estimated_duration_days = 14
        is_remote = bool(result.get("is_remote", True))
        location = "" if is_remote else str(result.get("location") or "Cebu, Philippines").strip()
        project_category = str(result.get("project_category") or "").strip()
        hints = result.get("skill_hints") or []
        if isinstance(hints, list):
            skill_hints = [str(h).strip() for h in hints if str(h).strip()][:3]
        else:
            skill_hints = []
        if not skill_hints:
            skill_hints = ["JavaScript", "Communication", "QA"]

    if not title:
        title = f"E2E Job {secrets.token_hex(4)}"
    if len(title) > 200:
        title = title[:200].rstrip()

    out = {
        "title": title,
        "description": description,
        "budget_type": budget_type,
        "budget_min": str(bmin),
        "budget_max": str(bmax),
        "estimated_duration_days": str(estimated_duration_days),
        "is_remote": is_remote,
        "location": location,
        "project_category": project_category,
        "skill_hints": skill_hints,
    }
    _agent_session_log(
        "H-employer-job",
        "employer_register.generate_job_posting_with_groq",
        "job mock ready",
        data={"titleLen": len(title), "descLen": len(description), "budgetType": budget_type},
        run_id="pre",
    )
    return out


def _job_added_skills_visible_count(page: Page) -> int:
    """Parse 'Added Skills (N)' label from SkillExperienceSelector."""
    try:
        loc = page.get_by_text(re.compile(r"Added Skills\s*\(\d+\)"))
        if loc.count() == 0:
            return 0
        t = loc.first.inner_text(timeout=2_000)
        m = re.search(r"\((\d+)\)", t)
        return int(m.group(1)) if m else 0
    except Exception:
        return 0


def _click_plus_job_skill_chips(page: Page, *, max_clicks: int = 3) -> int:
    """
    Click '+ SkillName' suggestion / emerging chips on Jobs/Create (not yet added).
    Returns approximate number of click attempts made.
    """
    clicks = 0
    for _ in range(max_clicks):
        clicked = page.evaluate(
            """() => {
              const buttons = Array.from(document.querySelectorAll('button[type="button"]'));
              for (const b of buttons) {
                if (b.disabled) continue;
                const t = (b.textContent || '').replace(/\\s+/g, ' ').trim();
                if (!/^\\+\\s+\\S/.test(t)) continue;
                if (/^\\+\\s*Add\\b/i.test(t)) continue;
                if (/^\\+\\s+Add all/i.test(t)) continue;
                const st = window.getComputedStyle(b);
                if (st.visibility === 'hidden' || st.display === 'none') continue;
                const r = b.getBoundingClientRect();
                if (r.width < 2 || r.height < 2) continue;
                b.click();
                return true;
              }
              return false;
            }"""
        )
        if not clicked:
            break
        clicks += 1
        page.wait_for_timeout(350)
    return clicks


def _add_skills_via_selector_fallback(page: Page, skill_hints: list[str]) -> None:
    skill_input = page.get_by_placeholder("Type or add custom skill...")
    expect(skill_input).to_be_visible(timeout=15_000)
    for hint in skill_hints:
        if _job_added_skills_visible_count(page) >= 1:
            return
        h = (hint or "").strip()
        if not h:
            continue
        skill_input.click()
        skill_input.fill("")
        skill_input.fill(h)
        page.wait_for_timeout(450)
        drop = page.locator("div.absolute.z-10").filter(has=page.locator("button")).first
        try:
            if drop.count() > 0 and drop.is_visible():
                opt = drop.locator("button").filter(has_text=re.compile(re.escape(h), re.I)).first
                if opt.count() > 0:
                    opt.click(timeout=3_000)
                else:
                    drop.locator("button").first.click(timeout=3_000)
            else:
                skill_input.press("Enter")
        except Exception:
            skill_input.press("Enter")
        page.wait_for_timeout(400)
        _maybe_accept_fuzzy_skill_prompt(page)
        page.wait_for_timeout(300)


def complete_job_create(
    page: Page, *, base_url: str, job: dict, submit: bool = True
) -> None:
    """
    Assumes logged-in employer. Navigates to /jobs/create and fills Groq job dict.
    If submit is True (default), clicks Post Job and waits for /jobs/{id}.
    If submit is False, stops once the form is filled and the submit button is enabled.
    """
    base = base_url.rstrip("/")
    page.goto(urljoin(base + "/", "jobs/create"), wait_until="domcontentloaded")
    _wait_inertia_overlay_hidden_optional(page, label="job-create-land", timeout=30_000)

    expect(page.locator("#title")).to_be_visible(timeout=30_000)
    page.get_by_role("heading", name=re.compile(r"post a new job", re.I)).first.wait_for(state="visible", timeout=15_000)

    page.locator("#title").fill(str(job.get("title") or "").strip())
    page.locator("#description").fill(str(job.get("description") or "").strip())

    page.wait_for_timeout(800)
    _click_plus_job_skill_chips(page, max_clicks=3)
    if _job_added_skills_visible_count(page) < 1:
        _add_skills_via_selector_fallback(page, list(job.get("skill_hints") or []))

    if _job_added_skills_visible_count(page) < 1:
        raise RuntimeError(
            "Job create: could not add at least one skill (chips + selector fallback failed). "
            f"URL={page.url!r}"
        )

    bt = str(job.get("budget_type") or "fixed").lower()
    if bt not in ("fixed", "hourly"):
        bt = "fixed"
    page.locator(f'input[name="budget_type"][value="{bt}"]').click()

    num_inputs = page.locator('form input[type="number"]')
    ncount = num_inputs.count()
    if ncount < 2:
        raise RuntimeError(f"Job create: expected budget number inputs in form, found {ncount}. URL={page.url!r}")
    num_inputs.nth(0).fill(str(job.get("budget_min") or "100"))
    num_inputs.nth(1).fill(str(job.get("budget_max") or "500"))

    page.locator("#estimated_duration_days").fill(str(job.get("estimated_duration_days") or "14"))

    cat = str(job.get("project_category") or "").strip()
    if cat:
        opts = page.locator("#project_category option").evaluate_all(
            "els => els.map(e => (e.value || '').trim()).filter(Boolean)"
        )
        canon = {str(o).lower(): str(o) for o in (opts or [])}
        if cat.lower() in canon:
            page.locator("#project_category").select_option(value=canon[cat.lower()])

    remote = bool(job.get("is_remote", True))
    remote_box = page.get_by_label(re.compile(r"remote work", re.I))
    if remote_box.count():
        if remote and not remote_box.is_checked():
            remote_box.check()
        elif not remote and remote_box.is_checked():
            remote_box.uncheck()

    if not remote:
        page.locator("#location").fill(str(job.get("location") or "Cebu, Philippines"))

    submit_btn = page.locator('button[type="submit"]').filter(has_text=re.compile(r"post job", re.I)).first
    expect(submit_btn).to_be_enabled(timeout=15_000)
    if not submit:
        # #region agent log
        _ns = {
            "sessionId": "7e85dd",
            "runId": "verify",
            "hypothesisId": "H-no-submit",
            "location": "employer_register.py:complete_job_create",
            "message": "submit=False; skipping Post Job click",
            "data": {"url": page.url},
            "timestamp": int(time.time() * 1000),
        }
        try:
            with open(
                Path(__file__).resolve().parents[1] / "debug-7e85dd.log",
                "a",
                encoding="utf-8",
            ) as f:
                f.write(json.dumps(_ns) + "\n")
        except OSError:
            pass
        # #endregion
        return

    submit_btn.evaluate("el => el.click()")

    _wait_inertia_overlay_hidden_optional(page, label="job-create-after-submit", timeout=60_000)

    try:
        page.wait_for_function(
            """() => {
                const p = window.location.pathname;
                return /^\\/jobs\\/\\d+/.test(p);
            }""",
            timeout=120_000,
        )
    except Exception as exc:
        _log_debug(
            {
                "hypothesisId": "H-job-create-submit",
                "location": "complete_job_create",
                "message": "timeout waiting for /jobs/{id}",
                "data": {"url": page.url},
            }
        )
        raise RuntimeError(f"Job create did not redirect to /jobs/{{id}}. URL={page.url!r}") from exc


def main() -> None:
    parser = argparse.ArgumentParser(description="Register an employer via the browser UI.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="App root URL")
    parser.add_argument("--headed", action="store_true", help="Show browser")
    parser.add_argument(
        "--auto-close",
        action="store_true",
        help="With --headed, close the browser immediately (no terminal prompt).",
    )
    parser.add_argument("--slowmo", type=int, default=0, help="Slow motion (ms)")
    parser.add_argument(
        "--password",
        default="TestPass1!",
        help="Must satisfy UI rules: 8+ chars, upper, lower, number, symbol.",
    )
    parser.add_argument(
        "--complete-onboarding",
        action="store_true",
        help="After register, complete steps 1–5 and land on /employer/dashboard.",
    )
    parser.add_argument(
        "--skip-logo",
        action="store_true",
        help="Skip optional company logo upload on step 2.",
    )
    parser.add_argument(
        "--post-job",
        action="store_true",
        help="After --complete-onboarding, generate a Groq job draft and submit /jobs/create (same session).",
    )
    parser.add_argument(
        "--manual-final-onboarding-step",
        action="store_true",
        help="With --headed and --complete-onboarding, do not click the final "
        '"Complete profile" button; click it in the UI (script waits for dashboard).',
    )
    args = parser.parse_args()

    if args.post_job and not args.complete_onboarding:
        parser.error("--post-job requires --complete-onboarding in the same run.")

    if args.manual_final_onboarding_step:
        if not args.complete_onboarding:
            parser.error(
                "--manual-final-onboarding-step requires --complete-onboarding in the same run."
            )
        if not args.headed:
            parser.error(
                "--manual-final-onboarding-step requires --headed (no final click in headless)."
            )

    base = normalize_base_url(args.base_url)
    _load_env_file_vars(
        dotenv_path=Path(__file__).resolve().parents[1] / ".env",
        required_keys=["GROQ_API_KEY"],
    )
    mock = generate_employer_mock_profile_with_groq(base_url=base)

    # region agent log
    _hot_path = Path(__file__).resolve().parents[1] / "public" / "hot"
    _hot_payload = {"exists": _hot_path.is_file()}
    if _hot_path.is_file():
        _hot_payload["content"] = (
            _hot_path.read_text(encoding="utf-8").strip()[:120]
        )
    _debug_ndjson(
        location="employer_register.py:main",
        message="vite_hot_file",
        hypothesis_id="H2",
        data=_hot_payload,
    )
    if _hot_path.is_file():
        _vite = (_hot_payload.get("content") or "").strip()
        _tv = time.time()
        _vite_reach: dict = {"vite_url": _vite, "reachable": False, "error": None}
        if _vite:
            try:
                urllib.request.urlopen(
                    _vite.rstrip("/") + "/", timeout=3
                )
                _vite_reach["reachable"] = True
            except (urllib.error.URLError, OSError, TimeoutError) as e:
                _vite_reach["error"] = f"{type(e).__name__}:{str(e)[:200]}"
            _vite_reach["elapsed_ms"] = int((time.time() - _tv) * 1000)
        _debug_ndjson(
            location="employer_register.py:main",
            message="vite_tcp_probe",
            hypothesis_id="H2",
            data=_vite_reach,
        )
    _rs_url = urljoin(base + "/", "role-selection")
    _t_http = time.time()
    try:
        _req = urllib.request.Request(
            _rs_url, headers={"User-Agent": "WorkWise-debug-probe/1"}
        )
        with urllib.request.urlopen(_req, timeout=15) as resp:
            _st = resp.status
            _body = resp.read()
        _elapsed = int((time.time() - _t_http) * 1000)
        _debug_ndjson(
            location="employer_register.py:main",
            message="http_probe_role_selection",
            hypothesis_id="H1",
            data={
                "url": _rs_url,
                "ok": True,
                "status": _st,
                "body_len": len(_body),
                "elapsed_ms": _elapsed,
                "H3_slow_response": _elapsed > 8000,
            },
        )
    except Exception as e:
        _debug_ndjson(
            location="employer_register.py:main",
            message="http_probe_role_selection",
            hypothesis_id="H1",
            data={
                "url": _rs_url,
                "ok": False,
                "error": f"{type(e).__name__}:{str(e)[:300]}",
                "elapsed_ms": int((time.time() - _t_http) * 1000),
            },
        )
    # endregion

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, slow_mo=args.slowmo)
        context = browser.new_context()
        page = context.new_page()

        # region agent log
        _goto_u = urljoin(base + "/", "role-selection")
        _debug_ndjson(
            location="employer_register.py:main",
            message="before_playwright_goto",
            hypothesis_id="H5",
            data={"url": _goto_u},
        )
        # endregion
        try:
            page.goto(_goto_u, wait_until="domcontentloaded")
        except Exception as e:
            # region agent log
            _debug_ndjson(
                location="employer_register.py:main",
                message="playwright_goto_failed",
                hypothesis_id="H4",
                data={"error": type(e).__name__, "msg": str(e)[:500]},
            )
            # endregion
            raise
        select_employer_role(page)

        submit_registration(
            page,
            first_name=str(mock.get("first_name") or ""),
            last_name=str(mock.get("last_name") or ""),
            email=str(mock.get("email") or ""),
            password=args.password,
        )

        url = page.url
        if re.search(r"/onboarding/employer", url):
            print("OK: Employer onboarding URL reached.")
        elif re.search(r"id-verification", url):
            print("OK: Registered; redirected to ID verification (mandatory KYC may be on).")
        else:
            raise AssertionError(f"Unexpected URL after registration: {url}")

        print(f"    Email: {mock.get('email')}")

        if args.complete_onboarding:
            if re.search(r"id-verification", page.url):
                raise RuntimeError(
                    "Cannot run --complete-onboarding: account was sent to ID verification first."
                )
            print("Completing employer onboarding (steps 1-5) ...")
            complete_employer_onboarding(
                page,
                mock=mock,
                skip_logo=args.skip_logo,
                submit_final=not args.manual_final_onboarding_step,
            )
            print("OK: Employer profile complete - landed on dashboard.")

            if args.post_job:
                print("Generating job posting (Groq) and submitting /jobs/create …")
                job = generate_job_posting_with_groq(base_url=base)
                complete_job_create(page, base_url=base, job=job)
                print(f"OK: Job posted — {page.url}")

        if args.headed and not args.auto_close:
            print(
                "\nBrowser left open — press Enter here to close the browser and exit."
            )
            try:
                input()
            except EOFError:
                pass

        browser.close()


if __name__ == "__main__":
    main()
