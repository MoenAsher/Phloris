# Phloris — Backend Test Plan

> Reference document for the AI coding agent. This defines the tests to run against the Phloris backend before frontend development begins. The goal is to catch functional errors, logical bugs, and ethical-safeguard violations while the backend is still isolated and easy to debug. Work through every section. For each test, record the expected result, the actual result, and PASS/FAIL. Fix any failures before proceeding.

---

## How to Use This Document

1. Set up the test environment (Section 1) before running anything.
2. Work through Sections 2–12 in order — later tests depend on data created in earlier ones.
3. For automated coverage, implement the tests in Section 13 using pytest.
4. Produce a final results summary (Section 14).
5. Do not begin frontend work until all critical tests pass.

**Testing tools:** Use pytest with Flask's test client for automated tests. For manual verification of the email pipeline, use the Mailtrap web inbox. For manual endpoint checks, curl or an HTTP client is acceptable, but the automated pytest suite in Section 13 is the primary deliverable.

**Severity levels:**
- **CRITICAL** — a failure here breaks core functionality or violates an ethical safeguard. Must be fixed before frontend work.
- **HIGH** — a failure here produces incorrect data or a broken workflow. Fix before frontend work.
- **MEDIUM** — a failure here is a robustness or edge-case issue. Fix if time permits before frontend, otherwise log for later.

---

## 1. Test Environment Setup

- [ ] Create a separate, disposable SQLite database for testing (e.g. `instance/test.db`) so tests never touch development data.
- [ ] Ensure the test database is reset (dropped and recreated) before each test run or test module.
- [ ] Confirm `.env` test values are loaded, including Mailtrap credentials.
- [ ] Provide a pytest fixture that creates the Flask app in testing mode, initialises the schema, and yields a test client.
- [ ] Provide a fixture that seeds a known baseline: one admin user, two templates (one easy, one hard), one target group with three targets.
- [ ] Confirm the server starts on port 5001 without errors.

**Expected:** Test environment is isolated, repeatable, and does not pollute development data.

---

## 2. Authentication Tests (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 2.1 | POST /api/auth/register with valid email + password | 201 Created; user persisted; password stored as a hash, never plaintext |
| 2.2 | POST /api/auth/register with a duplicate email | 4xx error; no duplicate user created |
| 2.3 | POST /api/auth/register with missing email or password | 400 Bad Request; no user created |
| 2.4 | POST /api/auth/login with correct credentials | 200 OK; returns a valid JWT access token |
| 2.5 | POST /api/auth/login with wrong password | 401 Unauthorized; no token returned |
| 2.6 | POST /api/auth/login with non-existent email | 401 Unauthorized; no token returned |
| 2.7 | GET /api/auth/me with a valid JWT | 200 OK; returns the current user's info; never returns the password hash |
| 2.8 | GET /api/auth/me with no token | 401 Unauthorized |
| 2.9 | GET /api/auth/me with a malformed/expired token | 401 Unauthorized |

**Verify explicitly:** The password hash is never included in any API response. Inspect the JSON body of 2.7 to confirm.

---

## 3. Authorization / Protected Route Tests (CRITICAL)

Confirm every JWT-protected endpoint rejects unauthenticated requests.

| # | Test | Expected Result |
|---|---|---|
| 3.1 | Call each /api/templates route without a token | 401 Unauthorized |
| 3.2 | Call each /api/target-groups and /api/targets route without a token | 401 Unauthorized |
| 3.3 | Call each /api/campaigns route without a token | 401 Unauthorized |
| 3.4 | Call each /api/dashboard route without a token | 401 Unauthorized |
| 3.5 | Confirm public routes (/track/click/:token, /report, /api/performance/:token) work WITHOUT a token | 200/redirect as appropriate — these are intentionally public |

**Verify explicitly:** Tracking and performance routes must remain public (recipients have no login). All admin routes must be protected.

---

## 4. Template CRUD Tests (HIGH) — UR-02

