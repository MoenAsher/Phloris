# Phloris — Diagram Guide

Ground-truth reference for architecture, use-case, class, and sequence diagrams.
Derived entirely from reading the live source code; nothing is inferred from the spec.
Where the spec and the code diverge, the code governs; divergences are noted explicitly.

---

## 1. Data Models (SQLAlchemy)

All timestamps are stored as naive UTC datetimes. Timestamps produced by `utcnow()` (`backend/app/utils/time.py`).

### 1.1 Enums

**`Difficulty`** (`backend/app/models/template.py`)
```
easy | medium | hard
```
Default on Template: `medium`.

**`CampaignStatus`** (`backend/app/models/campaign.py`)
```
draft | scheduled | running | completed
```
`scheduled` is in the enum and the `scheduled_at` column exists in the DB, but the create/update API no longer accepts `scheduled_at` (future work; see §7).

**`EventType`** (`backend/app/models/event.py`)
```
sent | opened | clicked | reported
```
`opened` is reserved for future open-pixel tracking and is **never recorded** by any current code path; none of the four core metrics depend on it. `GET /track/open/<token>` does **not exist**.

---

### 1.2 `User` — table `users`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| email | String(255) | unique, NOT NULL, indexed |
| password_hash | String(255) | NOT NULL (Werkzeug PBKDF2) |
| created_at | DateTime | NOT NULL, default=utcnow |

No relationships to other tables.

---

### 1.3 `Template` — table `templates`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| name | String(255) | NOT NULL |
| subject | String(255) | NOT NULL |
| body_html | Text | NOT NULL |
| difficulty_level | Enum(Difficulty) | NOT NULL, default=medium |
| feedback_notes | Text | nullable |
| created_at | DateTime | NOT NULL, default=utcnow |

Supported placeholders in `body_html` and `subject`: `{{first_name}}`, `{{last_name}}`, `{{tracking_link}}`, `{{report_link}}`.

**Relationships:**
- `campaigns` → `Campaign` (one-to-many, back_populates="template")

---

### 1.4 `TargetGroup` — table `target_groups`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| name | String(255) | NOT NULL |
| description | String(500) | nullable |
| created_at | DateTime | NOT NULL, default=utcnow |

**Relationships:**
- `targets` → `Target` (one-to-many, cascade="all, delete-orphan")
- `campaigns` → `Campaign` (one-to-many, back_populates="target_group")

`to_dict()` computes `target_count = len(self.targets)` dynamically.

---

### 1.5 `Target` — table `targets`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| email | String(255) | NOT NULL, indexed |
| first_name | String(255) | nullable |
| last_name | String(255) | nullable |
| target_group_id | Integer | FK → target_groups.id, NOT NULL |
| created_at | DateTime | NOT NULL, default=utcnow |

**Relationships:**
- `group` → `TargetGroup` (many-to-one, back_populates="targets")
- `events` → `Event` (one-to-many, cascade="all, delete-orphan")
- `tracking_tokens` → `TrackingToken` (one-to-many, cascade="all, delete-orphan")

---

### 1.6 `SendingProfile` — table `sending_profiles`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| name | String(255) | NOT NULL, unique |
| smtp_host | String(255) | NOT NULL |
| smtp_port | Integer | NOT NULL, default=587 |
| smtp_username | String(255) | nullable |
| smtp_password_enc | Text | nullable (Fernet ciphertext; plaintext never stored or returned) |
| from_address | String(255) | NOT NULL |
| use_tls | Boolean | NOT NULL, default=True |
| created_at | DateTime | NOT NULL, default=utcnow |

`to_dict()` exposes `has_password: bool` (derived from `smtp_password_enc is not None`); the password itself is never serialised.

**Relationships:**
- `campaigns` → `Campaign` (one-to-many, back_populates="sending_profile")

---

### 1.7 `Campaign` — table `campaigns`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| name | String(255) | NOT NULL |
| template_id | Integer | FK → templates.id, NOT NULL |
| target_group_id | Integer | FK → target_groups.id, NOT NULL |
| sending_profile_id | Integer | FK → sending_profiles.id, nullable, default=None |
| status | Enum(CampaignStatus) | NOT NULL, default=draft |
| scheduled_at | DateTime | nullable |
| launched_at | DateTime | nullable |
| completed_at | DateTime | nullable |
| created_at | DateTime | NOT NULL, default=utcnow |

**Relationships:**
- `template` → `Template` (many-to-one)
- `target_group` → `TargetGroup` (many-to-one)
- `sending_profile` → `SendingProfile` (many-to-one, nullable)
- `events` → `Event` (one-to-many, cascade="all, delete-orphan")
- `tracking_tokens` → `TrackingToken` (one-to-many, cascade="all, delete-orphan")

