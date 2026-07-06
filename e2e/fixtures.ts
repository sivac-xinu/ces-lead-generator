import { test as base, expect } from '@playwright/test'
import { mockSupabaseApi } from './mock-api'

export type TestFixtures = {
  /** Page pre-configured with mock auth and data for authenticated routes. */
  authenticatedPage: AuthenticatedPage
}

export type AuthenticatedPage = {
  goto: (path?: string) => Promise<void>
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, provide) => {
    await mockSupabaseApi(page)

    // Enable the in-app E2E auth bypass and seed a mock session so the app
    // boots straight into an approved admin user without calling Supabase.
    await page.addInitScript(() => {
      localStorage.setItem('ces:e2e:bypass', 'true')
    })

    await provide({
      goto: async (path = '') => {
        await page.goto(path)
        await expect(page.getByText('CES', { exact: true })).toBeVisible()
      },
    })
  },
})

export { expect }
