# Phishing Simulation Framework — Project Specification

> Reference document for AI coding agents (Cursor / Antigravity). This file defines what the system is, the technology stack, the repository structure, dependencies, data models, and the complete API surface. Use it as the source of truth when scaffolding and building the application.

---

## 1. Project Overview

### What this is
A self-hosted, open-source, web-based **phishing simulation framework**. It allows an administrator to run controlled phishing simulation campaigns against a defined set of email recipients and measure user susceptibility through behavioural metrics. It is **not** a real phishing tool and **not** an academic teaching tool — it is a security assessment framework.

### Who uses it
- **Primary users — Internal IT / security teams:** run simulated phishing campaigns to assess and improve employee susceptibility within their own organisation.
- **Primary users — Red-team assessors:** run authorised social-engineering campaigns during vulnerability assessments, typically for short engagement windows.
- **Secondary users — Recipients:** receive simulated emails and, if they interact, see constructive educational feedback and their own performance data.

### What it aims to achieve
Provide a free, transparent, self-hosted alternative to commercial platforms (KnowBe4, Microsoft Attack Simulation Training) and to the older open-source tool GoPhish. Its distinguishing features are:
1. **Multi-metric behavioural measurement** — not just click rate, but also time-to-click, reporting rate, and time-to-report.
2. **Ethical safeguards enforced by design** — no credential harvesting, proportional data collection, no personal data in tracking URLs.
3. **Constructive feedback** — recipients who interact receive educational content rather than punitive handling.

### Core principle: ethical safeguards (critical — enforce throughout)
- **No credential harvesting.** The system must never capture, store, or process credentials submitted on any landing page. Do not build credential-capture endpoints.
- **Proportional data collection.** Only collect the minimum needed to compute metrics: event type and timestamp. Do NOT collect IP addresses, browser fingerprints, user-agent strings, or geolocation.
- **Opaque tracking tokens.** Tracking URLs must contain only an opaque, random token (UUID or URL-safe random string). The token maps internally to a campaign+target pair. It must be impossible to derive a recipient's identity from the URL itself.
- **Sandboxed delivery only.** All email is sent through Mailtrap's Email Testing sandbox, which captures messages without delivering them to real inboxes.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend language | Python 3.11+ | |
| Backend framework | Flask | JSON API only — no server-side templating for the admin UI |
| Database | SQLite | Single-file, zero-config |
| ORM | SQLAlchemy via Flask-SQLAlchemy | Database-agnostic; parameterised queries |
| Authentication | Flask-JWT-Extended | Stateless JWT in request headers |
| Password hashing | Werkzeug PBKDF2 | Ships with Flask; no extra dependency |
| CORS | Flask-CORS | Controlled frontend/backend communication |
| Email delivery | Flask-Mail + Mailtrap (Email Testing sandbox) | Swappable to a production SMTP provider via config only |
| Frontend language | TypeScript | |
| Frontend framework | React 18 | Single-page application |
| Build tool | Vite | Produces a static bundle Flask can serve |
| Styling | Tailwind CSS + shadcn/ui | shadcn components are copied into the repo as source |
| Charts | Recharts | React-native charting for the dashboard |
| Version control | Git + GitHub (MIT licence) | Public repository |
| Dev OS | macOS on Apple Silicon (M1) | All dependencies have native ARM support |

### Architecture
Separated frontend and backend. Flask exposes a JSON API. React (built with Vite) is a single-page application that consumes that API. In production the Vite build output (`dist/`) can be served directly by Flask, preserving a single-process deployment. During development, run Flask (port 5001 — port 5000 is occupied by macOS AirPlay Receiver) and Vite (port 5173) concurrently with CORS enabled. The backend port is configurable via the `FLASK_RUN_PORT` environment variable (default 5001).

---

## 3. Repository Structure

