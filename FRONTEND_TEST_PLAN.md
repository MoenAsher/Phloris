# Phloris — Frontend Test Plan

> Reference document for the AI coding agent. This defines the tests to run against the Phloris React frontend to confirm it works correctly and integrates properly with the backend API. Work through every section in order. For each test, record the expected result, the actual result, and PASS/FAIL. Fix any failures before proceeding to full-system functional testing.

---

## How to Use This Document

1. Ensure the backend is running on port 5001 and the frontend dev server on 5173.
2. Ensure the backend database is seeded with the baseline data (admin user, templates, target group, targets).
3. Work through Sections 2–11 in order — later tests reuse data and state from earlier ones.
4. Use a real browser for manual verification and, where practical, automated component/integration tests (Section 12).
5. Record results in the summary (Section 13).

**Testing approach:** Frontend testing here is primarily behavioural and integration-focused — does the UI render correctly, does it call the right endpoints, does it handle the responses, and does it manage loading/empty/error states. Where the agent can add automated tests (e.g. React Testing Library for components, or Playwright/Cypress for E2E flows), it should, but manual browser verification of each flow is the minimum requirement.

**Severity levels:**
- **CRITICAL** — breaks a core user flow or an ethical/privacy guarantee. Fix before proceeding.
- **HIGH** — produces incorrect display or a broken interaction. Fix before proceeding.
- **MEDIUM** — robustness, styling, or edge-case polish. Fix if time permits.

---

## 1. Environment & Build Checks (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 1.1 | Frontend dev server starts without errors | Vite serves on 5173; no console build errors |
| 1.2 | No TypeScript compile errors | `tsc` / build passes clean |
| 1.3 | No unhandled console errors on initial load | Browser console is clean on first render |
| 1.4 | Backend reachable from frontend | An authenticated API call succeeds; no CORS error for origin http://localhost:5173 |
| 1.5 | Production build succeeds | `npm run build` produces a dist/ bundle without errors |

---

## 2. Authentication Flow (CRITICAL)

| # | Test | Expected Result |
|---|---|---|
| 2.1 | Visit a protected route while logged out (e.g. /campaigns) | Redirected to the Login page |
| 2.2 | Log in with correct seeded admin credentials | Redirected to Dashboard; session established |
| 2.3 | Log in with incorrect credentials | Clear error message shown; stays on Login; no redirect |
| 2.4 | JWT is stored in memory, not localStorage/sessionStorage | Inspect browser storage — token must NOT be present in localStorage or sessionStorage |
| 2.5 | After login, the JWT is attached to API requests | Network tab shows Authorization: Bearer header on API calls |
| 2.6 | Log out (if implemented) | Token cleared from memory; redirected to Login; protected routes no longer accessible |
| 2.7 | Refresh the page after login | Confirm defined behaviour — if in-memory only, being logged out on refresh is expected and acceptable; the app must handle it gracefully (redirect to Login, no crash) |

**CRITICAL security check:** 2.4 confirms the token is never written to browser storage, matching the security architecture.

---

## 3. Navigation & Layout (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 3.1 | Sidebar shows links to Dashboard, Campaigns, Templates, Targets | All links present |
| 3.2 | Each sidebar link routes to the correct page | Navigation works; URL updates |
| 3.3 | Active route is visually indicated in the sidebar | Current page highlighted |
| 3.4 | Direct URL entry to a valid route while authenticated | Page loads correctly |
| 3.5 | Direct URL entry to an unknown route | A 404/not-found state is shown, not a blank page or crash |
| 3.6 | Layout renders correctly at common desktop widths | No overlapping or broken layout |

---

## 4. Templates Page (HIGH) — UR-02

| # | Test | Expected Result |
|---|---|---|
| 4.1 | Templates list loads and displays seeded templates | All templates shown in a table |
| 4.2 | Difficulty level shows as a coloured badge | easy/medium/hard visually distinct |
| 4.3 | Create a template via the dialog | New template appears in the list; persisted to backend |
| 4.4 | Difficulty selector only allows easy/medium/hard | No invalid values selectable |
| 4.5 | HTML preview renders the body_html | Preview reflects the entered HTML |
| 4.6 | Placeholders {{first_name}}, {{last_name}}, {{tracking_link}}, {{report_link}} are preserved on save | Reopening the template shows placeholders intact |
| 4.7 | Edit an existing template | Changes saved and reflected |
| 4.8 | Delete a template with confirmation | Confirmation shown; template removed after confirm |
| 4.9 | Cancel a delete | Template NOT removed |
| 4.10 | Submit the create form with a missing required field | Validation message; not submitted |
| 4.11 | Loading state while templates fetch | Loading indicator shown, not a blank screen |
| 4.12 | Empty state when no templates exist | Friendly empty message, not a blank table |
| 4.13 | Error state when the API call fails | Error message shown; no crash |

