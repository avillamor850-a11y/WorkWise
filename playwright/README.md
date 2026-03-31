# Playwright (Python) — WorkWise registration

## Prerequisites

- Python 3.10+
- WorkWise running (e.g. `php artisan serve` → `http://127.0.0.1:8000`)

## Install

```bash
pip install -r playwright/requirements.txt
playwright install chromium
```

## Gig worker

```bash
python playwright/gig_worker_register.py --base-url http://127.0.0.1:8000
```

### Selenium alternative (Python)

If you want Selenium instead of Playwright for gig-worker signup + onboarding:

```bash
pip install selenium
python playwright/gig_worker_signup_onboarding_selenium.py --base-url http://127.0.0.1:8000 --headed
```

Optional flags:

- `--email user@example.com` to force a specific email (default is random).
- `--resume-path "C:\\path\\to\\resume.pdf"` to upload a resume on step 4.
- `--slow-ms 250` to add small action delays for easier visual debugging.
- `--auto-close` to close browser immediately in headed mode.

Full flow (register + finish onboarding steps 1–5 in the **same** browser session, then `/jobs`):

```bash
python playwright/gig_worker_register.py --base-url http://127.0.0.1:8000 --complete-onboarding
```

When `--complete-onboarding` is used, the script generates a mock gig-worker profile (name/title/bio/skills) **fresh on every process run** and fills onboarding from that data. Groq prompts include a unique run id plus higher sampling variance so names/title/bio/skills change between runs; the email suffix also mixes time and strong randomness.

AI generation requires `GROQ_API_KEY` (configured in your app’s `.env`). If Groq is unavailable/forbidden, the script falls back to non-AI mock values so the E2E run can still proceed.

Step 2 uploads a tiny in-memory PNG as the profile photo (optional in UI; storage/Supabase must work in your env).

Step 3 uses the app’s `/api/skills/suggestions` endpoint and sets a random proficiency per added skill (biased toward `intermediate`).

Use `--headed` if a step fails to see the UI.

## Employer

Register and open employer onboarding (`/onboarding/employer`):

```bash
python playwright/employer_register.py --base-url http://127.0.0.1:8000
```

Register and complete steps 1–5 in one session, then **`/employer/dashboard`**:

```bash
python playwright/employer_register.py --base-url http://127.0.0.1:8000 --complete-onboarding
```

Skip the optional company logo on step 2:

```bash
python playwright/employer_register.py --base-url http://127.0.0.1:8000 --complete-onboarding --skip-logo
```

After onboarding, **post a gig job** (`/jobs/create` → submit → `/jobs/{id}`) using a **second Groq-generated draft** (title, description 100+ chars, budgets, duration, remote/location, optional category, `skill_hints`). **`--post-job` requires `--complete-onboarding` in the same run.**

```bash
python playwright/employer_register.py --base-url http://127.0.0.1:8000 --complete-onboarding --post-job
```

Skills are filled by clicking **AI-suggested `+ {skill}`** chips when possible, then falling back to the **Skill Experience** typeahead (`skill_hints`) and the same fuzzy **Use "…"** prompt handling as the gig-worker script. If Groq fails for the job draft, a local fallback job JSON is used.

**AI mock data (Groq):** Every run loads `GROQ_API_KEY` from the project `.env` (if not already in the environment) and generates a fresh employer profile: registration name/email, company name/website/description, team size, and hiring-preference enums. Email uses the same `firstname.lastname{digits}@example.com` convention as the gig-worker script. If Groq fails, the script falls back to local random mocks (enums are always valid for the Laravel `in:` rules).

With **`--complete-onboarding`**, after step 2 mounts the script reads **industry** options from the `<select id="industry">` and uses Groq to pick one exact value; on step 4 it reads **“+ {service}”** chips and uses Groq to pick one service category before filling budget/duration/experience/frequency from the pre-generated mock.

Groq HTTP + session NDJSON (both gig and employer) append to repo-root `debug-7e85dd.log` via [playwright/groq_e2e.py](playwright/groq_e2e.py) (no secrets logged).

Employer steps 2–4 wait for the Inertia loading overlay after each save (the app only advances on successful `router.post`).

Debug logs (employer UI issues): `.cursor/debug-playwright-employer.log`

### Pick DB user, log in, post job (no registration)

[playwright/employer_login_post_job.py](playwright/employer_login_post_job.py) lists **`user_type` `employer`** (and legacy **`client`**) from **`database.sqlite`**, prompts you to choose a row, asks for the password with **`getpass`** (not stored), logs in at **`/login`**, then generates a job with Groq and runs the same **`/jobs/create`** fill flow as **`--post-job`**. With **`--headed`**, it **does not** click **Post Job** by default (you submit in the UI); use **`--submit-job`** with **`--headed`** to auto-submit like headless.

```bash
python playwright/employer_login_post_job.py --base-url http://127.0.0.1:8000
```

- **`--database PATH`**: alternate SQLite file (default: repo root `database.sqlite`).
- Requires **`GROQ_API_KEY`** in `.env` and a known password for the chosen user.

**Login / Supabase:** [Login.jsx](resources/js/Pages/Auth/Login.jsx) may call Supabase before falling back to Laravel; the script waits up to **90s** after submit. Misconfigured Supabase can slow login. Emails **`example@gmail.com`** and **`example.employer@gmail.com`** use the Laravel-only path in that page.

## Headed browser

After registration, the browser can stay open until you press **Enter** in the terminal:

