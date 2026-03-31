"""
Shared Groq OpenAI-compatible client + email helpers for Playwright E2E scripts.

Imported as a sibling module when running `python playwright/<script>.py` (sys.path contains playwright/).
"""

from __future__ import annotations

import json
import os
import re
import secrets
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# NDJSON session log at repo root (same as Laravel debug-7e85dd.log convention)
_REPO_ROOT = Path(__file__).resolve().parents[1]
_AGENT_SESSION_LOG = _REPO_ROOT / "debug-7e85dd.log"
_AGENT_SESSION_ID = "7e85dd"


def _load_env_file_vars(*, dotenv_path: Path, required_keys: list[str]) -> None:
    """
    Minimal .env loader. Only loads keys that are missing from the current process environment.
    """
    try:
        if not dotenv_path.exists():
            return
        lines = dotenv_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return

    wanted = set(required_keys)
    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key not in wanted or os.environ.get(key):
            continue
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        os.environ[key] = value


def _agent_session_log(
    hypothesis_id: str,
    location: str,
    message: str,
    *,
    data: dict | None = None,
    run_id: str = "iter2",
) -> None:
    # #region agent log
    try:
        line = {
            "sessionId": _AGENT_SESSION_ID,
            "timestamp": int(time.time() * 1000),
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data or {},
            "runId": run_id,
        }
        _AGENT_SESSION_LOG.parent.mkdir(parents=True, exist_ok=True)
        with _AGENT_SESSION_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(line, default=str) + "\n")
    except OSError:
        pass
    # #endregion


def _sanitize_name_for_email(name: str) -> str:
    """Keep only lowercase ASCII letters for email local-part generation."""
    cleaned = re.sub(r"[^a-z]", "", (name or "").lower())
    return cleaned


def _unique_suffix_digits() -> str:
    """Digits-only uniqueness suffix (variable length is fine)."""
    t = str(int(time.time() * 1000))
    r = f"{secrets.randbelow(10_000):04d}"
    x = f"{secrets.randbelow(1_000_000):06d}"
    return f"{t[-6:]}{r}{x}"


def _build_ai_email(*, first_name: str, last_name: str, suffix: str, domain: str = "example.com") -> str:
    first = _sanitize_name_for_email(first_name)
    last = _sanitize_name_for_email(last_name)
    if not first:
        first = "user"
    if not last:
        last = "user"
    local_part = f"{first}.{last}{suffix}"
    return f"{local_part}@{domain}"


def _call_groq_chat_json(
    *,
    api_key: str,
    prompt: str,
    temperature: float = 0.8,
    top_p: float | None = None,
    max_tokens: int = 900,
) -> dict:
    """
    Call Groq OpenAI-compatible chat completions and parse strict JSON output.
    """
    url = "https://api.groq.com/openai/v1/chat/completions"
    body: dict = {
        "model": "llama-3.1-8b-instant",
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are generating mock data for an E2E test. "
                    "Each API call is independent — never reuse the same persona, names, title, or bio "
                    "you produced on a prior call. "
                    "Return ONLY valid JSON. No markdown. No commentary."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    }
    if top_p is not None:
        body["top_p"] = top_p
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36 WorkWise-E2E/1.0"
        ),
    }
    # #region agent log
    _agent_session_log(
        "H1-ua-waf",
        "groq_e2e.py:_call_groq_chat_json",
        "groq pre-request",
        data={
            "headerKeys": sorted(headers.keys()),
            "userAgentPresent": "User-Agent" in headers,
            "keyLen": len(api_key),
            "model": body.get("model"),
            "temperature": body.get("temperature"),
            "top_p": body.get("top_p"),
            "max_tokens": body.get("max_tokens"),
            "python": sys.version.split()[0],
        },
        run_id="verify",
    )
    # #endregion
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            _agent_session_log(
                "H1-ua-waf",
                "groq_e2e.py:_call_groq_chat_json",
                "groq response OK",
                data={"httpStatus": resp.getcode()},
                run_id="verify",
            )
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        except Exception:
            err_body = ""
        err_body = (err_body or "").strip()
        err_body_short = err_body[:800]
        _agent_session_log(
            "H-groq",
            "groq_e2e.py:_call_groq_chat_json",
            "groq HTTPError",
            data={
                "status": getattr(e, "code", None),
                "body": err_body_short,
                "H2_invalidKey": getattr(e, "code", None) in (401, 403),
                "H1_waf1010": "1010" in err_body,
            },
            run_id="verify",
        )
        raise

    data = json.loads(raw)
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Groq returned empty content.")

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", content, flags=re.S)
        if not m:
            raise
        return json.loads(m.group(0))
