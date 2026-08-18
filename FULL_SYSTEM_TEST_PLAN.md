# Phloris — Full System Functional Test Plan

> Reference document for the AI coding agent. This defines end-to-end functional tests across the complete Phloris system (backend + frontend + Mailtrap), organised around the ten user requirements and real user workflows. It also covers edge cases, error handling, and the ethical/privacy guarantees that define the project. Run this after the backend and frontend test plans pass. Record expected result, actual result, and PASS/FAIL for every test.

---

## How to Use This Document

1. Both servers running (backend 5001, frontend 5173); Mailtrap sandbox configured.
2. Start from a clean, seeded database so results are reproducible.
3. Sections 3–12 are requirement-driven; Section 13 is workflow-driven (full journeys); Section 14 is edge cases; Section 15 is the ethical/privacy audit.
4. Prefer testing through the UI (as a real user would), dropping to direct API calls only where noted.
5. Complete the traceability matrix (Section 16) mapping each UR to its verifying tests.

**Severity levels:**
- **CRITICAL** — breaks a core requirement or an ethical/privacy guarantee.
- **HIGH** — produces incorrect data or a broken workflow.
- **MEDIUM** — robustness/edge-case handling.

---

## 1. Pre-Test Checklist

- [x] Backend running on 5001, no errors. (health 200)
- [x] Frontend running on 5173, no console errors. (E2E 1.3)
- [x] Mailtrap credentials valid. Confirmed by a live single-target send (`sent_count=1, failed=[]`). Inbox emptiness/contents cannot be asserted programmatically (no Mailtrap API token in `.env`, SMTP only). See the delivery note in §17.
- [x] Database: admin present; automated suites use isolated data (pytest uses a disposable `instance/test.db`; E2E creates uniquely-named entities per run). The dev DB carries accumulated test data from prior runs, so journey/edge assertions use **per-campaign exact metrics** and **overview deltas** rather than absolute global totals.
- [x] Admin credentials available. (`fe-admin@simulation.local`)

---

## 2. System Health (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 2.1 | Backend health check responds | 200 OK |
| 2.2 | Frontend loads | Login page renders |
| 2.3 | Frontend↔backend connectivity | Authenticated call succeeds; no CORS error |
| 2.4 | Mailtrap reachable | Test send lands in the inbox |

---

## 3. UR-01 — Dashboards and Reports (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 3.1 | Dashboard overview reflects real system totals | Campaign/target counts and overall rates correct |
| 3.2 | Per-campaign metrics display all four behavioural metrics | click rate, report rate, time-to-click, time-to-report present |
| 3.3 | Charts render from real campaign data | Bar, pie, and line charts populated correctly |
| 3.4 | Metrics update after new interactions | After a click/report, refreshed dashboard reflects the change |

---

## 4. UR-02 — Templates at Varying Difficulty (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 4.1 | Create templates at each difficulty (easy/medium/hard) | All persist with correct difficulty |
| 4.2 | Use a template in a campaign | Selected template's content is what gets sent |
| 4.3 | Difficulty is visible in the UI | Badge/label correct throughout |

---

## 5. UR-03 — Sandboxed Email Delivery (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 5.1 | Launch a campaign | Emails delivered to Mailtrap only |
| 5.2 | No email reaches a real external inbox | Confirmed — sandbox only |
| 5.3 | Email content matches the template | Subject and body correct |
| 5.4 | Personalisation applied | first_name/last_name correct per recipient |
| 5.5 | Tracking + report links present and correct | Point to port 5001 with valid tokens |

---

## 6. UR-04 & UR-05 — Click Rate & Reporting Rate (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 6.1 | With a known set of clicks, click rate is correct | Matches distinct-clickers / sent |
| 6.2 | With a known set of reports, reporting rate is correct | Matches distinct-reporters / sent |
| 6.3 | Double-click by one target does not inflate click rate | Counted once |
| 6.4 | Rates shown as percentages in the UI | Correct conversion |

---

## 7. UR-06 & UR-07 — Time-to-Click & Time-to-Report (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 7.1 | Time-to-click computed from sent→click interval | Correct average across clickers |
| 7.2 | Time-to-report computed from sent→report interval | Correct average across reporters |
| 7.3 | Times displayed human-readably | e.g. seconds/minutes, not raw timestamps |
| 7.4 | Targets who did not click/report excluded from the respective averages | No skew from non-participants |