```
phishing-framework/
├── backend/
│   ├── app/
│   │   ├── __init__.py            # Flask app factory, extension init
│   │   ├── config.py              # Config: DB URI, JWT secret, Mailtrap SMTP settings
│   │   ├── extensions.py          # db, jwt, mail, cors instances
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py            # Admin user
│   │   │   ├── template.py        # Phishing email templates
│   │   │   ├── target.py          # Target groups + individual targets
│   │   │   ├── campaign.py        # Campaigns
│   │   │   ├── event.py           # Behavioural events (sent/opened/clicked/reported)
│   │   │   └── tracking_token.py  # Opaque token -> campaign+target mapping
│   │   ├── routes/
│   │   │   ├── __init__.py        # Blueprint registration
│   │   │   ├── auth.py
│   │   │   ├── templates.py
│   │   │   ├── targets.py
│   │   │   ├── campaigns.py
│   │   │   ├── tracking.py        # Public click/report endpoints (no auth)
│   │   │   ├── dashboard.py       # Analytics endpoints
│   │   │   └── performance.py     # Recipient self-service performance
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── email_service.py   # Flask-Mail send logic, template rendering, token injection
│   │   │   └── metrics.py         # Metric calculations (all four metrics)
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── seed.py            # Seed data for testing
│   ├── instance/                  # SQLite DB file lives here (gitignored)
│   ├── requirements.txt
│   ├── .env.example               # Template for environment variables
│   └── run.py                     # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI components (shadcn lives here under ui/)
│   │   │   └── ui/                # shadcn/ui components
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Campaigns.tsx
│   │   │   ├── CampaignDetail.tsx
│   │   │   ├── Templates.tsx
│   │   │   ├── Targets.tsx
│   │   │   └── Feedback.tsx       # Educational feedback (recipient-facing)
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios client with JWT interceptor
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript interfaces mirroring API models
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── .gitignore
├── LICENSE                        # MIT
└── README.md
```

---

## 4. Dependencies

### Backend (`pip install`)
```
flask
flask-sqlalchemy
flask-jwt-extended
flask-mail
flask-cors
werkzeug
python-dotenv
```
After install, freeze: `pip freeze > requirements.txt`

### Frontend (`npm install`)
Scaffold first:
```
npm create vite@latest frontend -- --template react-ts
```
Then install runtime dependencies:
```
npm install recharts axios lucide-react react-router-dom
```
Dev dependencies and Tailwind:
```
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
Initialise shadcn/ui:
```
npx shadcn-ui@latest init
```
Add shadcn components as needed, e.g.:
```
npx shadcn-ui@latest add button card table input label select badge dialog sidebar tabs
```

---

## 5. Environment Variables

Create `backend/.env` (and commit `.env.example` with placeholder values). Load with python-dotenv.

```
# Flask
FLASK_APP=run.py
FLASK_ENV=development
FLASK_RUN_PORT=5001
SECRET_KEY=change-me-to-a-random-string
JWT_SECRET_KEY=change-me-to-a-different-random-string

# Database
DATABASE_URL=sqlite:///instance/app.db

# Mailtrap (Email Testing sandbox — NOT the sending product)
# From Mailtrap: Email Testing -> Inboxes -> SMTP Settings
MAIL_SERVER=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_USE_TLS=True
MAIL_DEFAULT_SENDER=security-team@simulation.local

# Tracking base URL (where click/report endpoints are reachable)
TRACKING_BASE_URL=http://localhost:5001

# Frontend origin (for CORS)
FRONTEND_ORIGIN=http://localhost:5173
```

---

## 6. Data Models

All models use SQLAlchemy declarative style. All tables include `id` (primary key) and `created_at` (UTC timestamp) unless noted.

### User
Admin accounts for the management interface.
| Field | Type | Notes |
|---|---|---|
| id | Integer PK | |
| email | String, unique, not null | Login identifier |
| password_hash | String, not null | Werkzeug PBKDF2 hash |
| created_at | DateTime | UTC |

### Template
Phishing email templates. Difficulty level supports the NIST Phish Scale concept (manual tagging).
| Field | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String, not null | Internal label |
| subject | String, not null | Email subject line |
| body_html | Text, not null | HTML body; supports `{{first_name}}`, `{{last_name}}`, `{{tracking_link}}`, `{{report_link}}` placeholders |
| difficulty_level | Enum(easy, medium, hard) | Manual difficulty tag |
| feedback_notes | Text, nullable | Template-specific tips shown on the feedback page |
| created_at | DateTime | |

### TargetGroup
A named collection of targets.
| Field | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String, not null | |
| description | String, nullable | |
| created_at | DateTime | |

### Target
An individual email recipient.
| Field | Type | Notes |
|---|---|---|
| id | Integer PK | |
| email | String, not null | |
| first_name | String, nullable | |
| last_name | String, nullable | |
| target_group_id | Integer FK -> TargetGroup | |
| created_at | DateTime | |

### Campaign
| Field | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String, not null | |
| template_id | Integer FK -> Template | |
| target_group_id | Integer FK -> TargetGroup | |
| status | Enum(draft, scheduled, running, completed) | Default draft |
| scheduled_at | DateTime, nullable | |
| launched_at | DateTime, nullable | |
| completed_at | DateTime, nullable | |
| created_at | DateTime | |

### Event
The core behavioural record. All four metrics are derived from this table.
| Field | Type | Notes |
|---|---|---|
| id | Integer PK | |
| campaign_id | Integer FK -> Campaign | |
| target_id | Integer FK -> Target | |
| event_type | Enum(sent, opened, clicked, reported) | |
| timestamp | DateTime | UTC; the moment the event occurred |
| created_at | DateTime | |

**Metric derivation from Event:**
- **Click rate** = distinct targets with a `clicked` event / distinct targets with a `sent` event
- **Reporting rate** = distinct targets with a `reported` event / distinct targets with a `sent` event
- **Time-to-click** (per target) = `clicked.timestamp` − `sent.timestamp`; report the campaign average
- **Time-to-report** (per target) = `reported.timestamp` − `sent.timestamp`; report the campaign average

### TrackingToken
Maps an opaque token to a campaign+target pair. Contains no personal data.
| Field | Type | Notes |
|---|---|---|
| id | Integer PK | |
| token | String, unique, not null | URL-safe random string / UUID |
| campaign_id | Integer FK -> Campaign | |
| target_id | Integer FK -> Target | |
| created_at | DateTime | |

---

## 7. API Endpoints

Base URL: `http://localhost:5001/api` (except public tracking routes, which are at root `/track` and `/report`).