---

## 5. Targets Page (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 5.1 | Target groups list loads | Seeded group(s) shown |
| 5.2 | Selecting a group shows its targets | Correct targets listed for that group only |
| 5.3 | Create a new group | Group created and appears in the list |
| 5.4 | Add a single target to a group | Target added; appears immediately |
| 5.5 | Add a target with a malformed email | Validation error; not added |
| 5.6 | Bulk import targets via CSV | Correct number imported; count reported to the user |
| 5.7 | CSV with a malformed row | Valid rows imported; malformed row reported; no crash |
| 5.8 | Delete a single target | Removed; other targets unaffected |
| 5.9 | Delete a group with confirmation | Group removed after confirm |
| 5.10 | Loading / empty / error states | All handled gracefully |

---

## 6. Campaigns — List & Creation (HIGH)

| # | Test | Expected Result |
|---|---|---|
| 6.1 | Campaigns list loads with status badges | Each campaign shows correct status |
| 6.2 | Create a campaign selecting a template and target group | Campaign created with status draft |
| 6.3 | Create form requires both a template and a target group | Cannot submit without both |
| 6.4 | Newly created campaign appears in the list | Immediately visible |
| 6.5 | Loading / empty / error states | All handled gracefully |

---

## 7. Campaign Detail & Launch (CRITICAL) — UR-03

| # | Test | Expected Result |
|---|---|---|
| 7.1 | Open a draft campaign's detail page | Shows template, target group, status |
| 7.2 | Launch button visible for a draft campaign | Present and enabled |
| 7.3 | Launch triggers a confirmation dialog | Warns that emails will be sent |
| 7.4 | Confirm launch | Status changes to running; launched_at set; success feedback shown |
| 7.5 | Emails arrive in Mailtrap after launch | One email per target in the group |
| 7.6 | Per-target results table displays | Each target shows outcome (sent/clicked/reported/no-action) |
| 7.7 | Launch button disabled for running/completed campaigns | Cannot re-launch |
| 7.8 | Results update after a recipient interacts | After clicking a tracked link, the target's outcome updates on refresh |

---

## 8. Dashboard & Charts (HIGH) — UR-01, UR-04..UR-07

| # | Test | Expected Result |
|---|---|---|
| 8.1 | Overview cards load | Total campaigns, total targets, overall click rate, overall report rate all correct |
| 8.2 | Rates display as percentages | e.g. 60%, not 0.6 |
| 8.3 | Campaign selector lists campaigns | Selectable |
| 8.4 | Selecting a campaign loads its metrics | All four metrics fetched and displayed |
| 8.5 | Click rate vs report rate bar chart renders | Correct values, correct labels |
| 8.6 | Target outcomes pie chart renders | clicked/reported/no-action segments correct |
| 8.7 | Events-over-time line chart renders | Time-ordered click/report events |
| 8.8 | Time-to-click and time-to-report stat cards | Human-readable (seconds/minutes), correct values |
| 8.9 | Dashboard for a campaign with no activity | Charts show empty/zero states, not errors or NaN |
| 8.10 | Loading / error states | Handled gracefully |

**Cross-check:** Compare the dashboard's displayed metrics against the backend's /api/dashboard responses to confirm the frontend renders them accurately (no rounding errors that change meaning, correct percentage conversion).

---

## 9. Recipient Feedback Page (CRITICAL) — UR-09

| # | Test | Expected Result |
|---|---|---|
| 9.1 | Click a real tracking link from a Mailtrap email | Lands on the /feedback/:token page |
| 9.2 | Page explains this was a simulated phishing email | Clear, non-punitive message |
| 9.3 | Template-specific feedback_notes are shown | Tips from the campaign's template display |
| 9.4 | General phishing-identification advice shown | Present |
| 9.5 | Link to the recipient's performance page works | Navigates to /performance/:token |
| 9.6 | Page is accessible without login | No auth required; loads for the recipient |
| 9.7 | Tone is calm and reassuring, not alarming | Consistent with ethical design |

