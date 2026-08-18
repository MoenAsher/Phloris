# Phloris — Test Results (Expected vs Actual)

> Consolidated results for the backend, frontend, and full-system test plans.
> The **Actual** columns below are values observed from the running system, not
> transcribed from the specs. Metric values were captured by executing the
> metrics service against controlled datasets (see "How these were captured").
> Last run: **2026-07-16.**

## Suite totals

| Suite | Command | Tests | Passed | Failed |
|---|---|---|---|---|
| Backend (pytest) | `cd backend && venv/bin/python -m pytest` | 102 | 102 | 0 |
| Frontend E2E (Playwright, real browser + backend) | `cd frontend && npm run test:e2e` | 75 | 75 | 0 |
| Frontend component (Vitest + RTL) | `cd frontend && npm test` | 10 | 10 | 0 |
| **Total automated** | | **187** | **187** | **0** |

Machine-readable Playwright output: `frontend/e2e-results.json` (status + timing only, gitignored). The metric values in this file are not in that JSON — they are captured below.

---

## 1. Behavioural metrics — expected vs actual (UR-04..UR-07)

### 1a. Controlled 5-target scenario (backend `tests/test_metrics.py`, fixture `scenario_5`)

Setup: 5 targets all `sent` at T0. A clicked @+10s; B clicked @+20s **and again @+40s** (double-click); C clicked @+30s then reported @+50s; D reported @+70s; E no action.

| Metric | Expected | Actual | Result |
|---|---|---|---|
| sent_count (distinct) | 5 | 5 | ✅ PASS |
| clicked_count (distinct targets) | 3 (A,B,C) | 3 | ✅ PASS |
| reported_count (distinct targets) | 2 (C,D) | 2 | ✅ PASS |
| no_action_count | 1 (E) | 1 | ✅ PASS |
| **click_rate** = 3/5 | 0.60 | **0.60** | ✅ PASS |
| **report_rate** = 2/5 | 0.40 | **0.40** | ✅ PASS |
| **avg_time_to_click** = mean(10,20,30)s | 20.0 s | **20.0 s** | ✅ PASS |
| **avg_time_to_report** = mean(50,70)s | 60.0 s | **60.0 s** | ✅ PASS |

Notes: B's double-click uses the **earliest** click (20s, not 40s) and counts the target **once** — so neither the rate nor the average is inflated (UR-04, UR-06). D (report, no click) and E (no action) are correctly excluded from the click average (UR-06/07, test 7.4).

### 1b. Idempotency (edge cases 14.2 / 14.3)

Setup: target A clicks **twice**, target B reports **twice**, in a 2-target campaign.

| Metric | Expected | Actual | Result |
|---|---|---|---|
| raw click events stored | 2 | 2 | ✅ PASS |
| distinct clicked_count | 1 | 1 | ✅ PASS |
| distinct reported_count | 1 | 1 | ✅ PASS |
| click_rate = 1/2 | 0.50 | 0.50 | ✅ PASS |
| report_rate = 1/2 | 0.50 | 0.50 | ✅ PASS |

### 1c. Concurrent clicks (edge case 14.10)

Setup: 5 targets each click once, fired concurrently.

| Metric | Expected | Actual | Result |
|---|---|---|---|
| raw click events stored | 5 | 5 | ✅ PASS |
| distinct clicked_count | 5 | 5 | ✅ PASS |
| click_rate = 5/5 | 1.00 | 1.00 | ✅ PASS |

No events lost under concurrency.

### 1d. Percentage rendering in the UI (UR-04/05 display, 6.4)

The backend returns fractions (0.0–1.0); the dashboard renders them as percentages (`formatPercent`). E2E asserted the rendered strings and passed.

| Backend rate (actual) | Expected UI string | Actual UI string | Result |
|---|---|---|---|
| 0.3333… | "33.3%" | "33.3%" | ✅ PASS |
| 0.6666… | "66.7%" | "66.7%" | ✅ PASS |
| 0.5 | "50.0%" | "50.0%" | ✅ PASS |
| 0.0 | "0.0%" | "0.0%" | ✅ PASS |

---

## 2. End-to-end journeys — expected vs actual (Section 13)

### Journey A — full happy path (3 targets: 1 click, 1 report, 1 idle)

