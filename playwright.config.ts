import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for CES Lead Generator.
 *
 * The local Vite dev server is started automatically. Supabase REST API calls
 * are intercepted in test fixtures and served from deterministic mock data so
 * tests run without network dependencies or real database mutations.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://localhost:5173/ces-lead-generator/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'VITE_E2E_AUTH_BYPASS=true npm run dev',
    url: 'http://localhost:5173/ces-lead-generator/',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