All `/api/*` routes except `auth/login` and `auth/register` require a valid JWT in the `Authorization: Bearer <token>` header. Tracking and public performance routes require NO auth.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | none | Create admin account (intended for first-run setup) |
| POST | `/api/auth/login` | none | Authenticate, return JWT access token |
| GET | `/api/auth/me` | JWT | Return current admin user info |

### Templates (UR-02)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/templates` | JWT | List all templates |
| GET | `/api/templates/:id` | JWT | Get a single template |
| POST | `/api/templates` | JWT | Create a template |
| PUT | `/api/templates/:id` | JWT | Update a template |
| DELETE | `/api/templates/:id` | JWT | Delete a template |

### Target Groups & Targets
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/target-groups` | JWT | List target groups |
| POST | `/api/target-groups` | JWT | Create a target group |
| DELETE | `/api/target-groups/:id` | JWT | Delete a target group |
| GET | `/api/target-groups/:id/targets` | JWT | List targets in a group |
| POST | `/api/target-groups/:id/targets` | JWT | Add a single target |
| POST | `/api/target-groups/:id/targets/import` | JWT | Bulk import targets from CSV (email, first_name, last_name) |
| DELETE | `/api/targets/:id` | JWT | Delete a target |

### Campaigns
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/campaigns` | JWT | List all campaigns with status |
| GET | `/api/campaigns/:id` | JWT | Get campaign detail |
| POST | `/api/campaigns` | JWT | Create a campaign (draft) |
| PUT | `/api/campaigns/:id` | JWT | Update a draft campaign |
| POST | `/api/campaigns/:id/launch` | JWT | Launch: generate tokens, send emails via Mailtrap, create `sent` events, set status=running |
| DELETE | `/api/campaigns/:id` | JWT | Delete a campaign |

### Tracking (PUBLIC — no auth) (UR-04..UR-07, UR-09)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/track/click/:token` | none | Record a `clicked` event, then redirect to the educational feedback page. Collect only the timestamp. |
| POST | `/report` | none | Body contains the token. Record a `reported` event. Return a confirmation message. |

> Optional: `GET /track/open/:token` returning a 1x1 pixel to record `opened` events. Lower priority; open tracking is unreliable and not one of the four core metrics.

### Dashboard / Analytics (UR-01, UR-04..UR-07)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/overview` | JWT | Totals: campaigns, targets, overall click rate, overall report rate |
| GET | `/api/dashboard/campaigns/:id/metrics` | JWT | Per-campaign: click rate, report rate, avg time-to-click, avg time-to-report |
| GET | `/api/dashboard/campaigns/:id/timeline` | JWT | Time series of click/report events for line charts |
| GET | `/api/dashboard/campaigns/:id/targets` | JWT | Per-target outcome list (sent / clicked / reported / no-action) |

### Recipient Performance (UR-10) (PUBLIC — token-scoped, no auth)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/performance/:token` | none | Return only that recipient's history: campaigns received, whether they clicked/reported/ignored each, and their time-to-click / time-to-report where applicable. Must NOT expose any other recipient's data. |

---

## 8. Email Sending Flow (email_service.py)

On `POST /api/campaigns/:id/launch`:
1. Load the campaign, its template, and all targets in the target group.
2. For each target:
   a. Generate a unique opaque token; create a `TrackingToken` row (token, campaign_id, target_id).
   b. Build the click URL: `{TRACKING_BASE_URL}/track/click/{token}`.
   c. Build the report URL: `{TRACKING_BASE_URL}/report?token={token}` (or a frontend page that POSTs the token).
   d. Render the template body, replacing `{{first_name}}`, `{{last_name}}`, `{{tracking_link}}`, `{{report_link}}`.
   e. Send the email via Flask-Mail through Mailtrap SMTP.
   f. Create an `Event` row: event_type=`sent`, timestamp=now.
