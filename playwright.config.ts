import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3000);
const API_PORT = Number(process.env.E2E_API_PORT ?? 4000);
// Use the preinstalled Chromium when present (CI images / sandboxes); otherwise Playwright's own.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
/** Shared with the review journey in e2e/journey.spec.ts. */
export const E2E_REVIEWER_KEY = 'e2e-reviewer-access-key-not-a-secret';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    geolocation: { latitude: 28.4952, longitude: 77.0888 },
    permissions: ['geolocation'],
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: executablePath ? { executablePath } : {} } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: executablePath ? { executablePath } : {} } },
  ],
  webServer: [
    {
      command: 'npx tsx apps/api/src/index.ts',
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        PERSISTENCE: 'memory',
        PROVIDER_MODE: 'mock',
        DEMO_MODE: 'true',
        LOG_LEVEL: 'warn',
        RATE_LIMIT_MAX: '5000',
        // Switches on the clinician review console so the journey covering it has
        // something to sign in to. A throwaway value: the store is in-memory and the
        // server is gone when the run ends.
        REVIEWER_ACCESS_KEY: E2E_REVIEWER_KEY,
      },
    },
    /*
     * The production build, not `next dev`.
     *
     * Two reasons, one practical and one principled. The practical one: React's
     * StrictMode double-invokes effects in development, and the hand-off that carries
     * a tapped Guide example into a conversation is a one-shot effect whose second
     * invocation aborts the turn the first one started. That is a development-only
     * artifact — the same flow is correct against a build — but it left the suite with
     * a permanent red, and a suite that is always slightly red is one nobody reads.
     *
     * The principled one: these tests exist to say the deployed app works. The dev
     * server is a different program — different bundling, different error handling,
     * no minification, lazily compiled routes whose first hit can exceed a timeout.
     * Testing it answers a question nobody asked.
     */
    {
      command: 'npm run build -w @sanjeevani/web && npm run start -w @sanjeevani/web',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: true,
      // A cold build is the first thing this does, so the window has to cover it.
      timeout: 300_000,
      env: { PORT: String(WEB_PORT), API_INTERNAL_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