---

## 8. UR-08 — Ethical Safeguards (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 8.1 | No credential-capture form or endpoint exists anywhere | Confirmed absent |
| 8.2 | Stored events contain only type + timestamp + linkage | No extra data |
| 8.3 | No IP address captured at any point | Confirmed |
| 8.4 | No user-agent / device / browser fingerprint captured | Confirmed |
| 8.5 | Tracking tokens are opaque | No personal data derivable from a token |
| 8.6 | Delivery restricted to sandbox | No real-recipient send path active |

---

## 9. UR-09 — Educational Feedback (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 9.1 | Clicking a simulated link shows the feedback page | Redirect works end to end |
| 9.2 | Feedback is educational and non-punitive | Tone correct |
| 9.3 | Template-specific tips shown | feedback_notes displayed |
| 9.4 | Feedback accessible without login | Public page |

---

## 10. UR-10 — Recipient Performance View (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 10.1 | Recipient can view their own results via token | Own history shown |
| 10.2 | Cannot view another recipient's results | Token strictly scoped |
| 10.3 | Cannot enumerate other recipients | No leakage via params or response |
| 10.4 | Accessible without login | Public, token-scoped |

---

## 11. Role/Access Boundaries (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 11.1 | Admin routes require authentication | Unauthenticated access blocked |
| 11.2 | Public routes work without authentication | Tracking, report, feedback, performance all public |
| 11.3 | An expired/invalid JWT is rejected on admin routes | 401; UI redirects to Login |

---

## 12. Data Integrity (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 12.1 | Deleting a template used by a campaign | Defined, consistent behaviour (block or handle) — no orphaned/broken campaign |
| 12.2 | Deleting a target group used by a campaign | Defined, consistent behaviour — no crash |
| 12.3 | Deleting a target mid-campaign | Handled; metrics remain coherent |
| 12.4 | Relaunching or duplicate-launching prevented | No duplicate sends or double-counted events |
| 12.5 | Timestamps stored in UTC | Consistent; display converts appropriately |

---

## 13. End-to-End User Journeys (CRITICAL)

Run each journey completely through the UI.

**Journey A — Full campaign happy path:**
1. Log in as admin.
2. Create a template (medium difficulty) with feedback_notes.
3. Create a target group and add 3 targets.
4. Create a campaign using that template + group.
5. Launch the campaign.
6. Confirm 3 emails in Mailtrap with correct personalisation and tracking links.
7. Click the tracking link for target 1 → land on feedback page.
8. Submit a report for target 2 via the report link.
9. Leave target 3 with no action.
10. Open the dashboard for the campaign.

**Expected:** click rate 33.3% (1/3), reporting rate 33.3% (1/3), target 1 = clicked, target 2 = reported, target 3 = no-action; time-to-click and time-to-report populated for the relevant targets; feedback page displayed correctly for target 1; performance page for each token shows only that recipient's data.

**Journey B — Multi-campaign aggregation:**
1. Create and launch a second campaign to a different group.
2. Generate a different mix of clicks/reports.
3. Check the dashboard overview.

**Expected:** overview totals correctly aggregate both campaigns; per-campaign views remain independent and correct.

**Journey C — Recipient in multiple campaigns:**
1. Include the same target (same email) in two different campaigns.
2. Have them click in one and report in the other.
3. Open that recipient's performance page.

**Expected:** performance page shows both campaigns with the correct distinct outcomes; no cross-contamination between campaigns.

---

## 14. Edge Cases & Error Handling (HIGH/MEDIUM)

| # | Test | Expected Result |
|---|---|---|
| 14.1 | Launch a campaign with an empty target group | Graceful handling; no crash; clear message |
| 14.2 | Click a tracking link twice | Second click does not inflate the rate |
| 14.3 | Report the same email twice | Reporting rate counts the target once |
| 14.4 | Click a malformed/unknown token | Graceful not-found; no crash; no event created |
| 14.5 | Access performance with a malformed token | Graceful not-found; no data leak |
| 14.6 | Very long template body / subject | Stored and rendered without breaking layout or send |
| 14.7 | CSV import with duplicate emails in one group | Defined behaviour (dedupe or allow) — consistent, no crash |
| 14.8 | Special characters / non-ASCII in names | Rendered correctly in email and UI |
| 14.9 | Backend unreachable while using the UI | Frontend shows an error state, not a blank/crash |
| 14.10 | Concurrent clicks from multiple targets near-simultaneously | All recorded correctly; no lost events |
| 14.11 | Launch, then immediately open the dashboard before any interaction | Zero-activity state renders (0% rates), not NaN or error |
| 14.12 | Delete a campaign that has recorded events | Defined behaviour; no orphaned data that breaks the dashboard |

