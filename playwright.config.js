import { defineConfig, devices } from '@playwright/test';

// In CI, `npx playwright install chromium` provides the browser and this stays
// unset. In sandboxes that ship a pinned Chromium, point at it explicitly via
// PLAYWRIGHT_CHROMIUM_EXECUTABLE so no download is attempted.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

// E2E runs against a real production build served by `vite preview`, with the
// Supabase URL/key pointed at a stub origin that never leaves the browser —
// every request to it is intercepted in the spec. No live backend required.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } }
    }
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'https://stub.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'stub-anon-key'
    }
  }
});