---

### 1.8 `Event` — table `events`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| campaign_id | Integer | FK → campaigns.id, NOT NULL, indexed |
| target_id | Integer | FK → targets.id, NOT NULL, indexed |
| event_type | Enum(EventType) | NOT NULL, indexed |
| timestamp | DateTime | NOT NULL, default=utcnow (when the event occurred) |
| created_at | DateTime | NOT NULL, default=utcnow |

**Relationships:**
- `campaign` → `Campaign` (many-to-one)
- `target` → `Target` (many-to-one)

---

### 1.9 `TrackingToken` — table `tracking_tokens`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | PK |
| token | String(64) | unique, NOT NULL, indexed |
| campaign_id | Integer | FK → campaigns.id, NOT NULL |
| target_id | Integer | FK → targets.id, NOT NULL |
| created_at | DateTime | NOT NULL, default=utcnow |

Token generation: `secrets.token_urlsafe(32)` — URL-safe, opaque, no personal data.

**Relationships:**
- `campaign` → `Campaign` (many-to-one)
- `target` → `Target` (many-to-one)

---

### 1.10 Relationship Summary

```
User            (no FK relations to domain)
Template        ──< Campaign
TargetGroup     ──< Target
                ──< Campaign
SendingProfile  ──< Campaign
Campaign        ──< Event
                ──< TrackingToken
Target          ──< Event
                ──< TrackingToken
TrackingToken   >── Campaign
                >── Target
Event           >── Campaign
                >── Target
```

Cascade deletes:
- `TargetGroup` deleted → all `Target` rows deleted
- `Target` deleted → all `Event` + `TrackingToken` rows deleted
- `Campaign` deleted → all `Event` + `TrackingToken` rows deleted

Blocked deletes (409):
- `Template` delete blocked if any `Campaign` references it
- `TargetGroup` delete blocked if any `Campaign` references it
- `SendingProfile` delete blocked if any `Campaign` references it

---

## 2. API Endpoints

Base URL: `http://127.0.0.1:5001` (IPv4 explicit; port 5001).
All `/api/*` responses use `{"data": ...}` on success and `{"error": "message"}` on failure.
Tracking endpoints are at the root (no `/api` prefix).

### 2.1 Auth — prefix `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create admin account; returns `{user, access_token}` (201) |
| POST | `/api/auth/login` | public | Authenticate; returns `{user, access_token}` (200) |
| GET | `/api/auth/me` | JWT | Return current admin's user object |

### 2.2 Templates — prefix `/api`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/templates` | JWT | List all templates ordered by id |
| GET | `/api/templates/<id>` | JWT | Get a single template |
| POST | `/api/templates` | JWT | Create template; `name`, `subject`, `body_html` required; `difficulty_level` defaults to `medium` |
| PUT | `/api/templates/<id>` | JWT | Partial update (any subset of fields); no lock on in-use templates |
| DELETE | `/api/templates/<id>` | JWT | Delete; 409 if any campaign references the template |

### 2.3 Target Groups & Targets — prefix `/api`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/target-groups` | JWT | List all groups (includes `target_count`) |
| POST | `/api/target-groups` | JWT | Create group (`name` required) |
| DELETE | `/api/target-groups/<id>` | JWT | Delete group + cascade targets; 409 if referenced by campaign |
| GET | `/api/target-groups/<id>/targets` | JWT | List targets in group ordered by id |
| POST | `/api/target-groups/<id>/targets` | JWT | Add single target (`email` required); 409 on duplicate email in group |
| POST | `/api/target-groups/<id>/targets/import` | JWT | Bulk CSV import; accepts multipart file, JSON `{"csv": "..."}`, or raw body; returns `{imported, skipped, rejected[], targets[]}` (201) |
| DELETE | `/api/targets/<id>` | JWT | Delete single target |

CSV import de-duplicates against existing rows and within the file; rejected rows carry an `email` + `reason`.

### 2.4 Campaigns — prefix `/api`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/campaigns` | JWT | List all campaigns ordered by id |
| GET | `/api/campaigns/<id>` | JWT | Get campaign detail |
| POST | `/api/campaigns` | JWT | Create campaign (always `status=draft`; `name`, `template_id`, `target_group_id` required; `sending_profile_id` optional) |
| PUT | `/api/campaigns/<id>` | JWT | Partial update; only allowed for `draft` or `scheduled` campaigns; `scheduled_at` in body is silently ignored |
| POST | `/api/campaigns/<id>/launch` | JWT | Launch campaign (see §4); 422 if no sending profile; 502 if all sends fail |
| POST | `/api/campaigns/<id>/complete` | JWT | Transition `running → completed`; 409 if not `running` |
| DELETE | `/api/campaigns/<id>` | JWT | Delete campaign (cascades to events and tracking tokens) |