| Item | Expected | Actual | Result |
|---|---|---|---|
| click_rate (backend) | 0.3333 → 33.3% | 0.3333 → **33.3%** | ✅ PASS |
| report_rate (backend) | 0.3333 → 33.3% | 0.3333 → **33.3%** | ✅ PASS |
| target 1 outcome | clicked | clicked | ✅ PASS |
| target 2 outcome | reported | reported | ✅ PASS |
| target 3 outcome | no action | no action | ✅ PASS |
| time-to-click / time-to-report | populated (not "—") | populated | ✅ PASS |
| feedback page (target 1) | shown, template-specific tips | shown | ✅ PASS |
| performance page per token | only that recipient's data | only own data | ✅ PASS |

### Journey B — multi-campaign aggregation + independence

Overview deltas measured before/after creating two campaigns (B1: 3 targets/2 clicks; B2: 2 targets/1 report):

| Item | Expected | Actual | Result |
|---|---|---|---|
| Δ total_campaigns | +2 | +2 | ✅ PASS |
| Δ total_targets | +5 | +5 | ✅ PASS |
| Δ emails_sent | +5 | +5 | ✅ PASS |
| B1 click_rate = 2/3 | 0.6667 → 66.7% | 0.6667 → **66.7%** | ✅ PASS |
| B1 report_rate | 0.0 → 0.0% | 0.0 → **0.0%** | ✅ PASS |
| B2 click_rate | 0.0 → 0.0% | 0.0 → **0.0%** | ✅ PASS |
| B2 report_rate = 1/2 | 0.5 → 50.0% | 0.5 → **50.0%** | ✅ PASS |

Per-campaign metrics stay independent; overview aggregates both.

### Journey C — one recipient across two campaigns (shared group)

| Item | Expected | Actual | Result |
|---|---|---|---|
| campaigns shown on performance page | 2 (both) | 2 | ✅ PASS |
| outcome in campaign 1 | clicked | clicked | ✅ PASS |
| outcome in campaign 2 | reported | reported | ✅ PASS |
| cross-contamination between campaigns | none | none | ✅ PASS |

---

## 3. Section-level results (full-system plan §17)

| Section | Tests | Passed | Failed |
|---|---|---|---|
| 2. System Health | 4 | 4 | 0 |
| 3–10. Requirements (UR-01..UR-10) | 34 | 34 | 0 |
| 11. Access Boundaries | 3 | 3 | 0 |
| 12. Data Integrity | 5 | 5 | 0 |
| 13. E2E Journeys | 3 | 3 | 0 |
| 14. Edge Cases | 12 | 12 | 0 |
| 15. Security/Privacy | 8 | 8 | 0 |
| **Total** | **69** | **69** | **0** |

Data-integrity actuals (probed via API): delete template-in-use → **409**; delete group-in-use → **409**; relaunch running → **409**; delete target mid-campaign → **200**, metrics/overview stay **200** (events + tokens cascade-deleted); timestamps stored as naive **UTC** (e.g. `2026-07-16T03:37:31.366951`).

---

## 4. Bug found and fixed (CRITICAL — 11.3 / 15.7 UI)

| | |
|---|---|
| Symptom | A 401 mid-session (expired/rejected token) left the admin on the page showing a generic error instead of returning to Login. |
| Expected | 401 → UI redirects to Login. |
| Actual (before fix) | Stayed on `/campaigns`, error state shown. **FAIL** |
| Root cause | `ProtectedRoute` gated only on in-memory token presence; no Axios 401 handling. |
| Fix | 401 response interceptor in `frontend/src/lib/api.ts` → `onUnauthorized` → `AuthContext.logout()` → redirect to `/login`. Excludes the login/register calls. |
| Actual (after fix) | Redirects to `/login`. **PASS** (`22-security.spec.ts` "15.7 a 401 mid-session returns the admin to Login") |

---

## How these were captured

- **Metric values (§1, §2):** executed `app.services.metrics.campaign_metrics()` against controlled in-memory datasets (isolated temp SQLite, `MAIL_SUPPRESS_SEND`), reproducing each scenario's exact events and reading back the computed metrics. The frontend rendered-string actuals come from passing Playwright assertions (`toHaveText('33.3%')`, etc.).
- **Email content/personalisation/links (UR-03):** verified against the exact rendered messages via Flask-Mail's `record_messages()` outbox in `backend/tests/test_email.py`; live Mailtrap delivery separately confirmed by a single-target send (`sent_count=1, failed=[]`). The free tier rate-limits bursts and there is no Mailtrap API token to read the inbox, so multi-send arrival is not asserted programmatically.
- **Reproduce:** `cd backend && venv/bin/python -m pytest` and `cd frontend && npm run test:e2e` (run the backend with `MAIL_SUPPRESS_SEND=True MAIL_SEND_DELAY=0` for deterministic launch E2E).
