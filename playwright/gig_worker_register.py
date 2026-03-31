"""
Automate gig worker registration for WorkWise (Laravel + Inertia).

Flow:
  1. /role-selection  -> choose "I'm a gig worker" -> Continue
  2. /register        -> fill form -> Create my account
  3. Expect redirect to gig worker onboarding (/onboarding/gig-worker)

Setup:
  pip install -r playwright/requirements.txt
  playwright install chromium

Run (app must be running):
  python playwright/gig_worker_register.py --base-url http://127.0.0.1:8000

Register + complete all onboarding steps (same browser session), then expect /jobs:

  python playwright/gig_worker_register.py --base-url http://127.0.0.1:8000 --complete-onboarding

Debug / continue onboarding manually:
  python playwright/gig_worker_register.py --headed --slowmo 200

  With --headed, the browser stays open until you press Enter in the terminal.
  Use --auto-close with --headed to close immediately without waiting.
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
from pathlib import Path
import urllib.request
import urllib.error
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Page, expect, sync_playwright

from groq_e2e import (
    _agent_session_log,
    _build_ai_email,
    _call_groq_chat_json,
    _load_env_file_vars,
    _unique_suffix_digits,
)

# Debug log (append on failure); path relative to repo root
_DEBUG_LOG = Path(__file__).resolve().parents[1] / ".cursor" / "debug-playwright-registration.log"

# 1×1 PNG bytes (avoid temp files: Windows can race delete vs browser read → broken multipart / "failed to upload")
_MINIMAL_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


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


def _gig_worker_manual_final_timeout_hint(*, snapshot: dict) -> str:
    h1 = (snapshot.get("h1") or "").strip()
    if "final profile review" in h1.lower():
        return (
            "Still on Final Profile Review after timeout: the blue Submit Profile control may not have run, "
            "or navigation to /jobs failed. Try again; avoid Edit, Back to previous step, and browser history Back."
        )
    return (
        f"Browser left Final Profile Review (current heading: {h1!r}). "
        "Return to Step 5, then use only the blue Submit Profile control. "
        "Do not use pencil Edit on the cards, Back to previous step, or browser Back—they navigate away without submitting."
    )


def _wait_jobs_after_manual_gig_submit(
    page: Page, *, timeout_s: float = 120.0
) -> None:
    """Poll for /jobs; warn if user navigates off Step 5 (runtime evidence: timeout snapshot on step 2)."""
    deadline = time.monotonic() + timeout_s
    warned_left_review = False
    while time.monotonic() < deadline:
        path = page.evaluate("() => window.location.pathname")
        if path == "/jobs" or path.startswith("/jobs/"):
            return
        snap = _onboarding_ui_snapshot(page)
        h1 = (snap.get("h1") or "").lower()
        if "final profile review" not in h1:
            if not warned_left_review:
                warned_left_review = True
                print(
                    "\n[playwright] You left the Final Profile Review screen. Return to Step 5 and submit "
                    "with the blue Submit Profile button only (avoid Edit, Back, and browser Back).\n",
                    file=sys.stderr,
                )
                # #region agent log
                _debug_0009cb(
                    hypothesis_id="H-left-review",
                    location="complete_gig_worker_onboarding:manual-poll",
                    message="user navigated off final review during wait",
                    data=snap,
                )
                # #endregion
        else:
            warned_left_review = False
        page.wait_for_timeout(500)

    snap = _onboarding_ui_snapshot(page)
    _debug_0009cb(
        hypothesis_id="H-timeout",
        location="complete_gig_worker_onboarding:after-submit",
        message="timeout waiting for /jobs",
        data={"url": page.url, "snapshot": snap},
    )
    hint = _gig_worker_manual_final_timeout_hint(snapshot=snap)
    raise RuntimeError(
        f"Onboarding submit did not reach /jobs in time. URL={page.url!r} {hint}"
    )


def _wait_inertia_overlay_hidden(page: Page, *, label: str = "", timeout: int = 60_000) -> None:
    """
    app.jsx sets SHOW_OVERLAY_FOR_ALL: every Inertia visit shows a full-screen LoadingOverlay
    (role=status, aria-busy=true, z-9999) that blocks clicks.

    Important: the overlay mounts ~150ms after visit:start. Waiting immediately used to succeed
    with "no element" before the overlay appeared — then clicks were lost. We always pause briefly
    first so the overlay can mount, then wait until it is gone or fully faded.
    """
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
    """Wait for overlay to clear; if it never does (stuck React state), log and continue."""
    try:
        _wait_inertia_overlay_hidden(page, label=label, timeout=timeout)
    except TimeoutError:
        _log_debug(
            {
                "hypothesisId": "H-inertia-overlay-optional",
                "location": label,
                "message": "overlay did not clear in time; continuing with DOM click fallback",
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
    """
    Click an onboarding footer/primary button.

    Playwright's locator.click() uses real pointer coordinates — the global LoadingOverlay
    (z-9999) intercepts them. Calling element.click() in the page fires the button's listener
    without hit-testing (once React has hydrated).

    Uses textContent (not only innerText), visibility checks, and prefers footer / blue CTA
    buttons when requested (matches Step 1 "Get Started" = bg-blue-600).
    """
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


def _onboarding_open_step2_professional_info(page: Page) -> None:
    """
    Step 1 → 2: SSR can paint Welcome + Get Started before React hydrates; first clicks are no-ops.
    Retry DOM clicks until #professional_title exists (max ~15s).
    """
    for attempt in range(12):
        _log_debug(
            {
                "hypothesisId": "H-step1-attempt",
                "location": "open-step2",
                "message": "try Get Started",
                "data": {"attempt": attempt, "url": page.url, "readyState": page.evaluate("document.readyState")},
            }
        )
        _onboarding_primary_click(
            page,
            "get started",
            label=f"onboarding-step1-get-started-a{attempt}",
            prefer_blue_primary=True,
        )
        page.wait_for_timeout(500)
        try:
            page.locator("#professional_title").wait_for(state="visible", timeout=2_500)
            _log_debug(
                {
                    "hypothesisId": "H-step1-advanced",
                    "location": "open-step2",
                    "message": "step2 visible",
                    "data": {"attempt": attempt},
                }
            )
            return
        except Exception:
            pass
    _log_debug(
        {
            "hypothesisId": "H-step1-failed",
            "location": "open-step2",
            "message": "never reached professional_title",
            "data": {"url": page.url},
        }
    )
    raise RuntimeError(
        f"Get Started did not open step 2 (#professional_title) after retries. URL={page.url!r}"
    )


def normalize_base_url(url: str) -> str:
    url = url.rstrip("/")
    if not urlparse(url).scheme:
        url = "http://" + url
    return url


def _fetch_skill_suggestions(*, base_url: str, limit: int = 50) -> list[str]:
    url = urljoin(base_url + "/", f"api/skills/suggestions?limit={limit}")
    req = urllib.request.Request(url, method="GET", headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    data = json.loads(raw)
    skills = data.get("skills") or []
    if not isinstance(skills, list):
        raise RuntimeError(f"Unexpected skills response type: {type(skills)}")
    return [str(s) for s in skills]


def _pick_biased_proficiency(*, rng: random.Random) -> str:
    """
    Biased proficiency:
      - beginner: 20%
      - intermediate: 60%
      - expert: 20%
    """
    x = rng.random()
    if x < 0.20:
        return "beginner"
    if x < 0.80:
        return "intermediate"
    return "expert"


def _fallback_random_identity() -> tuple[str, str, str, str]:
    """Deterministic-enough random persona when Groq fails or returns an unusable shape."""
    rng = random.Random(secrets.randbits(128))
    first_name = rng.choice(
        [
            "Ava",
            "Liam",
            "Noah",
            "Emma",
            "Olivia",
            "Ethan",
            "Mia",
            "Lucas",
            "Priya",
            "Diego",
            "Yuki",
            "Amara",
            "Kofi",
            "Sofia",
            "Mateo",
            "Zara",
            "Jamal",
            "Elena",
        ]
    )
    last_name = rng.choice(
        [
            "Smith",
            "Garcia",
            "Santos",
            "Reyes",
            "Bautista",
            "Nguyen",
            "Khan",
            "Kim",
            "Okafor",
            "Patel",
            "Hernandez",
            "Nakamura",
            "Okonkwo",
            "Silva",
            "Andersen",
            "Fernandez",
            "Kowalski",
            "Haddad",
        ]
    )
    title = rng.choice(
        [
            "QA Automation Specialist",
            "Test Automation Engineer",
            "Software QA Analyst",
            "Automation QA Lead",
            "QA Engineer (E2E Focus)",
            "Freelance Data Entry Specialist",
            "Virtual Executive Assistant",
            "UX Research Coordinator",
            "Content Localization Reviewer",
            "IT Support Technician (Remote)",
        ]
    )
    bio = rng.choice(
        [
            "I build reliable automation for real-world web applications: end-to-end regression coverage, flaky test reduction, "
            "and clear reporting for engineering teams. I focus on maintainable Playwright-style workflows and strong edge-case thinking.",
            "I specialize in end-to-end testing that actually ships: robust selectors, deterministic runs, and pragmatic coverage. "
            "My goal is to reduce surprises by catching issues early and communicating results clearly to the team.",
            "I automate critical flows with an E2E-first mindset. From login paths to complex UI interactions, I build reliable tests, "
            "keep suites fast, and provide actionable evidence to improve product quality.",
            "I help teams ship with confidence by documenting flows, triaging defects, and keeping regression suites lean but meaningful.",
            "I combine attention to detail with pragmatic tooling: clear test plans, stable environments, and honest status reporting.",
        ]
    )
    return first_name, last_name, title, bio


def _normalize_groq_identity_object(raw: object) -> dict | None:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, list) and len(raw) == 1 and isinstance(raw[0], dict):
        return raw[0]
    return None


def _identity_layer_dicts(result: dict) -> list[dict]:
    """Nested objects first, then top-level (avoids empty top-level keys hiding nested values)."""
    layers: list[dict] = []
    for key in ("profile", "user", "person", "data", "identity", "gig_worker", "worker"):
        inner = result.get(key)
        if isinstance(inner, dict):
            layers.append(inner)
    layers.append(result)
    return layers


def _first_nonempty_field(dicts: list[dict], *key_variants: str) -> str:
    for d in dicts:
        for k in key_variants:
            v = d.get(k)
            if v is not None and str(v).strip():
                return str(v).strip()
    return ""


def _extract_identity_from_groq_dict(result: dict) -> tuple[str, str, str, str]:
    layers = _identity_layer_dicts(result)
    first_name = _first_nonempty_field(
        layers, "first_name", "firstName", "given_name", "givenName", "fname"
    )
    last_name = _first_nonempty_field(
        layers, "last_name", "lastName", "family_name", "familyName", "surname", "lname"
    )
    title = _first_nonempty_field(
        layers,
        "professional_title",
        "professionalTitle",
        "title",
        "job_title",
        "jobTitle",
        "headline",
    )
    bio = _first_nonempty_field(
        layers, "bio", "biography", "about", "description", "summary"
    )
    return first_name, last_name, title, bio


def generate_mock_profile_with_groq(*, base_url: str) -> dict:
    """
    Generate the *identity + Step 2 content* mock profile (name/title/bio/email).

    Skills require authenticated access to `/api/skills/suggestions`, so we fill
    `skills_with_proficiency` later after registration using the logged-in browser session.
    """
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment; cannot generate mock profile.")

    run_nonce = secrets.token_hex(8)
    prompt = (
        "Generate mock onboarding data for a WorkWise gig worker E2E run.\n"
        f"Run correlation id (must influence your choices): {run_nonce}\n"
        "Invent a completely NEW fictional person for THIS run only — vary naming style, region, job niche, "
        "seniority, and bio voice. Avoid repeating the same first+last name or title you would use for another id.\n"
        "Return JSON only (no markdown) with keys:\n"
        "- first_name\n"
        "- last_name\n"
        "- professional_title (<=150 chars)\n"
        "- bio (<=1000 chars)\n"
        "Constraints:\n"
        "- professional_title length <= 150 characters.\n"
        "- bio length <= 1000 characters.\n"
    )

    _agent_session_log(
        "H-mock-gen",
        "generate-mock",
        "calling groq (identity+step2 content)",
        data={"baseUrl": base_url, "runNonce": run_nonce},
        run_id="pre",
    )
    try:
        result = _call_groq_chat_json(
            api_key=api_key,
            prompt=prompt,
            temperature=0.97,
            top_p=0.92,
        )
    except Exception as exc:
        # If Groq is forbidden/unreachable, fall back to local mock data so the E2E run can proceed.
        _agent_session_log(
            "H-mock-gen",
            "generate-mock",
            "groq failed; using fallback identity+content",
            data={"error": str(exc)[:200], "runNonce": run_nonce},
            run_id="pre",
        )
        first_name, last_name, title, bio = _fallback_random_identity()
    else:
        normalized = _normalize_groq_identity_object(result)
        if normalized is None:
            # #region agent log
            _agent_session_log(
                "H-mock-shape",
                "generate_mock_profile_with_groq",
                "groq returned non-dict identity; using fallback",
                data={
                    "rawType": type(result).__name__,
                    "runNonce": run_nonce,
                },
                run_id="verify",
            )
            # #endregion
            first_name, last_name, title, bio = _fallback_random_identity()
        else:
            first_name, last_name, title, bio = _extract_identity_from_groq_dict(normalized)
            if not first_name or not last_name or not title or not bio:
                # #region agent log
                _agent_session_log(
                    "H-mock-empty-fields",
                    "generate_mock_profile_with_groq",
                    "groq JSON parsed but identity fields empty after extraction; using fallback",
                    data={
                        "topKeys": list(normalized.keys())[:40],
                        "lenFirst": len(first_name),
                        "lenLast": len(last_name),
                        "lenTitle": len(title),
                        "lenBio": len(bio),
                        "runNonce": run_nonce,
                    },
                    run_id="verify",
                )
                # #endregion
                first_name, last_name, title, bio = _fallback_random_identity()

    if not first_name or not last_name or not title or not bio:
        raise RuntimeError(
            "Mock identity content missing after generation (internal fallback failed — report this)."
        )

    if len(title) > 150:
        title = title[:150].rstrip()
    if len(bio) > 1000:
        bio = bio[:1000].rstrip()

    suffix = _unique_suffix_digits()
    email = _build_ai_email(first_name=first_name, last_name=last_name, suffix=suffix, domain="example.com")

    _agent_session_log(
        "H-mock-gen",
        "generate-mock",
        "groq mock identity generated",
        data={
            "first": first_name,
            "last": last_name,
            "emailLocalPart": email.split("@", 1)[0],
            "titleLen": len(title),
            "bioLen": len(bio),
        },
        run_id="pre",
    )

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "professional_title": title,
        "bio": bio,
        "hourly_rate": 850,
        "skills_with_proficiency": [],
    }


def _fetch_skill_suggestions_via_page_request(*, page: Page, base_url: str, limit: int = 50) -> list[str]:
    """
    Fetch suggestions using the logged-in Playwright session (auth cookies/headers),
    because `/api/skills/suggestions` can be protected.
    """
    url = urljoin(base_url + "/", f"api/skills/suggestions?limit={limit}")
    resp = page.request.get(url, headers={"Accept": "application/json"})
    if not resp.ok:
        raise RuntimeError(f"Failed to fetch skill suggestions via page.request: HTTP {resp.status}")
    data = resp.json()
    skills = data.get("skills") or []
    if not isinstance(skills, list):
        raise RuntimeError(f"Unexpected suggestions response type: {type(skills)}")
    return [str(s) for s in skills]


def generate_skills_with_proficiency_via_groq(*, base_url: str, page: Page, suggestions: list[str]) -> list[dict]:
    """
    Use Groq to pick 3 skills from the *verified suggestions list*,
    then assign biased proficiency per skill (in Python).
    """
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment; cannot generate mock skills.")

    run_nonce = secrets.token_hex(8)
    shuffled = list(suggestions)
    random.Random(secrets.randbits(64)).shuffle(shuffled)
    prompt = (
        "Pick exactly 3 DISTINCT skills for a WorkWise gig worker onboarding run.\n"
        f"Run correlation id (vary your triple across runs): {run_nonce}\n"
        "Requirements:\n"
        "- Return JSON only with keys: skills.\n"
        "- skills must be an array of exactly 3 DISTINCT strings.\n"
        "- Each skill MUST exactly match one of the provided skills suggestions.\n"
        "- Do not include any other keys.\n"
        f"skills suggestions: {json.dumps(shuffled)}\n"
    )

    _agent_session_log(
        "H-mock-skills",
        "generate-skills",
        "calling groq (select 3 skills from suggestions)",
        data={"suggestionsCount": len(suggestions), "runNonce": run_nonce},
        run_id="pre",
    )
    try:
        result = _call_groq_chat_json(
            api_key=api_key,
            prompt=prompt,
            temperature=0.88,
            top_p=0.9,
        )
        skills = (result or {}).get("skills") or []
        if not isinstance(skills, list) or len(skills) != 3:
            raise RuntimeError(f"Groq mock skills JSON missing/invalid: {result!r}")
    except Exception as exc:
        # Fallback: pick 3 random verified suggestions.
        _agent_session_log(
            "H-mock-skills",
            "generate-skills",
            "groq skills failed; using random suggestions fallback",
            data={"error": str(exc)[:200]},
            run_id="pre",
        )
        rng = random.Random(time.time_ns())
        chosen = rng.sample(suggestions, k=min(3, len(suggestions)))
        chosen_unique = list(dict.fromkeys(chosen))[:3]
        rng2 = random.Random(time.time_ns())
        skills_with_proficiency = [
            {"skill": chosen_unique[i], "proficiency": _pick_biased_proficiency(rng=rng2)}
            for i in range(len(chosen_unique))
        ]
        _agent_session_log(
            "H-mock-skills",
            "generate-skills",
            "mock skills+proficiency generated (fallback)",
            data={"skillsWithProficiency": skills_with_proficiency},
            run_id="pre",
        )
        return skills_with_proficiency

    canonical_by_lower = {s.lower(): s for s in suggestions}
    canonical_skills: list[str] = []
    for s in skills:
        s_str = str(s).strip()
        if not s_str:
            continue
        canonical_skills.append(canonical_by_lower.get(s_str.lower(), s_str))

    # Ensure we end up with 3 distinct skills from suggestions.
    canonical_skills = list(dict.fromkeys(canonical_skills))
    canonical_skills = [s for s in canonical_skills if s.lower() in canonical_by_lower]
    while len(canonical_skills) < 3:
        canonical_skills.append(suggestions[random.randrange(0, len(suggestions))])
    canonical_skills = canonical_skills[:3]

    rng = random.Random(time.time_ns())
    skills_with_proficiency = [
        {"skill": canonical_skills[i], "proficiency": _pick_biased_proficiency(rng=rng)}
        for i in range(3)
    ]

    _agent_session_log(
        "H-mock-skills",
        "generate-skills",
        "mock skills+proficiency generated",
        data={"skillsWithProficiency": skills_with_proficiency},
        run_id="pre",
    )

    return skills_with_proficiency


def select_gig_worker_role(page: Page) -> None:
    card = page.locator("div.cursor-pointer").filter(
        has=page.get_by_role("heading", name=re.compile(r"i'?m a gig worker", re.I))
    )
    expect(card).to_be_visible(timeout=15_000)
    card.first.click()

    continue_btn = page.get_by_role("button", name=re.compile(r"^continue$", re.I))
    expect(continue_btn).to_be_enabled(timeout=15_000)
    continue_btn.click()
    # Inertia visit may not always emit a classic document navigation; wait on URL.
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

    # Headed Chromium can restore autofill from the last run; clear attributes/values before typing new mock data.
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

    # Inertia: server redirect is applied client-side — do not rely on page.expect_navigation().
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
        banner = page.locator("[role='alert']").all_inner_texts() if page.locator("[role='alert']").count() else []
        _log_debug(
            {
                "hypothesisId": "H-inertia-wait",
                "location": "submit_registration:after-click",
                "message": "timeout waiting for post-register URL",
                "data": {
                    "url": page.url,
                    "validation_errors": errors,
                    "alerts": banner,
                },
            }
        )
        raise RuntimeError(
            f"Registration did not leave /register within 60s. "
            f"URL={page.url!r} validation_errors={errors!r}"
        ) from exc


def _maybe_accept_fuzzy_skill_prompt(page: Page) -> None:
    use_btn = page.get_by_role("button", name=re.compile(r'^Use\s+"'))
    try:
        if use_btn.count() > 0 and use_btn.first.is_visible():
            use_btn.first.click(timeout=2_000)
            page.wait_for_timeout(300)
    except Exception:
        pass


def _xpath_string_literal(s: str) -> str:
    """
    Build an XPath string literal, handling quotes.
    """
    s = s or ""
    if "'" not in s:
        return f"'{s}'"
    if '"' not in s:
        return f'"{s}"'
    parts = s.split("'")
    # concat('part1',"'",'part2',... )
    return "concat(" + ",\"'\",".join([f"'{p}'" for p in parts]) + ")"


def _set_skill_card_proficiency(page: Page, *, skill: str, proficiency: str) -> None:
    """
    Click the proficiency level button inside the card for the given skill.
    """
    skill_lit = _xpath_string_literal(skill)
    prof_lit = _xpath_string_literal(proficiency)
    btn = page.locator(
        f"xpath=//div[.//span[normalize-space()={skill_lit}]]//button[normalize-space()={prof_lit}]"
    ).first
    expect(btn).to_be_visible(timeout=15_000)
    btn.click()


def _add_skills_step3(page: Page, skills: list[dict] | list[str]) -> None:
    """
    Step 3 adds skills via the search field + inline Add (same as Enter).

    Do not rely on get_by_role(..., name=^skill$) on suggestion rows: those buttons include
    Material icon text (e.g. "add"), so the accessible name is not exactly the skill string.
    The "Add \"X\" as new skill" row is hidden when X already matches a suggestion — exactly
    when the broken regex path fell through before.
    """
    search = page.locator("#skill-search")
    expect(search).to_be_visible(timeout=30_000)
    # Sibling of the input inside the relative wrapper (see Steps345.jsx).
    add_inline = page.locator("#skill-search").locator("xpath=following-sibling::button").first

    for item in skills:
        if isinstance(item, dict):
            skill = str(item.get("skill") or "").strip()
            proficiency = str(item.get("proficiency") or "intermediate").strip().lower()
        else:
            skill = str(item).strip()
            proficiency = "intermediate"

        if not skill:
            continue

        search.click()
        search.fill(skill)
        page.wait_for_timeout(900)
        _maybe_accept_fuzzy_skill_prompt(page)
        expect(add_inline).to_be_enabled(timeout=20_000)
        add_inline.click()
        try:
            expect(search).to_have_value("", timeout=45_000)
        except AssertionError:
            _agent_session_log(
                "H-skills-stuck",
                "_add_skills_step3",
                "search not cleared after Add",
                data={"skill": skill, "proficiency": proficiency, "url": page.url},
            )
            raise

        # Set per-skill proficiency (random per skill in Python).
        _set_skill_card_proficiency(page, skill=skill, proficiency=proficiency)

        _maybe_accept_fuzzy_skill_prompt(page)
        page.wait_for_timeout(400)

    expect(page.get_by_text(re.compile(r"3 selected \(min 3\)"))).to_be_visible(timeout=120_000)


def complete_gig_worker_onboarding(
    page: Page, *, mock: dict, submit_final: bool = True
) -> None:
    """
    Assumes the user is logged in and on gig worker onboarding (step 1 UI visible).
    Walks steps 1–5 and waits for redirect to /jobs.
    Requires /api/skills/suggestions (and optionally AI skill validation) to be available for step 3.
    If submit_final is False, skips clicking "Submit profile"; caller should click it in the UI.
    """
    _log_debug(
        {
            "hypothesisId": "H-onboarding-enter",
            "location": "complete_gig_worker_onboarding:start",
            "message": "starting onboarding automation",
            "data": {"url": page.url},
        }
    )
    expect(page).to_have_url(re.compile(r"/onboarding/gig-worker"), timeout=15_000)

    # Prove step 1 shell is in the DOM (SSR text may appear before React hydration).
    page.wait_for_function(
        """
        () => {
          const t = document.body && (document.body.innerText || document.body.textContent) || '';
          return t.includes('Welcome to WorkWise') && /get started/i.test(t);
        }
        """,
        timeout=90_000,
    )
    # Let Inertia/React attach event handlers (clicks before this are often no-ops).
    page.wait_for_timeout(1_200)

    # Prefer overlay gone; if stuck, still continue — DOM .click() bypasses z-index blocking.
    _wait_inertia_overlay_hidden_optional(page, label="after-land-onboarding", timeout=30_000)

    _onboarding_open_step2_professional_info(page)

    # Step 2 — professional info + optional profile photo
    title = page.locator("#professional_title")
    expect(title).to_be_visible(timeout=15_000)

    title.fill(str(mock.get("professional_title") or "").strip())
    page.locator("#hourly_rate").fill("850")
    page.locator("#bio").fill(str(mock.get("bio") or "").strip())

    file_input = page.locator("main").first.locator('input[type="file"][accept*="image"]')
    expect(file_input).to_be_attached(timeout=10_000)
    # In-memory payload avoids tempfile delete races on Windows (broken uploads → Laravel "failed to upload").
    file_input.set_input_files(
        {
            "name": "workwise-playwright-profile.png",
            "mimeType": "image/png",
            "buffer": _MINIMAL_PNG_BYTES,
        }
    )
    _agent_session_log(
        "H-PW-UPLOAD",
        "complete_gig_worker_onboarding:step2-photo",
        "set_input_files in-memory PNG",
        data={"byteLen": len(_MINIMAL_PNG_BYTES)},
    )
    try:
        busy = page.get_by_text(re.compile(r"Uploading"))
        busy.wait_for(state="visible", timeout=8_000)
        busy.wait_for(state="hidden", timeout=90_000)
    except Exception:
        # Upload may be fast or fail silently in dev (Supabase); give XHR time.
        page.wait_for_timeout(4_000)

    _onboarding_primary_click(page, "next step", label="onboarding-step2-next")

    # Step 2 → 3 triggers router.post in the background; wait until overlay clears so step 3 is stable.
    _wait_inertia_overlay_hidden(page, label="after-step2-save")

    _add_skills_step3(page, mock.get("skills_with_proficiency") or [])
    _onboarding_primary_click(page, "continue to portfolio", label="onboarding-step3-continue")

    _wait_inertia_overlay_hidden(page, label="after-step3-save")

    portfolio_input = page.locator('input[placeholder="https://yourportfolio.com"]')
    expect(portfolio_input).to_be_visible(timeout=20_000)
    portfolio_input.fill("https://example.com/portfolio")
    _onboarding_primary_click(page, "continue to step 5", label="onboarding-step4-continue")

    _wait_inertia_overlay_hidden(page, label="after-step4-save")

    if submit_final:
        _onboarding_primary_click(page, "submit profile", label="onboarding-step5-submit")
    else:
        # Match auto path: _onboarding_primary_click waits for overlay + stable UI before click.
        # Manual mode skips the programmatic click; without these waits, the user often still
        # sees a blocking LoadingOverlay or a not-yet-enabled button (race after step 4 POST).
        _debug_0009cb(
            hypothesis_id="H-manual-pre",
            location="complete_gig_worker_onboarding:manual-final",
            message="state before readiness waits",
            data=_onboarding_ui_snapshot(page),
        )
        page.get_by_text(re.compile(r"step 5 of 5", re.I)).first.wait_for(
            state="visible", timeout=30_000
        )
        _wait_inertia_overlay_hidden_optional(
            page, label="manual-final-ready-overlay", timeout=60_000
        )
        submit_btn = (
            page.locator("button")
            .filter(has_text=re.compile(r"Submit Profile", re.I))
            .first
        )
        submit_btn.wait_for(state="visible", timeout=20_000)
        expect(submit_btn).to_be_enabled(timeout=15_000)
        submit_btn.scroll_into_view_if_needed()
        _debug_0009cb(
            hypothesis_id="H-manual-post",
            location="complete_gig_worker_onboarding:manual-final",
            message="step5 submit button ready for user",
            data=_onboarding_ui_snapshot(page),
        )
        print(
            '(Headed) On "Final Profile Review": use the blue primary button labeled Submit Profile only.\n'
            "  Do not use pencil Edit on the cards, Back to previous step, or browser history Back — "
            "those leave this screen without submitting.\n"
            "  Waiting for redirect to /jobs …"
        )

    if submit_final:
        try:
            page.wait_for_function(
                """() => {
                    const p = window.location.pathname;
                    return p === '/jobs' || p.startsWith('/jobs/');
                }""",
                timeout=120_000,
            )
        except Exception as exc:
            _log_debug(
                {
                    "hypothesisId": "H-onboarding-jobs",
                    "location": "complete_gig_worker_onboarding:after-submit",
                    "message": "timeout waiting for /jobs",
                    "data": {"url": page.url},
                }
            )
            _debug_0009cb(
                hypothesis_id="H-timeout",
                location="complete_gig_worker_onboarding:after-submit",
                message="timeout waiting for /jobs",
                data={"url": page.url, "snapshot": _onboarding_ui_snapshot(page)},
            )
            raise RuntimeError(
                f"Onboarding submit did not reach /jobs in time. URL={page.url!r}"
            ) from exc
    else:
        _wait_jobs_after_manual_gig_submit(page)


def main() -> None:
    parser = argparse.ArgumentParser(description="Register a gig worker via the browser UI.")
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
        default="Password#123!",
        help="Must satisfy UI rules: 8+ chars, upper, lower, number, symbol.",
    )
    parser.add_argument(
        "--complete-onboarding",
        action="store_true",
        help="After register, complete steps 1–5 in the same browser session and land on /jobs.",
    )
    parser.add_argument(
        "--manual-final-onboarding-step",
        action="store_true",
        help="With --headed and --complete-onboarding, do not click the final "
        '"Submit profile" button; click it in the UI (script waits for /jobs).',
    )
    args = parser.parse_args()

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
    mock = generate_mock_profile_with_groq(base_url=base)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, slow_mo=args.slowmo)
        context = browser.new_context()
        page = context.new_page()

        page.goto(urljoin(base + "/", "role-selection"), wait_until="domcontentloaded")
        _wait_inertia_overlay_hidden_optional(page, label="gig-worker-role-selection-land", timeout=30_000)
        select_gig_worker_role(page)

        submit_registration(
            page,
            first_name=str(mock.get("first_name") or ""),
            last_name=str(mock.get("last_name") or ""),
            email=str(mock.get("email") or ""),
            password=args.password,
        )

        # Logged-in gig worker lands on onboarding (unless mandatory KYC redirects elsewhere).
        url = page.url
        if re.search(r"/onboarding/gig-worker", url):
            print("OK: Onboarding URL reached.")
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
            print("Completing onboarding (steps 1–5) …")
            suggestions = _fetch_skill_suggestions_via_page_request(
                page=page, base_url=base, limit=50
            )
            mock["skills_with_proficiency"] = generate_skills_with_proficiency_via_groq(
                base_url=base, page=page, suggestions=suggestions
            )
            complete_gig_worker_onboarding(
                page,
                mock=mock,
                submit_final=not args.manual_final_onboarding_step,
            )
            print("OK: Profile submitted — landed on jobs.")

        if args.headed and not args.auto_close:
            print(
                "\nBrowser left open — complete onboarding in the window, "
                "then press Enter here to close the browser and exit."
            )
            try:
                input()
            except EOFError:
                pass

        browser.close()


if __name__ == "__main__":
    main()