### 2.5 Tracking — no prefix (root)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/track/click/<token>` | public | Record `clicked` event; redirect 302 to feedback page |
| POST | `/report` | public | Record `reported` event; token from JSON body or form field |
| GET | `/report` | public | Record `reported` event; token from `?token=` query param; redirect 302 to feedback page with `?reported=1` |

`GET /track/open/<token>` — **does not exist**; reserved for future open-pixel tracking.

### 2.6 Dashboard — prefix `/api`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/overview` | JWT | System-wide totals: `total_campaigns`, `total_targets`, `emails_sent`, `overall_click_rate`, `overall_report_rate` |
| GET | `/api/dashboard/campaigns/<id>/metrics` | JWT | Four metrics for one campaign: `sent_count`, `clicked_count`, `reported_count`, `no_action_count`, `click_rate`, `report_rate`, `avg_time_to_click_seconds`, `avg_time_to_report_seconds` |
| GET | `/api/dashboard/campaigns/<id>/timeline` | JWT | Cumulative click/report reach over time: `{campaign_id, launched_at, points[{timestamp, event_type, cumulative_clicks, cumulative_reports}]}` |
| GET | `/api/dashboard/campaigns/<id>/targets` | JWT | Per-target results: `{campaign_id, targets[{target_id, email, first_name, last_name, sent, clicked, reported, outcome, time_to_click_seconds, time_to_report_seconds}]}` |

### 2.7 Feedback — prefix `/api`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/feedback/<token>` | public | Educational content for token's campaign: `{campaign_name, template_name, difficulty_level, feedback_notes}`; generic 404 if token unknown |

### 2.8 Performance — prefix `/api`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/performance/<token>` | public | Token-holder's own results across all campaigns they received: `{first_name, campaigns[{campaign_id, campaign_name, clicked, reported, outcome, time_to_click_seconds, time_to_report_seconds}]}` |

`outcome` values in performance: `clicked` | `reported` | `ignored` (note: differs from dashboard which uses `no_action` for the same case).

### 2.9 Sending Profiles — prefix `/api`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/sending-profiles` | JWT | List all profiles (`has_password` bool; password never returned) |
| GET | `/api/sending-profiles/<id>` | JWT | Get single profile |
| POST | `/api/sending-profiles` | JWT | Create profile; `name` (unique), `smtp_host`, `from_address` required; password encrypted at rest |
| PUT | `/api/sending-profiles/<id>` | JWT | Partial update; name uniqueness enforced |
| DELETE | `/api/sending-profiles/<id>` | JWT | Delete; 409 if any campaign references it |
| GET | `/api/sending-profiles/<id>/test` | JWT | Send test email to current admin via profile SMTP; returns `{sent_to: email}` |

### 2.10 Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | public | Returns `{"data": {"status": "ok"}}` |

---

## 3. Frontend Routes and Pages

React SPA served by Vite (dev: port 5173). React Router v6. Auth guard via `ProtectedRoute` component.

| Path | Auth | Page Component | Description |
|---|---|---|---|
| `/login` | public | `Login` | Email + password form; on success stores JWT in memory |
| `/feedback/:token` | public | `Feedback` | Recipient-facing: educational content after clicking a link; links to `/performance/:token` |
| `/performance/:token` | public | `Performance` | Recipient-facing: own campaign history (clicked/reported/ignored) |
| `/` | protected | `Dashboard` | Overview cards + per-campaign metric charts |
| `/campaigns` | protected | `Campaigns` | Campaign list with status badges; create dialog |
| `/campaigns/:id` | protected | `CampaignDetail` | Campaign info, launch + complete buttons, per-target results table, charts |
| `/templates` | protected | `Templates` | Template list; create/edit form dialog; delete |
| `/targets` | protected | `Targets` | Target groups + targets; add manually; import CSV; delete |
| `/sending-profiles` | protected | `SendingProfiles` | Sending profile CRUD; test connection |
| `*` | public | `NotFound` | Catch-all not-found page |