| # | Test | Expected Result |
|---|---|---|
| 4.1 | POST /api/templates with valid fields incl. difficulty_level | 201 Created; template persisted with correct difficulty |
| 4.2 | POST /api/templates with an invalid difficulty_level (not easy/medium/hard) | 4xx error; not persisted |
| 4.3 | POST /api/templates missing a required field (name/subject/body_html) | 400 Bad Request |
| 4.4 | GET /api/templates | 200 OK; returns all templates as a list |
| 4.5 | GET /api/templates/:id for an existing template | 200 OK; returns the correct template |
| 4.6 | GET /api/templates/:id for a non-existent id | 404 Not Found |
| 4.7 | PUT /api/templates/:id with valid changes | 200 OK; changes persisted |
| 4.8 | DELETE /api/templates/:id | 200/204; template removed |
| 4.9 | Confirm body_html retains the placeholders {{first_name}}, {{tracking_link}}, {{report_link}} without corruption | Placeholders stored verbatim |

---

## 5. Target Group & Target Tests (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 5.1 | POST /api/target-groups with a valid name | 201 Created |
| 5.2 | GET /api/target-groups | 200 OK; list returned |
| 5.3 | POST /api/target-groups/:id/targets with a single valid target | 201 Created; target linked to the group |
| 5.4 | POST a target with a malformed email | 4xx error; not persisted |
| 5.5 | GET /api/target-groups/:id/targets | 200 OK; returns only targets in that group |
| 5.6 | POST /api/target-groups/:id/targets/import with a valid CSV (email, first_name, last_name) | All rows imported; count matches CSV |
| 5.7 | CSV import with one malformed row among valid rows | Valid rows imported; malformed row rejected or reported; no crash |
| 5.8 | DELETE /api/targets/:id | Target removed; other targets in the group unaffected |
| 5.9 | DELETE a target group | Group removed; confirm defined behaviour for its targets (cascade or block) is intentional and consistent |

---

## 6. Campaign Lifecycle Tests (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 6.1 | POST /api/campaigns referencing a valid template + target group | 201 Created; status = draft |
| 6.2 | POST /api/campaigns referencing a non-existent template or group | 4xx error; not created |
| 6.3 | GET /api/campaigns | 200 OK; list with status for each |
| 6.4 | GET /api/campaigns/:id | 200 OK; full detail |
| 6.5 | PUT /api/campaigns/:id on a draft | 200 OK; changes persisted |
| 6.6 | POST /api/campaigns/:id/launch on a valid draft | 200 OK; status → running; launched_at set |
| 6.7 | Launch a campaign whose target group has zero targets | Handled gracefully — defined behaviour, no crash |
| 6.8 | Attempt to launch an already-running or completed campaign | Rejected or idempotent — defined behaviour, no duplicate sends |
| 6.9 | DELETE /api/campaigns/:id | Campaign removed; confirm associated events/tokens handling is intentional |

---

## 7. Email Sending Pipeline Tests (CRITICAL) — UR-03

These require the Mailtrap sandbox. Verify in the Mailtrap web inbox.

| # | Test | Expected Result |
|---|---|---|
| 7.1 | Launch a campaign with 3 targets | Exactly 3 emails appear in the Mailtrap inbox |
| 7.2 | Inspect a delivered email's personalisation | {{first_name}} / {{last_name}} replaced with the correct target's values |
| 7.3 | Inspect the tracking link in a delivered email | Points to {TRACKING_BASE_URL}/track/click/{token} using port 5001; token is present |
| 7.4 | Inspect the report link in a delivered email | Points to the correct report URL with the token |
| 7.5 | Confirm a "sent" Event is created for each target on launch | 3 sent events, each with a UTC timestamp |
| 7.6 | Confirm a unique TrackingToken row exists per target | 3 tokens, all distinct, each mapping to the correct campaign+target |
| 7.7 | Inspect the token string | Opaque and URL-safe; contains NO email, name, or other personal data |

**CRITICAL ethical check:** Confirm no email is delivered to any real external address — all messages are captured by Mailtrap only.

