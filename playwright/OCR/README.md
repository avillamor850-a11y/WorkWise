# PDF text extraction (Groq vision)

Experimental script: renders PDF pages to PNG and asks a Groq **vision** model to transcribe visible text (useful for scanned PDFs).

## Setup

```bash
cd playwright/OCR
pip install -r requirements.txt
```

Set `GROQ_API_KEY` (or rely on `GROQ_API_KEY` in the repo root `.env` — the script loads it if unset).

## Run

Put a `.pdf` in this folder, or pass a path:

```bash
python extract_pdf_text_groq.py
python extract_pdf_text_groq.py "C:\path\to\resume.pdf"
```

Options:

- `--pages N` — send the first N pages (default `1`).
- `--model NAME` — default **`meta-llama/llama-4-scout-17b-16e-instruct`** (Groq’s replacement for the retired `llama-3.2-11b-vision-preview`; see [deprecations](https://console.groq.com/docs/deprecations)).

```bash
set GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
python extract_pdf_text_groq.py --pages 2
```

If the API returns a model error, check [Groq models](https://console.groq.com/docs/models) and [deprecations](https://console.groq.com/docs/deprecations) for the current vision-capable model id.
