# Phloris

Phloris is a self-hosted phishing simulation and awareness-assessment framework. It lets a security team run controlled simulated-phishing campaigns against a defined set of recipients and measure susceptibility through four behavioural metrics — click rate, reporting rate, time-to-click, and time-to-report. All email is delivered to a Mailtrap sandbox (no real inboxes are ever reached), and no credentials are harvested at any point.

---

## Prerequisites

- Python 3.11+
- Node.js 18+, npm

---

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and fill in the following:

| Variable | What to set |
|---|---|
| `SECRET_KEY` | Any random string |
| `JWT_SECRET_KEY` | Any different random string |
| `SMTP_ENCRYPTION_KEY` | Output of the command below |

Generate the Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Mailtrap (optional for examiners):** `MAIL_USERNAME` and `MAIL_PASSWORD` come from a free [Mailtrap Email Testing](https://mailtrap.io) inbox (Email Testing → Inboxes → SMTP Settings). These are only needed if you want to see simulated emails delivered. If you just want to exercise the interface, add `MAIL_SUPPRESS_SEND=true` to `.env` — campaigns will launch and all metrics will record without any Mailtrap account.

Seed the database and start the server:

```bash
flask seed-db        # creates app.db and loads demo data
python run.py        # starts the backend on http://localhost:5001
```

---

## Frontend setup

```bash
cd frontend
npm install
npm run dev          # starts the frontend on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Login

| Field | Value |
|---|---|
| Email | `admin@phloris.com` |
| Password | `Phloris123` |

---

## Getting started

After logging in, the dashboard is pre-populated with seed data: three email templates (easy / medium / hard difficulty), two target groups, and three completed campaigns with realistic event data, so all charts and metrics render immediately.

To see the full end-to-end flow, go to **Campaigns**, create a new campaign (choose a template, a target group, and a sending profile), then launch it. Clicking the tracking link that appears in the Mailtrap inbox will record a click event and redirect to the recipient-facing feedback page.