---

## 8. Click & Report Tracking Tests (CRITICAL) — UR-04..UR-07, UR-09

| # | Test | Expected Result |
|---|---|---|
| 8.1 | GET /track/click/:token with a valid token | "clicked" Event created with a UTC timestamp; response redirects to the feedback page |
| 8.2 | GET /track/click/:token with an invalid/unknown token | Handled gracefully — 404 or safe redirect; no crash; no event created |
| 8.3 | Click the same token twice | Two clicked events may be stored, BUT rate calculations must later count the target only once (verify in Section 9) |
| 8.4 | POST /report with a valid token | "reported" Event created with a UTC timestamp; confirmation message returned |
| 8.5 | POST /report with an invalid token | Handled gracefully; no crash; no event created |
| 8.6 | Report a token WITHOUT having clicked it first | Valid — reported event stored independently of any click |
| 8.7 | Report a token AFTER clicking it | Both a clicked and a reported event exist for that target |
| 8.8 | A target that neither clicks nor reports | No clicked/reported events; the target is later classified as "no-action" (verify in Section 9) |

**CRITICAL ethical check (UR-08):** Inspect the stored click and report events. Confirm ONLY event type and timestamp are stored. No IP address, no user-agent, no browser fingerprint, no geolocation anywhere in the record.

---

## 9. Metrics Calculation Tests (CRITICAL) — UR-04..UR-07

Construct a controlled scenario with known values, then assert the metrics service returns exactly the expected numbers. Suggested fixture:

- Campaign with **5 targets**, all sent.
- Target A: clicked once.
- Target B: clicked twice (double-click — must count once).
- Target C: clicked once, then reported.
- Target D: reported without clicking.
- Target E: no action.

| # | Test | Expected Result |
|---|---|---|
| 9.1 | Click rate | Distinct clickers = A, B, C = 3 of 5 = **0.60 (60%)** |
| 9.2 | Reporting rate | Distinct reporters = C, D = 2 of 5 = **0.40 (40%)** |
| 9.3 | Double-click does not inflate click rate | B counted once; rate stays 60%, not higher |
| 9.4 | Average time-to-click | Mean of (click − sent) across A, B, C only; excludes D and E |
| 9.5 | Average time-to-report | Mean of (report − sent) across C, D only; excludes A, B, E |
| 9.6 | Per-target outcome classification | A=clicked, B=clicked, C=clicked+reported, D=reported, E=no-action |
| 9.7 | Campaign with zero sent events | No division-by-zero; returns 0 or a defined safe value |
| 9.8 | Campaign with sends but zero clicks/reports | Click rate 0%, report rate 0%; time metrics return a defined safe value (e.g. null), not an error |

**This section is the most important logical test in the whole plan.** The distinct-target counting in 9.1–9.3 and the division-by-zero handling in 9.7–9.8 are the two most likely places for silent logical bugs.

---

## 10. Dashboard Endpoint Tests (HIGH) — UR-01

| # | Test | Expected Result |
|---|---|---|
| 10.1 | GET /api/dashboard/overview | Correct totals: campaign count, target count, overall click rate, overall report rate |
| 10.2 | GET /api/dashboard/campaigns/:id/metrics | Returns all four metrics for the campaign, matching Section 9 values |
| 10.3 | GET /api/dashboard/campaigns/:id/timeline | Returns a time-ordered series of click/report events suitable for charting |
| 10.4 | GET /api/dashboard/campaigns/:id/targets | Returns each target with correct outcome (sent/clicked/reported/no-action) |
| 10.5 | Dashboard endpoints for a non-existent campaign id | 404 Not Found; no crash |
| 10.6 | Overall rates match the aggregate of per-campaign data | Cross-check overview totals against the sum of individual campaigns |

---

## 11. Recipient Performance Tests (CRITICAL) — UR-10, UR-08