3. Set campaign status to `running` and `launched_at`=now.

**Idempotency / edge cases the agent should handle:**
- A target may click more than once — count distinct targets, not raw events, for rate calculations.
- A target may report after clicking, or report without clicking — both are valid; store both events.
- A target may take no action — this is a valid outcome (neither clicked nor reported) and should show as "no action" in per-target views.

---

## 9. Frontend Pages (React + shadcn/ui + Recharts)

| Page | Route | Purpose |
|---|---|---|
| Login | `/login` | JWT login; store token in memory (NOT localStorage) |
| Dashboard | `/` | Overview cards + charts (click vs report rate, outcome pie, time-to-click) |
| Campaigns | `/campaigns` | Table of campaigns with status badges; create button |
| Campaign detail | `/campaigns/:id` | Status, launch button, per-target results, per-campaign metric charts |
| Templates | `/templates` | List with difficulty badges; create/edit form with HTML preview |
| Targets | `/targets` | Target groups; add targets manually or via CSV import |
| Feedback | `/feedback/:token` | Recipient-facing: "this was a simulation" + template tips + link to performance |
| Performance | `/performance/:token` | Recipient-facing self-service performance view |

**Auth note:** store the JWT in React state / memory, not in `localStorage` or `sessionStorage`. Attach it via an Axios request interceptor.

**Charts (Recharts):**
- Bar chart: click rate vs report rate per campaign
- Pie chart: target outcomes (clicked / reported / no action)
- Line chart: events over time (from the timeline endpoint)

---

## 10. Seed Data (utils/seed.py)

Provide a script that creates:
- One admin user (email + password printed to console on creation).
- 3–5 templates spanning difficulty levels:
  - **Easy:** obvious typos, generic greeting, clearly suspicious link.
  - **Medium:** branded look, plausible sender, urgency/time-pressure language.
  - **Hard:** internal-looking email, colleague impersonation, contextually relevant request.
- 2 target groups with ~10–15 test targets each (use example.com / .local addresses).
- 2–3 completed campaigns with realistic `Event` data so the dashboard has content to render on first run.

---

## 11. Non-Goals (do NOT build these)

- Credential capture / harvesting of any kind.
- Collection of IP addresses, user-agent strings, browser fingerprints, or geolocation.
- Bypassing email security controls (SPF/DKIM/DMARC evasion).
- Real email delivery to real recipients (Mailtrap sandbox only for this build).
- Multi-channel simulation (SMS/smishing, voice/vishing, QR/quishing).
- Enterprise integrations (identity providers, LMS, SIEM, HR systems).
- Mobile applications.
- Multi-tenant / multi-organisation architecture.

---

## 12. Definition of Done (per user requirement)

| UR | Requirement | Done when |
|---|---|---|
| UR-01 | Dashboards and reports | Dashboard renders overview + per-campaign charts from live data |
| UR-02 | Multiple templates at varying difficulty | Templates can be created with a difficulty level and used in campaigns |
| UR-03 | Sandboxed email delivery | Launching a campaign delivers emails to the Mailtrap inbox |
| UR-04 | Click rate | Click rate computed and displayed per campaign |
| UR-05 | Reporting rate | Report rate computed and displayed per campaign |
| UR-06 | Time-to-click | Average time-to-click computed and displayed per campaign |
| UR-07 | Time-to-report | Average time-to-report computed and displayed per campaign |
| UR-08 | Ethical safeguards | No credential capture; tokens opaque; only event type + timestamp stored |
| UR-09 | Educational feedback | Clicking a link lands on a feedback page with template-specific tips |
| UR-10 | Recipient performance view | A token-scoped page shows only that recipient's own results |

---

## 13. Coding Conventions

- Backend: use the Flask application-factory pattern (`create_app()`); register blueprints in `routes/__init__.py`; keep business logic in `services/`, not in route handlers.
- Use SQLAlchemy relationships (`db.relationship`) so metric queries can traverse campaign -> events -> targets cleanly.
- Return consistent JSON envelopes, e.g. `{ "data": ... }` on success and `{ "error": "message" }` with an appropriate HTTP status on failure.
- Frontend: define TypeScript interfaces in `types/index.ts` mirroring the API responses; keep all API calls in `lib/api.ts`.
- Do not use `localStorage` or `sessionStorage` for auth tokens.
- Handle loading, empty, and error states on every page.
- Keep all timestamps in UTC; format for display on the frontend only.