---

## 15. Security & Privacy Audit (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 15.1 | JWT never stored in localStorage/sessionStorage | Confirmed in browser |
| 15.2 | Password hash never returned by any endpoint or shown in UI | Confirmed |
| 15.3 | No personal data in tracking URLs | Opaque tokens only |
| 15.4 | Performance endpoint strictly token-scoped | No cross-recipient access |
| 15.5 | No IP / user-agent / fingerprint stored anywhere | Confirmed across backend |
| 15.6 | No credential-harvesting capability exists | Confirmed absent |
| 15.7 | Protected endpoints reject tampered/expired tokens | 401 responses |
| 15.8 | Error messages do not leak internal details (stack traces, secrets) | Clean, user-appropriate errors |

---

## 16. Requirement Traceability Matrix (completed 2026-07-16)

Verifying tests are automated. Legend: **BE** = backend pytest (`backend/tests/`, 102 tests); **E2E** = Playwright (`frontend/e2e/`, 75 tests); **CT** = component (`frontend/tests/`, 10 tests).

| UR | Requirement | Verifying Tests | Status |
|---|---|---|---|
| UR-01 | Dashboards and reports | E2E `07-dashboard` (8.1–8.10 + API cross-check), Journeys A/B (`20-journeys`); BE `test_dashboard` | ✅ PASS |
| UR-02 | Templates at varying difficulty | E2E `03-templates` (4.1–4.13), CT `TemplateFormDialog`, Journey A; BE `test_templates` | ✅ PASS |
| UR-03 | Sandboxed email delivery | Live send (2.4/5.1); BE `test_email` (content, personalisation, links→:5001, unique/opaque tokens); `test_ethics` (12.6 Mailtrap-only); Journey A step 6 | ✅ PASS |
| UR-04 | Click rate | BE `test_metrics` (0.60 exact, double-click once); E2E 14.2 (double-click), Journeys A/B; dashboard % | ✅ PASS |
| UR-05 | Reporting rate | BE `test_metrics` (0.40 exact, double-report once); E2E 14.3, Journeys A/B; dashboard % | ✅ PASS |
| UR-06 | Time-to-click | BE `test_metrics` (avg 20.0s, excludes non-clickers); E2E Journey A (populated), dashboard human-readable | ✅ PASS |
| UR-07 | Time-to-report | BE `test_metrics` (avg 60.0s, excludes non-reporters); E2E Journey A, dashboard human-readable | ✅ PASS |
| UR-08 | Ethical safeguards | BE `test_ethics` (no cred capture; event = type+timestamp+linkage only; no IP/UA/fingerprint in code or schema; opaque tokens; Mailtrap-only); E2E 15.3 | ✅ PASS |
| UR-09 | Educational feedback | E2E `08-feedback` (9.1–9.7), Journey A step 7; BE `test_feedback` | ✅ PASS |
| UR-10 | Recipient performance view | E2E `09-performance` (10.1–10.5), 15.4 (token-scoped), Journey C; BE `test_performance` | ✅ PASS |

---

## 17. Results Summary (completed 2026-07-16)

**Automation:** 102 backend (pytest) + 75 E2E (Playwright, real browser + real backend) + 10 component (Vitest) = **187 automated tests, all passing.** Section 12 additionally probed directly via the API. All ten user requirements verified; all three journeys pass with exact expected metrics; every CRITICAL/HIGH item passes.