**Auth mechanism (`frontend/src/context/AuthContext.tsx`):**
- JWT held in React state (in-memory only; cleared on page refresh by design).
- `AuthContext.login()` calls `POST /api/auth/login`, stores `access_token` in state and mirrors it into the Axios module variable via `setAuthToken()`.
- Axios request interceptor attaches `Authorization: Bearer <token>` to every outgoing request.
- Axios response interceptor: on 401 (and token is held, and request is not an auth call), fires `onUnauthorized()` → clears state → `ProtectedRoute` redirects to `/login`.
- `ProtectedRoute` checks `isAuthenticated` (= `token !== null`); unauthenticated → `<Navigate to="/login" replace />`.

---

## 4. Email / Tracking Flow

### 4.1 Campaign launch sequence

**Trigger:** `POST /api/campaigns/<id>/launch` (JWT required)

**Pre-conditions checked by route:**
1. Campaign exists
2. `campaign.status ∈ {draft, scheduled}` (LAUNCHABLE_STATUSES)
3. `campaign.target_group.targets` is non-empty
4. `campaign.sending_profile_id` is not None (422 if missing)

**`launch_campaign(campaign)` — `backend/app/services/email_service.py`:**

```
for each target (in DB order, 0-indexed):
    if index > 0 and MAIL_SEND_DELAY > 0:
        sleep(MAIL_SEND_DELAY)           # default 1.0s — Mailtrap rate limit
    token = secrets.token_urlsafe(32)
    click_url  = {TRACKING_BASE_URL}/track/click/{token}
    report_url = {TRACKING_BASE_URL}/report?token={token}
    subject    = render(template.subject, target, click_url, report_url)
    body_html  = render(template.body_html, target, click_url, report_url)
    try:
        _send_via_profile(subject, target.email, body_html, campaign.sending_profile)
    except any exception:
        append {target_id, email, error} to result.failed
        continue                          # NO token/event created on failure
    persist TrackingToken(token, campaign_id, target_id)
    persist Event(EventType.sent, campaign_id, target_id, timestamp=utcnow())
    result.sent_count += 1

if result.sent_count > 0:
    campaign.status = running
    campaign.launched_at = utcnow()
    db.session.commit()
else:
    db.session.rollback()                 # campaign stays in original status
```

**Template rendering (`_render`):** substitutes `{{first_name}}`, `{{last_name}}`, `{{tracking_link}}`, `{{report_link}}`; missing first/last name collapses to empty string.

**Route response:** returns `{campaign, sent_count, total_targets, failed[]}` (200) or `{error, failed[]}` (502 if sent_count == 0).

---

### 4.2 Click tracking

```
Recipient clicks link
  → GET /track/click/{token}
  → TrackingToken.query.filter_by(token=token).first()
  → Event(EventType.clicked, campaign_id, target_id, timestamp=utcnow())
  → db.session.commit()
  → 302 redirect to {FRONTEND_ORIGIN}/feedback/{token}
```

---

### 4.3 Report tracking (two paths)

**Path A — emailed plain link:**
```
Recipient clicks report link
  → GET /report?token={token}
  → Event(EventType.reported, ...)
  → 302 redirect to {FRONTEND_ORIGIN}/feedback/{token}?reported=1
```

**Path B — programmatic POST (e.g. from feedback page):**
```
  → POST /report   body: {token: "..."}  or form token=...
  → Event(EventType.reported, ...)
  → 200 {"data": {"message": "..."}}
```

Both paths allow multiple reports from the same token; the metric service counts distinct targets, so repeats are harmless.

---

### 4.4 Metric computation (`backend/app/services/metrics.py`)

Single pass over all `Event` rows for the campaign. Builds three dicts keyed by `target_id`: `first_sent`, `first_clicked`, `first_reported` (earliest timestamp per target per type; `opened` events are explicitly skipped).

| Metric | Formula |
|---|---|
| `click_rate` | `len(first_clicked) / len(first_sent)` (0.0 if no sent events) |
| `report_rate` | `len(first_reported) / len(first_sent)` (0.0 if no sent events) |
| `avg_time_to_click_seconds` | mean of `(first_clicked[t] − first_sent[t]).total_seconds()` over `t ∈ clicked ∩ sent`; `None` if no qualifying target |
| `avg_time_to_report_seconds` | mean of `(first_reported[t] − first_sent[t]).total_seconds()` over `t ∈ reported ∩ sent`; `None` if no qualifying target |
| `no_action_count` | `len(sent − clicked − reported)` |

**Per-target outcome priority** (dashboard targets endpoint):
1. `not_sent` — no `sent` event found
2. `clicked` — has `sent` + `clicked`
3. `reported` — has `sent` + `reported` but no `clicked`
4. `no_action` — has `sent`, neither `clicked` nor `reported`