---

## 10. Recipient Performance Page (CRITICAL) — UR-10, UR-08

| # | Test | Expected Result |
|---|---|---|
| 10.1 | Open /performance/:token with a valid token | Shows that recipient's history |
| 10.2 | Displays per-campaign outcome and timing | clicked/reported/ignored + time-to-click/time-to-report where applicable |
| 10.3 | Open with a different recipient's token | Shows ONLY that recipient's data — never another's |
| 10.4 | Page accessible without login | No auth required |
| 10.5 | Invalid token | Graceful not-found state; no crash; no data leak |

**CRITICAL privacy check:** 10.3 confirms the page cannot display another recipient's results.

---

## 11. Cross-Cutting UI Behaviour (MEDIUM)

| # | Test | Expected Result |
|---|---|---|
| 11.1 | All forms show validation feedback | Invalid input flagged clearly |
| 11.2 | All destructive actions require confirmation | Delete/launch confirmations present |
| 11.3 | API errors surface a user-visible message | No silent failures |
| 11.4 | No sensitive data (JWT, password hashes) appears in the DOM or console | Confirmed clean |
| 11.5 | Buttons show disabled/pending state during async actions | No double-submits |
| 11.6 | Currency/number/percentage/time formatting is consistent | Uniform across pages |

---

## 12. Automated Frontend Tests (Deliverable, if feasible)

- [ ] Component tests for the key forms (template create, campaign create) with React Testing Library, asserting validation and submit behaviour.
- [ ] At least one automated E2E flow (Playwright or Cypress) covering: login → create campaign → launch → view dashboard metrics.
- [ ] Mock the API layer for component tests; use the real backend for the E2E flow.
- [ ] Ensure tests run with a single command and report pass/fail.

---

## 13. Results Summary (completed 2026-07-15)

**Run environment:** backend Flask on :5001, frontend Vite on :5173, both live. Verification is by a real headless Chromium (Playwright E2E, 54 tests) driving the running stack, plus React Testing Library component tests (Vitest, 10 tests) with a mocked API, plus `npm run build`/CORS checks. Every plan item below was exercised; all CRITICAL and HIGH items pass.

| Section | Tests | Passed | Failed | Notes |
|---|---|---|---|---|
| 1. Environment/Build | 5 | 5 | 0 | Build clean (tsc + vite); CORS OK for `http://localhost:5173`; console clean on load. |
| 2. Authentication | 7 | 7 | 0 | **JWT confirmed in-memory only** (2.4); refresh logs out gracefully (2.7). |
| 3. Navigation/Layout | 6 | 6 | 0 | 3.5 required a code fix — added a real not-found page (see below). |
| 4. Templates | 13 | 13 | 0 | CRUD, badges, HTML preview, placeholder round-trip, loading/empty/error all verified. |
| 5. Targets | 10 | 10 | 0 | Group scoping, single add, CSV import + malformed-row reporting, deletes. |
| 6. Campaigns List/Create | 5 | 5 | 0 | Draft creation requires a template + group (also a component test). |
| 7. Campaign Detail/Launch | 8 | 8 | 0 | Launch → running, per-target outcomes, re-launch blocked, click updates results. See Mailtrap note. |
| 8. Dashboard/Charts | 10 | 10 | 0 | 4 metrics + bar/pie/line charts; **displayed values cross-checked against the API**; no NaN on empty. |
| 9. Feedback Page | 7 | 7 | 0 | Public, template-specific tips, reassuring tone, links to performance. |
| 10. Performance Page | 5 | 5 | 0 | **Privacy check (10.3) passes** — a token exposes only its own recipient; invalid token is graceful. |
| 11. Cross-cutting UI | 6 | 6 | 0 | No JWT/hash in DOM or console; confirmations; pending states; consistent % formatting. |
| **Total** | **82** | **82** | **0** | 0 CRITICAL/HIGH outstanding. |

### Bugs found and fixed (real code defects)

**3.5 — no not-found state (HIGH).** `App.tsx` routed every unknown path via `<Navigate to="/">`, so a mistyped/unknown URL silently landed on the Dashboard (or Login) with no not-found feedback — the expected "404/not-found state" did not exist. **Fix:** added `src/pages/NotFound.tsx` (a standalone, calm "Page not found" state with a link to the dashboard) and pointed the catch-all route `path="*"` at it. Works for authenticated and unauthenticated visitors and reveals nothing. Verified by test 3.5.

