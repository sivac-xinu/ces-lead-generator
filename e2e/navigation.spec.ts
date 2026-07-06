import { test, expect } from './fixtures'

test.describe('Navigation', () => {
  test('navigates between all main pages', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('leads')
    await expect(page.getByRole('heading', { name: 'Lead Discovery' })).toBeVisible()

    await page.getByRole('link', { name: 'API Sources' }).click()
    await expect(page.getByRole('heading', { name: 'API Sources' })).toBeVisible()

    await page.getByRole('link', { name: 'Script Generator' }).click()
    await expect(page.getByRole('heading', { name: 'Script Generator' })).toBeVisible()

    await page.getByRole('link', { name: 'Call Tracker' }).click()
    await expect(page.getByRole('heading', { name: 'Call Tracker' })).toBeVisible()

    await page.getByRole('link', { name: 'Solutions' }).click()
    await expect(page.getByRole('heading', { name: 'Solutions Catalog' })).toBeVisible()

    // Admin link is visible because the E2E bypass user has the admin role.
    await page.getByRole('link', { name: 'Admin' }).click()
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
  })

  test('highlights the active route in the sidebar', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('script')

    const scriptLink = page.getByRole('link', { name: 'Script Generator' })
    await expect(scriptLink).toHaveClass(/bg-ces-orange/)

    const leadsLink = page.getByRole('link', { name: 'Lead Discovery' })
    await expect(leadsLink).not.toHaveClass(/bg-ces-orange/)
  })
})