**Timeline endpoint:** emits one point per new distinct target click or report (ordered by timestamp), tracking cumulative distinct-target reach for clicks and reports separately.

**Overview endpoint:** counts distinct `(campaign_id, target_id)` pairs per event type across the entire system.

---

## 5. Frontend → Backend Request/Response Flow

### Connection
- Base URL: `http://127.0.0.1:5001` (hardcoded in `frontend/src/lib/api.ts`; IPv4 explicit)
- CORS: Flask-CORS configured for `FRONTEND_ORIGIN` (default `http://localhost:5173`)
- Axios instance (`api`) with request interceptor for `Authorization: Bearer <token>`

### Page-level API calls

| Page / Component | Calls |
|---|---|
| `Login` (via AuthContext) | `POST /api/auth/login` |
| `Dashboard` | `GET /api/dashboard/overview`, `GET /api/campaigns`, then per running/completed campaign: `GET /api/dashboard/campaigns/:id/metrics`, `GET /api/dashboard/campaigns/:id/timeline` |
| `Campaigns` | `GET /api/campaigns`, `GET /api/templates`, `GET /api/target-groups`, `GET /api/sending-profiles` |
| `CreateCampaignDialog` | `POST /api/campaigns` |
| `CampaignDetail` | `GET /api/campaigns/:id`, `GET /api/templates`, `GET /api/target-groups`, `GET /api/dashboard/campaigns/:id/targets`, `GET /api/dashboard/campaigns/:id/metrics`, `GET /api/dashboard/campaigns/:id/timeline` |
| `CampaignDetail` (launch) | `POST /api/campaigns/:id/launch` |
| `CampaignDetail` (complete) | `POST /api/campaigns/:id/complete` |
| `Templates` | `GET /api/templates`, `DELETE /api/templates/:id` |
| `TemplateFormDialog` | `POST /api/templates` (create) or `PUT /api/templates/:id` (edit) |
| `Targets` | `GET /api/target-groups`, `GET /api/target-groups/:id/targets`, `POST /api/target-groups/:id/targets`, `DELETE /api/targets/:id`, `DELETE /api/target-groups/:id` |
| `CreateGroupDialog` | `POST /api/target-groups` |
| `ImportCsvDialog` | `POST /api/target-groups/:id/targets/import` |
| `SendingProfiles` | `GET /api/sending-profiles`, `GET /api/sending-profiles/:id/test`, `DELETE /api/sending-profiles/:id` |
| `SendingProfileFormDialog` | `POST /api/sending-profiles` (create) or `PUT /api/sending-profiles/:id` (edit) |
| `Feedback` (public) | `GET /api/feedback/:token` |
| `Performance` (public) | `GET /api/performance/:token` |

---

## 6. External Integrations

### SMTP / Sending Profiles

Campaigns use a **SendingProfile** for delivery — not the global Flask-Mail config.

`email_service.py` opens a raw `smtplib` connection per send using the campaign's assigned profile:

| Condition | Protocol |
|---|---|
| `use_tls=True`, `smtp_port=465` | `smtplib.SMTP_SSL` (implicit TLS) |
| `use_tls=True`, any other port | `smtplib.SMTP` + `STARTTLS` |
| `use_tls=False` | plaintext |

If `smtp_username` and decrypted `smtp_password` are both present, `server.login()` is called before sending.

**Test mode (`MAIL_SUPPRESS_SEND=True`):** routes through Flask-Mail's suppressed-send path instead of opening an SMTP connection; used in automated tests so the full launch pipeline runs without depending on the third-party provider.

**SMTP password encryption:** Fernet symmetric encryption (Python `cryptography` library). Key from `SMTP_ENCRYPTION_KEY` env var. The test endpoint in `sending_profiles.py` uses `smtplib` directly (same dispatch table) to send a test email to the current admin's email address.

**Mailtrap (dev environment):** `sandbox.smtp.mailtrap.io:2525`. MAIL_SEND_DELAY defaults to 1.0s between sends to stay under the free-tier rate limit. Mailtrap captures messages without real delivery.

**Alternative providers:** any SMTP server works; change the sending profile's `smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, and `from_address`. The code is provider-agnostic.

---

## 7. Campaign Status Transitions

### All status values
`draft` | `scheduled` | `running` | `completed`

### Transitions reachable via the API

```
draft     ──[POST /api/campaigns/:id/launch]──► running
scheduled ──[POST /api/campaigns/:id/launch]──► running
running   ──[POST /api/campaigns/:id/complete]─► completed
```

