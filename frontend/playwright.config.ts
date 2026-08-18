import { defineConfig, devices } from '@playwright/test'

// E2E runs a real headless Chromium against the running dev stack:
//   - frontend (Vite) on http://localhost:5173
//   - backend (Flask) on http://127.0.0.1:5001
// The app MUST be reached via `localhost` (not 127.0.0.1): the backend's CORS
// allow-list is exactly http://localhost:5173, so a 127.0.0.1 origin is refused.
// Both servers are expected to be already running (see FRONTEND_TEST_PLAN §1).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // shared backend DB — keep specs serialized for determinism
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'e2e-results.json' }]],
  timeout: 30_000,
  expect: { timeout: 7_500 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