### Test-environment change (not an app change)

**7.5 / launch pipeline — Mailtrap free-tier rate limit.** Launching a multi-target campaign against the real Mailtrap sandbox intermittently fails one or more sends with `550 5.7.0 Too many emails per second`, even with the built-in 1s inter-send delay. This is a third-party quota, not a frontend or backend defect — the app correctly records only accepted sends and surfaces failures in the launch banner. To make the automated launch/tracking/metrics/feedback/performance pipeline deterministic, a standard Flask-Mail knob `MAIL_SUPPRESS_SEND` was wired to env in `backend/app/config.py` (default **off** — real delivery unchanged) and the backend was run with `MAIL_SUPPRESS_SEND=True MAIL_SEND_DELAY=0` for the automated pass. **Real sandbox delivery (UR-03/7.5) was independently confirmed** with a live single-target launch: `sent_count=1, failed=[]` (Mailtrap accepted the message). To reproduce the E2E suite deterministically, start the backend with `MAIL_SUPPRESS_SEND=True MAIL_SEND_DELAY=0`.

### Test-mechanism corrections (test premise/selector wrong — app was correct)

These were fixed in the *tests*, not the app, because the app behaviour was right:
- **Component test (4.6):** placeholder body is set via `fireEvent.change`, because `@testing-library/user-event`'s `.type()` treats `{{` as the escape for a literal `{` and would mangle `{{first_name}}`. The verbatim-preservation assertion is unchanged and still strict.
- **11.2 (delete confirmation):** while a Radix modal is open the background is `aria-hidden`, so the underlying row is (correctly) absent from the accessibility tree. The test now asserts the row survives **after cancelling** the dialog — proving no delete happens without confirmation.
- **Selector disambiguations (strict mode):** dialog heading vs. same-text submit button; `exact:true` for the rendered HTML preview vs. the raw textarea; shadcn `CardTitle` renders a `<div>` (not a heading), so panel titles are matched by text; the bar chart's axis `<tspan>` shares text with a stat-card label; the line chart's stroked `<path>` has no fill area so it is asserted **attached** rather than "visible". None of these reflect app defects.

### Minor observations (no action required)

- shadcn `CardTitle`/`CardDescription` render as `<div>`s rather than heading elements — a small accessibility nuance; page-level titles are proper `<h2>`s and no test requires card titles to be headings.
- Production bundle is a single ~800 kB chunk (Vite advises code-splitting) — a build-optimisation note, not a failure.

## 12. Automated Frontend Tests — delivered

- **Component tests (React Testing Library + Vitest):** `frontend/tests/components/` — `TemplateFormDialog` (validation, difficulty options, placeholder-verbatim submit, edit round-trip, HTML preview, API-error surfacing) and `CreateCampaignDialog` (prerequisite gating, required name, numeric ids). API layer mocked. Run: `npm test`.
- **E2E (Playwright, real backend):** `frontend/e2e/` — 54 tests spanning §1–§11, including the full flow **login → create campaign → launch → dashboard metrics** and the recipient **feedback → performance** journey. Run: `npm run test:e2e` (with the backend + frontend up; suppress SMTP as noted above).
- **Single-command, pass/fail reported:** `npm test` (components) and `npm run test:e2e` (E2E). Results: **10/10 component, 54/54 E2E.**

For each FAILED test: describe the failure, root cause, and fix. Re-run after fixes and confirm all CRITICAL and HIGH tests pass before full-system functional testing.

---

## Definition of "Frontend Ready"

- [x] All CRITICAL and HIGH tests pass. (82/82 plan items; 54/54 E2E; 10/10 component.)
- [x] JWT confirmed in-memory only (never in browser storage). (Test 2.4 + 11.4.)
- [x] The full flow login → create campaign → launch → Mailtrap → click → feedback → performance works in a browser. (E2E §6–§10; real Mailtrap delivery confirmed for a single send — see §7.5 note on the free-tier rate limit.)
- [x] Dashboard metrics visually match backend API values. (Cross-check test in §8 compares rendered % to `/api/dashboard/...`.)
- [x] Recipient performance page cannot show another recipient's data. (Test 10.3.)
- [x] Loading, empty, and error states are handled on every page. (Templates 4.11–4.13, Targets 5.10, Campaigns 6.5, Dashboard 8.9–8.10, Performance 10.5.)