**Notes:**
- Both `draft` and `scheduled` are in `LAUNCHABLE_STATUSES` and can be launched.
- `launch_campaign()` only sets `status=running` if `sent_count > 0`; if all sends fail the status does not change.
- `completed_at` is set to `utcnow()` by the complete endpoint.
- `launched_at` is set to `utcnow()` by `launch_campaign()` on success.

### Transitions NOT reachable via the API

| Transition | Reason |
|---|---|
| `draft → scheduled` | The create/update API no longer accepts `scheduled_at`; future work |
| `any → draft` | No endpoint resets status to draft |
| `completed → any` | No endpoint transitions out of completed |
| `running → draft/scheduled` | No such endpoint |

**`scheduled_at` column:** exists in the DB and is returned in campaign responses, but the only way it becomes non-null is via a direct DB write. The column is retained for the future auto-launch feature.

---

## 8. Not Implemented (spec vs. code)

| Spec item | Status |
|---|---|
| `GET /track/open/<token>` open-pixel endpoint | Not implemented; `opened` EventType reserved for future |
| Scheduled auto-launch (cron/scheduler) | **Implemented** — see §9 |
| `opened` event metric | Not used; skipped explicitly in `metrics.py` |
| JWT token stored in `localStorage` | Not done; JWT is in React state only (correct) |
| Credential harvesting | Not implemented (by design) |
| IP/UA/fingerprint collection | Not implemented (by design) |

---

## 9. Scheduling Feature — Additions and Corrections

> This section documents everything introduced after the initial §1–§8 snapshot. Where §1–§8 stated something was not implemented or not reachable, this section supersedes those claims. All facts below are derived from reading the live source code.

---

### 9.1 Data Models — What Changed

**No new model was added.** APScheduler runs entirely in-memory (`BackgroundScheduler`) and uses no persistence table. There is no `apscheduler_jobs` or similar DB table.

**`Campaign` model — `scheduled_at` is now actively used.**
Previously §1.7 and §7 stated that `scheduled_at` could only be set via a direct DB write, and that `draft → scheduled` was not reachable via the API. This is no longer true. The `scheduled_at` column is now set by `POST /api/campaigns/:id/schedule` and cleared (set to `NULL`) by `POST /api/campaigns/:id/unschedule`. The `scheduled` status value is fully reachable in normal operation.

No other column was added to `Campaign`. No other model changed.

---

### 9.2 New API Endpoints

Both endpoints are in `backend/app/routes/campaigns.py` and require JWT auth.

#### `POST /api/campaigns/<id>/schedule`

Schedule a draft campaign to auto-launch at a future time.

| Field | Value |
|---|---|
| Auth | JWT required |
| Allowed source status | `draft` only; 409 if already `scheduled`, `running`, or `completed` |

**Request body (JSON):**
```json
{ "scheduled_at": "<ISO-8601 datetime string, UTC, e.g. 2026-08-31T09:19:34Z>" }
```
`scheduled_at` is required (400 if absent), must parse as a valid ISO-8601 datetime (400 if not), and must be strictly in the future relative to server UTC (400 if not). Both `Z`-suffixed and offset-aware forms are accepted; the value is normalised to naive UTC before storage.

**Effect:** sets `campaign.status = scheduled`, sets `campaign.scheduled_at` to the parsed UTC datetime, commits.

**Response (200):** `{"data": <campaign dict>}` — the updated campaign object.

---

#### `POST /api/campaigns/<id>/unschedule`

Cancel a schedule, returning the campaign to draft.

| Field | Value |
|---|---|
| Auth | JWT required |
| Allowed source status | `scheduled` only; 409 if `draft`, `running`, or `completed` |

**Request body:** none (body is ignored).

**Effect:** sets `campaign.status = draft`, sets `campaign.scheduled_at = None`, commits.

**Response (200):** `{"data": <campaign dict>}` — the updated campaign object.

---

**PDF export — no new endpoint.** `exportCampaignPdf` is client-side only (see §9.5); it does not call any new or existing backend endpoint beyond what `CampaignDetail` already fetches on page load.

---

### 9.3 New Background Component — APScheduler

`backend/app/scheduler.py` introduces a `BackgroundScheduler` (APScheduler 3.11.3) that runs inside the Flask process as a daemon thread.

**Initialisation:**
`init_scheduler(app)` is called unconditionally from `create_app()` in `backend/app/__init__.py`. Two guards inside `init_scheduler` decide whether a scheduler is actually started:

