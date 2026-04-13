"""
Extract text from a local PDF (including scanned/image PDFs) by:
1. Rendering page(s) to PNG with PyMuPDF
2. Sending image(s) to Groq chat completions with a vision-capable model

Place a .pdf next to this file, or pass the path as the first argument.

Requires: GROQ_API_KEY in the environment (or in repo root .env loaded manually).

Usage:
  set GROQ_API_KEY=...
  pip install -r requirements.txt
  python extract_pdf_text_groq.py
  python extract_pdf_text_groq.py my_resume.pdf
  python extract_pdf_text_groq.py my_resume.pdf --pages 2
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import socket
import sys
import time
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError as e:
    print("Install dependencies: pip install -r requirements.txt", file=sys.stderr)
    raise SystemExit(1) from e

try:
    from groq import Groq
except ImportError as e:
    print("Install dependencies: pip install -r requirements.txt", file=sys.stderr)
    raise SystemExit(1) from e

try:
    from groq import APIConnectionError, BadRequestError
except ImportError:
    APIConnectionError = Exception  # type: ignore[misc,assignment]
    BadRequestError = Exception  # type: ignore[misc,assignment]


# Groq-recommended replacement for decommissioned llama-3.2-11b-vision-preview (see console.groq.com/docs/deprecations)
DEFAULT_GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


# #region agent log
def _agent_debug_log(
    repo_root: Path,
    *,
    hypothesis_id: str,
    location: str,
    message: str,
    data: dict,
) -> None:
    log_path = repo_root / "debug-7a4019.log"
    payload = {
        "sessionId": "7a4019",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")


# #endregion


def _dns_resolve_groq(repo_root: Path) -> tuple[bool, str]:
    """H1/H3: verify api.groq.com resolves (getaddrinfo failed = DNS/offline/proxy)."""
    host = "api.groq.com"
    port = 443
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        # #region agent log
        _agent_debug_log(
            repo_root,
            hypothesis_id="H1",
            location="extract_pdf_text_groq.py:_dns_resolve_groq",
            message="dns_ok",
            data={"host": host, "port": port, "addrinfo_count": len(infos)},
        )
        # #endregion
        return True, ""
    except OSError as e:
        # #region agent log
        _agent_debug_log(
            repo_root,
            hypothesis_id="H1",
            location="extract_pdf_text_groq.py:_dns_resolve_groq",
            message="dns_failed",
            data={
                "host": host,
                "errno": getattr(e, "errno", None),
                "err": str(e),
            },
        )
        # #endregion
        return False, str(e)


def _load_dotenv_groq_key(repo_root: Path) -> None:
    """If GROQ_API_KEY is unset, try repo .env (minimal parser)."""
    if os.environ.get("GROQ_API_KEY"):
        return
    env_path = repo_root / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        if key != "GROQ_API_KEY":
            continue
        val = val.strip().strip('"').strip("'")
        if val:
            os.environ["GROQ_API_KEY"] = val
        return


def _resolve_pdf(script_dir: Path, arg_path: str | None) -> Path:
    if arg_path:
        p = Path(arg_path)
        if not p.is_absolute():
            p = script_dir / p
        if not p.is_file():
            raise SystemExit(f"PDF not found: {p}")
        return p.resolve()
    pdfs = sorted(script_dir.glob("*.pdf"))
    if not pdfs:
        raise SystemExit(
            "No .pdf in this folder. Add one next to extract_pdf_text_groq.py "
            "or pass: python extract_pdf_text_groq.py path\\to\\file.pdf"
        )
    return pdfs[0].resolve()


def _render_page_png(doc: fitz.Document, page_index: int, zoom: float = 2.0) -> bytes:
    page = doc.load_page(page_index)
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return pix.tobytes("png")


def _pdf_to_data_urls(pdf_path: Path, max_pages: int) -> list[tuple[int, str]]:
    doc = fitz.open(pdf_path)
    try:
        n = min(len(doc), max_pages)
        out: list[tuple[int, str]] = []
        for i in range(n):
            png = _render_page_png(doc, i)
            b64 = base64.standard_b64encode(png).decode("ascii")
            url = f"data:image/png;base64,{b64}"
            out.append((i + 1, url))
        return out
    finally:
        doc.close()


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    # .../playwright/OCR -> parents[1] is repo root (WorkWise/)
    repo_root = script_dir.parents[1]

    parser = argparse.ArgumentParser(description="OCR/transcribe PDF via Groq vision API")
    parser.add_argument(
        "pdf",
        nargs="?",
        default=None,
        help="Path to PDF (default: first *.pdf in this folder)",
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=1,
        metavar="N",
        help="Max number of pages to send (default: 1)",
    )
    parser.add_argument(
        "--model",
        default=os.environ.get("GROQ_VISION_MODEL", DEFAULT_GROQ_VISION_MODEL),
        help=f"Groq vision-capable model id (default: {DEFAULT_GROQ_VISION_MODEL}; env: GROQ_VISION_MODEL)",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.2,
        help="Sampling temperature (use low for transcription)",
    )
    args = parser.parse_args()

    _load_dotenv_groq_key(repo_root)
    api_key = os.environ.get("GROQ_API_KEY")
    # #region agent log
    _agent_debug_log(
        repo_root,
        hypothesis_id="H2",
        location="extract_pdf_text_groq.py:main",
        message="after_dotenv",
        data={
            "repo_root": str(repo_root),
            "groq_key_configured": bool(api_key),
        },
    )
    # #endregion
    if not api_key:
        raise SystemExit(
            "Set GROQ_API_KEY in the environment or add it to the project .env at repo root."
        )

    pdf_path = _resolve_pdf(script_dir, args.pdf)
    max_pages = max(1, args.pages)
    pages = _pdf_to_data_urls(pdf_path, max_pages)
    # #region agent log
    _agent_debug_log(
        repo_root,
        hypothesis_id="H4",
        location="extract_pdf_text_groq.py:main",
        message="pdf_rendered",
        data={
            "pdf": str(pdf_path),
            "pages_sent": len(pages),
            "first_page_data_url_chars": len(pages[0][1]) if pages else 0,
        },
    )
    # #endregion

    ok_dns, dns_err = _dns_resolve_groq(repo_root)
    if not ok_dns:
        raise SystemExit(
            "Cannot resolve api.groq.com (DNS/network error). "
            "Check internet connection, DNS, firewall, or VPN. "
            f"Detail: {dns_err}\n"
            "If you use an HTTP proxy, set HTTPS_PROXY / HTTP_PROXY and try again."
        )

    client = Groq(api_key=api_key)

    user_content: list = [
        {
            "type": "text",
            "text": (
                "Transcribe all visible text from this resume document image (or images). "
                "Output plain text only, preserve approximate reading order and line breaks. "
                "Do not summarize, do not add commentary. If text is unreadable, say so briefly."
            ),
        }
    ]
    for page_num, data_url in pages:
        user_content.append({"type": "text", "text": f"--- Page {page_num} ---"})
        user_content.append(
            {
                "type": "image_url",
                "image_url": {"url": data_url},
            }
        )

    # #region agent log
    _agent_debug_log(
        repo_root,
        hypothesis_id="H6",
        location="extract_pdf_text_groq.py:main",
        message="groq_request_start",
        data={"model": args.model},
    )
    # #endregion

    try:
        completion = client.chat.completions.create(
            model=args.model,
            messages=[
                {
                    "role": "user",
                    "content": user_content,
                }
            ],
            temperature=args.temperature,
            max_tokens=4096,
            top_p=1,
            stream=False,
        )
    except APIConnectionError as e:
        # #region agent log
        _agent_debug_log(
            repo_root,
            hypothesis_id="H3",
            location="extract_pdf_text_groq.py:main",
            message="groq_api_connection_error",
            data={"error_type": type(e).__name__, "error_str": str(e)[:500]},
        )
        # #endregion
        raise SystemExit(
            "Groq API connection failed (network/DNS/firewall/proxy). "
            "Confirm you can reach https://api.groq.com from this PC. "
            f"Detail: {e}"
        ) from e
    except BadRequestError as e:
        # #region agent log
        _agent_debug_log(
            repo_root,
            hypothesis_id="H6",
            location="extract_pdf_text_groq.py:main",
            message="groq_bad_request",
            data={
                "model": args.model,
                "error_type": type(e).__name__,
                "error_str": str(e)[:800],
            },
        )
        # #endregion
        hint = (
            f"\nIf the model was retired, set GROQ_VISION_MODEL or --model to a current vision model "
            f"(default in this script: {DEFAULT_GROQ_VISION_MODEL}). "
            "See https://console.groq.com/docs/deprecations"
        )
        raise SystemExit(f"Groq API rejected the request: {e}{hint}") from e

    # #region agent log
    _agent_debug_log(
        repo_root,
        hypothesis_id="H5",
        location="extract_pdf_text_groq.py:main",
        message="groq_completion_ok",
        data={"model": args.model},
    )
    # #endregion

    msg = completion.choices[0].message
    text = getattr(msg, "content", None) or ""
    print("--- Groq response ---")
    print(text)
    print("--- end ---")


if __name__ == "__main__":
    main()