```bash
python playwright/gig_worker_register.py --base-url http://127.0.0.1:8000 --headed --slowmo 200
python playwright/employer_register.py --base-url http://127.0.0.1:8000 --headed --slowmo 200
python playwright/employer_login_post_job.py --base-url http://127.0.0.1:8000 --headed --slowmo 200
```

Close immediately even when headed:

```bash
python playwright/gig_worker_register.py --base-url http://127.0.0.1:8000 --headed --auto-close
python playwright/employer_register.py --base-url http://127.0.0.1:8000 --headed --auto-close
python playwright/employer_login_post_job.py --base-url http://127.0.0.1:8000 --headed --auto-close
```

## Fraud detection E2E

**Job posting flood (medium risk, request still allowed):** posts four jobs in one logged-in session. The fourth post should show the flash warning *“flagged for review”* while still redirecting to `/jobs/{id}` (see `FraudDetectionMiddleware` job analysis).

Prerequisites:

- App running (`php artisan serve`; use `npm run dev` if your UI needs Vite).
- `GROQ_API_KEY` in `.env` (same as employer job scripts).
- An **employer** account in `database.sqlite` that can open **`/jobs/create`** (completed onboarding and ID verification where your routes require `require.id.verification`).
- If **mandatory admin KYC** blocks that user, complete ID verification or clear the requirement before running.

```bash
python playwright/fraud_job_posting_flood.py --base-url http://127.0.0.1:8000
```

- **`--jobs N`**: number of posts (default `4`; flood warning is asserted on the 4th when `N >= 4`).
- **`--assert-db`**: after the run, verify `fraud_detection_alerts` in SQLite contains the job-flood message for the chosen user.
- **`--database PATH`**: alternate SQLite file (default: repo root `database.sqlite`).
- Headed / slow-mo: same flags as other scripts (`--headed`, `--auto-close`, `--slowmo`).

**Message flood (medium risk, request still allowed):** sends 11 messages in one session from the chat UI (`POST /messages`). The 11th send triggers fraud middleware when 10+ messages from the sender already exist in the last 5 minutes; the message still succeeds (JSON), session flash *“flagged for review”* is asserted after navigating to **`/messages`** (Inertia picks up flash; the composer uses `fetch` and does not show it in place).

Prerequisites:

- App running (`php artisan serve`; use `npm run dev` if your UI needs Vite).
- **No Groq** required.
- A **sender** in `database.sqlite` (employer, client, or gig worker, non-admin) who can open **`/messages`** — routes use **`require.id.verification`**.
- A **receiver** user id (another row in `users`); pass **`--receiver-id`** or pick interactively.

Re-running within 5 minutes can trigger the threshold on an earlier send; wait 5 minutes, use another sender, or clear recent `messages` rows for that sender when debugging.

```bash
python playwright/fraud_message_flood.py --base-url http://127.0.0.1:8000 --receiver-id 2
```

- **`--messages N`**: number of sends (default `11`; flood warning is asserted on the last when `N >= 11`).
- **`--receiver-id`**: receiver user id (omit for interactive list from the DB).
- **`--assert-db`**: after the run, verify `fraud_detection_alerts` in SQLite contains *“High message volume”* for the sender.
- **`--database PATH`**, **`--headed`**, **`--auto-close`**, **`--slowmo`**: same as other scripts.

## Bid accept and escrow transaction E2E

End-to-end: pick an **employer** and a **gig worker** from **`database.sqlite`**, post a Groq-generated job (same draft flow as employer job scripts), worker submits a proposal on **`/jobs/{id}`**, employer **accepts**; the app creates a **`transactions`** row with **`type`** **`escrow`** (SQLite-backed dev DB).

Prerequisites:

- App running (`php artisan serve`; use `npm run dev` if your UI needs Vite).
- **`GROQ_API_KEY`** in `.env` (same as [`employer_login_post_job.py`](employer_login_post_job.py)).
- One **`employer`** or legacy **`client`** row and one **`gig_worker`** row (different users); you must know both passwords (**`getpass`**, not stored in DB).
- Routes and accounts must satisfy **`require.id.verification`** if enabled in your environment.

**Escrow:** the script bumps the chosen employer’s **`escrow_balance`** in **local SQLite** to at least **`--min-escrow`** (default **50000**) and at least the bid amount, so acceptance does not fail for insufficient escrow. This does **not** run Stripe; it is for local / dev DBs only.

```bash
python playwright/bid_accept_escrow_e2e.py --base-url http://127.0.0.1:8000 --assert-db
```

- **`--min-escrow AMOUNT`**: minimum **`users.escrow_balance`** set for the employer before posting (default `50000`).
- **`--assert-db`**: after accept, assert a **completed** **`escrow`** transaction exists for **`projects.job_id`** matching the posted job and **`payer_id`** = employer.
- **`--headed`**: show Chromium; you must pass **`--submit-job`** so the job is actually posted (same convention as employer login/post job).
- **`--database PATH`**, **`--auto-close`**, **`--slowmo`**: same as other scripts.

## KYC / ID verification

If mandatory admin KYC applies, registration may land on **ID verification** instead of onboarding. The scripts still print OK for register-only runs. **`--complete-onboarding` exits with an error** in that case (finish KYC manually or adjust test data).

## Success URLs

| Flow | After register | After `--complete-onboarding` | After `--post-job` (employer only) |
|------|----------------|------------------------------|-----------------------------------|
| Gig worker | `/onboarding/gig-worker` (or ID verification) | `/jobs` | — |
| Employer | `/onboarding/employer` (or ID verification) | `/employer/dashboard` | `/jobs/{id}` |