1. **Test guard:** if `app.config["TESTING"]` is truthy, return immediately — no scheduler starts. This prevents side-effects during the test suite.
2. **Reloader guard:** under Werkzeug debug mode, two processes run (supervising parent + worker child). The worker sets `WERKZEUG_RUN_MAIN=true`; the parent does not. The scheduler starts **only** in the worker child (`app.debug=True` and `WERKZEUG_RUN_MAIN == "true"`). In production (`app.debug=False`) neither condition applies and the scheduler starts exactly once.

If neither guard fires, a `BackgroundScheduler(daemon=True, timezone="UTC")` is created, the sweep job is added, and the instance is stored in `app.extensions["scheduler"]`.

**Sweep job:**

| Property | Value |
|---|---|
| Job ID | `launch_due_campaigns` |
| Trigger | `interval`, every **60 seconds** |
| `max_instances` | 1 (no overlapping sweeps) |
| `coalesce` | True (missed runs collapsed into one) |

**What the sweep does (`_launch_due_campaigns`):**

```
open app context
query Campaign WHERE
    status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= utcnow()
ORDER BY scheduled_at ASC

for each due campaign:
    if campaign.sending_profile_id is None:
        log error, skip (campaign stays scheduled)
    elif campaign.target_group.targets is empty:
        log error, skip (campaign stays scheduled)
    else:
        call launch_campaign(campaign)   ← same function as manual launch
        on exception: log, rollback, continue
        on sent_count == 0: log error, continue
        on success: campaign is now status=running (set by launch_campaign)
```

**Double-launch prevention:** `launch_campaign()` sets `campaign.status = running` and commits before returning. Any subsequent sweep finds that campaign no longer matches `status = 'scheduled'` and skips it. There is no additional lock; the status flip is the sole guard.

**Reuses existing launch path — confirmed:** `_launch_one` calls `launch_campaign` from `backend/app/services/email_service.py`, the identical function used by `POST /api/campaigns/:id/launch`. There is no second send code path.

**Architecture note:** The scheduler is a distinct architectural actor, not part of the Flask request/response cycle. It must be shown separately in architecture diagrams (e.g. as a "Background thread / APScheduler" actor), connected to the Flask app context and the database but not to the HTTP layer.

---

### 9.4 Updated Campaign Status Transitions

The following replaces §7 as the authoritative list of reachable transitions. Divergences from §7 are noted.

**All reachable transitions:**

| From | To | Trigger | Who |
|---|---|---|---|
| `draft` | `running` | `POST /api/campaigns/:id/launch` | Manual (admin) |
| `draft` | `scheduled` | `POST /api/campaigns/:id/schedule` | Manual (admin) — **new; was listed as unreachable in §7** |
| `scheduled` | `running` | `POST /api/campaigns/:id/launch` | Manual (admin) |
| `scheduled` | `running` | APScheduler sweep (every 60s) | Automatic — **new** |
| `scheduled` | `draft` | `POST /api/campaigns/:id/unschedule` | Manual (admin) — **new; was listed as unreachable in §7** |
| `running` | `completed` | `POST /api/campaigns/:id/complete` | Manual (admin) |

**Still-unreachable transitions (unchanged from §7):**
- `any → draft` except via `/unschedule` (which is only from `scheduled`)
- `completed → any`
- `running → draft` or `running → scheduled`