| # | Test | Expected Result |
|---|---|---|
| 11.1 | GET /api/performance/:token with a valid token | Returns only that recipient's history across campaigns they received |
| 11.2 | Response content | Shows per-campaign: received, clicked?/reported?/ignored, and time-to-click / time-to-report where applicable |
| 11.3 | GET /api/performance/:token with a token belonging to a different recipient | Returns ONLY that other recipient's own data — never leaks a third recipient's data |
| 11.4 | Confirm the endpoint cannot enumerate all recipients | No parameter or response field exposes other recipients' identities or results |
| 11.5 | GET /api/performance/:token with an invalid token | 404 Not Found; no crash; no data leak |

**CRITICAL privacy check:** 11.3 and 11.4 confirm the token-scoping is airtight. A recipient must never be able to see another recipient's results by changing the token or through any response field.

---

## 12. Ethical Safeguard Audit (CRITICAL) — UR-08

A dedicated pass to confirm the framework's core ethical commitments hold in code.

| # | Test | Expected Result |
|---|---|---|
| 12.1 | Search the codebase for any credential-capture endpoint or landing-page form that stores submitted passwords | None exists |
| 12.2 | Inspect every stored Event | Contains only event type, timestamp, and the campaign/target linkage — nothing else |
| 12.3 | Confirm no request handler logs or persists IP addresses | No IP capture anywhere |
| 12.4 | Confirm no request handler logs or persists user-agent or device/browser fingerprint data | None captured |
| 12.5 | Confirm tracking tokens contain no encoded personal data | Tokens are random/opaque; decoding reveals nothing about the recipient |
| 12.6 | Confirm all outbound email is routed only through the Mailtrap sandbox | No path sends to a real external SMTP recipient in the current config |

---

## 13. Automated Test Suite (Deliverable)

Implement the above as an automated pytest suite so it can be re-run after any change.

- [ ] Organise tests into modules mirroring Sections 2–12 (e.g. `test_auth.py`, `test_templates.py`, `test_campaigns.py`, `test_email.py`, `test_tracking.py`, `test_metrics.py`, `test_dashboard.py`, `test_performance.py`, `test_ethics.py`).
- [ ] Use fixtures for app setup, database reset, an authenticated client (with JWT), and the seeded baseline data.
- [ ] For the email tests, either use the real Mailtrap sandbox or mock the Flask-Mail send call and assert it was invoked with correctly rendered content — but at least one manual end-to-end run against the real Mailtrap inbox must be performed and recorded.
- [ ] The metrics tests (Section 9) must use the exact controlled 5-target scenario and assert precise expected values.
- [ ] Ensure the suite runs with a single command (e.g. `pytest`) and reports pass/fail counts.
- [ ] Target meaningful coverage of routes, services, and models — prioritise the metrics service and the tracking/performance endpoints.

---

## 14. Results Summary (to be completed after the run)

Produce a summary table:

| Section | Tests | Passed | Failed | Notes |
|---|---|---|---|---|
| 2. Authentication | | | | |
| 3. Authorization | | | | |
| 4. Templates | | | | |
| 5. Targets | | | | |
| 6. Campaigns | | | | |
| 7. Email Pipeline | | | | |
| 8. Click/Report Tracking | | | | |
| 9. Metrics | | | | |
| 10. Dashboard | | | | |
| 11. Performance | | | | |
| 12. Ethical Audit | | | | |

For every FAILED test: describe the failure, the root cause, and the fix applied. Re-run the suite after fixes and confirm all CRITICAL and HIGH tests pass before starting frontend development.

---

## Definition of "Ready for Frontend"

- [ ] All CRITICAL tests pass.
- [ ] All HIGH tests pass.
- [ ] The metrics service returns exact expected values for the controlled 5-target scenario.
- [ ] The ethical audit (Section 12) confirms no credential capture and no collection of IP, user-agent, or fingerprint data.
- [ ] The recipient performance endpoint cannot leak another recipient's data.
- [ ] At least one full end-to-end run (launch → Mailtrap → click → feedback → report → metrics) has been performed and recorded.
- [ ] The automated pytest suite runs clean with a single command.