| Section | Tests | Passed | Failed | Notes |
|---|---|---|---|---|
| 2. System Health | 4 | 4 | 0 | health 200; login page renders; CORS OK for :5173; live Mailtrap send confirmed. |
| 3–10. Requirements (UR-01..UR-10) | 34 | 34 | 0 | See traceability matrix §16. Exact metrics from `test_metrics` (0.60/0.40, TTC 20s, TTR 60s). |
| 11. Access Boundaries | 3 | 3 | 0 | Admin routes gated; public routes open; **401 → UI redirect fixed** (see below). |
| 12. Data Integrity | 5 | 5 | 0 | Template/group-in-use deletes → 409; relaunch → 409; target delete cascades events+tokens (coherent); UTC timestamps. |
| 13. E2E Journeys | 3 | 3 | 0 | A: 33.3%/33.3%, correct outcomes, feedback + per-token performance. B: overview aggregates (+2 campaigns/+5 targets/+5 sent), per-campaign 66.7%/0% and 0%/50%. C: one recipient, two campaigns, distinct clicked/reported. |
| 14. Edge Cases | 12 | 12 | 0 | Empty-group launch blocked; idempotent click/report; unknown token 404 + no event; long body; CSV dedupe; non-ASCII; backend-down error state; concurrent clicks; zero-activity 0% (no NaN); delete-with-events. |
| 15. Security/Privacy | 8 | 8 | 0 | JWT in-memory only; no hash exposed; opaque tokens; strictly token-scoped performance; no IP/UA (BE `test_ethics`); no cred harvesting; tampered/missing/forged JWT → 401; clean error envelopes. |
| **Total** | **69** | **69** | **0** | 0 CRITICAL/HIGH outstanding. |

### Bug found and fixed (CRITICAL — Access Boundaries 11.3 / 15.7 UI)

**A 401 mid-session did not return the admin to Login.** `ProtectedRoute` gated only on token *presence* (in-memory), and there was no Axios response interceptor. So when the access token expired or was rejected (backend correctly returns 401), the SPA stayed on the page and showed a generic error state instead of redirecting to Login as 11.3 requires — leaving the user in a broken, half-authenticated state. **Fix:** added a response interceptor in `frontend/src/lib/api.ts` that, on a 401 from an *authenticated* admin call (token held, and not the login/register call itself), invokes a registered `onUnauthorized` handler; `AuthContext` registers `logout`, which clears the in-memory session so `ProtectedRoute` redirects to `/login`. Verified by `22-security.spec.ts` "15.7 a 401 mid-session returns the admin to Login". The backend 401 responses themselves were already correct (15.7 backend test passes independently).

### Delivery-verification methodology (UR-03 / §5 / Journey A step 6)

Real Mailtrap sandbox delivery is confirmed by a **live single-target send** (`sent_count=1, failed=[]`). The Mailtrap **free tier rate-limits bursts** (`550 5.7.0 Too many emails per second`), so multi-target launches against the live sandbox are non-deterministic, and there is **no Mailtrap API token** in `.env` to read the inbox programmatically. Therefore email **content, personalisation, and tracking/report links (→ `http://localhost:5001/...` with valid opaque tokens)** are verified deterministically against the exact rendered messages via Flask-Mail's `record_messages()` outbox in `backend/tests/test_email.py`. The UI journeys and edge/security suites were run with the backend in deterministic mode (`MAIL_SUPPRESS_SEND=True MAIL_SEND_DELAY=0`); the backend was restored to real-send mode afterward. `MAIL_SUPPRESS_SEND` defaults **off** — production/normal delivery is unchanged.

### Notes on test approach
- Opaque tracking tokens are not exposed by any API (by design), so tests that must act as a recipient read the token straight from the SQLite file, then drive the real `/track/click` and `/report` endpoints through the browser.
- Recipient actions run in a separate browser context so the admin session stays alive (recipient ≠ admin), matching real usage.

For each FAILED test: record the failure, root cause, and fix. Re-run affected tests after fixes.

---

## Definition of "System Functionally Complete"

- [x] All ten user requirements verified through the traceability matrix. (§16)
- [x] All three end-to-end journeys pass with exact expected metric values. (33.3%/33.3%; 66.7%/0% & 0%/50%; two-campaign distinct outcomes)
- [x] All CRITICAL security/privacy tests pass. (§15; JWT in-memory, opaque tokens, token-scoped performance, no IP/UA, no cred harvest, 401 handling)
- [x] Edge cases handled gracefully with no crashes. (§14, 12/12)
- [x] Ethical safeguards confirmed intact across the full system. (BE `test_ethics`; UR-08)
- [x] The system is ready for User Acceptance Testing (UAT).