**`launched_at` and `scheduled_at` assignment:**
- `scheduled_at` is set by `/schedule`, cleared to `None` by `/unschedule` and also by `launch_campaign()` (indirectly — the campaign's status moves to `running` so the field becomes irrelevant, but the column value is not explicitly cleared on launch).
- `launched_at` is set by `launch_campaign()` to `utcnow()` on a successful send (both manual and automatic paths).
- `completed_at` is set by `/complete` to `utcnow()`.

**Condition for automatic launch failure without status change:**
If the scheduler sweep fires but `sending_profile_id is None` or the target group is empty, the campaign remains `scheduled` with its original `scheduled_at` intact. A later sweep will attempt it again.

---

### 9.5 New Frontend Elements

All changes are confined to existing files; no new page components were added.

#### `CampaignDetail` (`frontend/src/pages/CampaignDetail.tsx`)

**Schedule button:** rendered only when `campaign.status === 'draft'`. Opens a modal dialog containing a `datetime-local` input. The UI labels times as the user's local timezone. On confirm, the frontend converts the local time to UTC via `new Date(scheduleValue).toISOString()` and POSTs the ISO string to `POST /api/campaigns/:id/schedule`. After success, `fetchDetail()` is called to refresh all page data.

**Unschedule button:** rendered inside the scheduled-campaign banner (below the header) when `campaign.status === 'scheduled'`. Calls `POST /api/campaigns/:id/unschedule` directly (no confirmation dialog). After success, `fetchDetail()` refreshes the page.

**Scheduled banner:** a blue info box rendered when `campaign.status === 'scheduled'`, showing the formatted `scheduled_at` time (via `formatDate(campaign.scheduled_at)`, which calls `new Date(iso).toLocaleString()`) and the Unschedule button.

**Export PDF button:** an "Export PDF" button rendered unconditionally in the header action row. Disabled until `metrics` and `targets` are both loaded. Calls `handleExport()` which delegates to `exportCampaignPdf()` (see §9.5 PDF export below). No network request is made; data already in page state is passed directly. An inline error message renders below the button on failure.

**New imports used by `CampaignDetail`:** `CalendarClock`, `CalendarX2`, `Download` icons from `lucide-react`; `Skeleton` from `@/components/ui/skeleton`; `exportCampaignPdf` from `@/lib/campaignPdf`.

#### `StatusBadge` (`frontend/src/components/campaigns/StatusBadge.tsx`)

Now handles all four `CampaignStatus` values including `scheduled`. Colour mapping:

| Status | Style |
|---|---|
| `draft` | neutral grey |
| `scheduled` | blue (`bg-blue-100 text-blue-800`) |
| `running` | amber |
| `completed` | green |

---

### 9.6 PDF Export Flow

**Entirely client-side — no backend request is made during export.** The PDF is built and downloaded without any HTTP call beyond the data fetches that `CampaignDetail` already performs on page load.

**Implementation:**
- Module: `frontend/src/lib/campaignPdf.ts`
- Function: `exportCampaignPdf(args: CampaignPdfArgs): void`
- Dependencies: `jspdf` (^4.2.1) and `jspdf-autotable` (^5.0.8), added to `frontend/package.json`

**Input:** the function receives already-loaded in-memory data: `campaign`, `templateName`, `groupName`, `profileName`, `targetCount`, `metrics` (from `GET /api/dashboard/campaigns/:id/metrics`), and `targets` (from `GET /api/dashboard/campaigns/:id/targets`). No new endpoint is called.

**Output:** a single A4 PDF built in memory and downloaded as `phloris-campaign-{slug}-{YYYY-MM-DD}.pdf`.

**PDF contents:**
1. Header: "Phloris — Campaign Report" + campaign name + generation timestamp
2. Campaign details table: name, template, target group, sending profile, status, launched timestamp, completed timestamp (if set), total targets
3. Behavioural metrics table: click rate, report rate, average time-to-click, average time-to-report
4. Per-target results table: email, name, outcome, time-to-click, time-to-report
5. Page footer on every page: generation timestamp + page N of M

**No charts are included in the PDF** — only numeric tables. The in-app Recharts visualisations are not rendered into the document.

**Timestamps in the PDF** are formatted via `new Date(iso).toLocaleString()` — the same `formatDate` helper used in the UI. After the §0 timezone fix (appending `Z` to UTC strings in `backend/app/utils/time.py → iso()`), these display in the user's local timezone correctly.

**Architecture implication:** the PDF export is a purely frontend operation. It does not appear in any backend architecture diagram. In a frontend sequence diagram it is a local operation (browser → `jspdf` → local file download) with no server arrow.

---

### 9.7 Correction: Frontend API Base URL

§5 stated "Base URL: `http://127.0.0.1:5001` (hardcoded in `frontend/src/lib/api.ts`; IPv4 explicit)". This is no longer correct.

`frontend/src/lib/api.ts` now uses `const BASE_URL = ''` (empty string). All requests go to the same origin as the page. In development the Vite dev server (`localhost:5173`) proxies `/api`, `/track`, and `/report` to `http://127.0.0.1:5001` (defined in `frontend/vite.config.ts`). In production Flask serves both the API and the built frontend bundle from the same origin, so relative URLs work unchanged.

The proxy configuration in `vite.config.ts`:
```
/api    → http://127.0.0.1:5001
/track  → http://127.0.0.1:5001
/report → http://127.0.0.1:5001
```

**Reason for the change:** direct cross-origin calls from `localhost:5173` to `127.0.0.1:5001` are blocked by Chrome's Private Network Access gating and Safari's local-network prompt. Routing through the Vite proxy makes every browser request same-origin, avoiding both restrictions.

**Impact on diagrams:** in a development sequence diagram, the browser arrow should point to the Vite server (`:5173`), which then forwards the request to Flask (`:5001`). The CORS configuration (`FRONTEND_ORIGIN=http://localhost:5173`) remains correct because Flask still needs to allow the Vite origin for preflight responses it generates — even though the main data requests are now proxied, CORS headers are still evaluated.
