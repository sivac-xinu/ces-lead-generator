import { Page } from '@playwright/test'
import { test, expect } from './fixtures'

async function selectByLabel(page: Page, label: string, value: string) {
  await page.locator(`label:has-text("${label}") + select`).selectOption(value)
}

test.describe('Lead Discovery', () => {
  test('loads the lead list', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('leads')

    await expect(page.getByRole('heading', { name: 'Lead Discovery' })).toBeVisible()
    await expect(page.getByText(/15 leads found/)).toBeVisible()
    await expect(page.getByText('Meridian Financial Group')).toBeVisible()
    await expect(page.getByText('Crestview Healthcare Systems')).toBeVisible()
  })

  test('filters by industry', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('leads')

    await selectByLabel(page, 'Industry', 'Logistics')
    await expect(page.getByText('Pinnacle Logistics Co.')).toBeVisible()
    await expect(page.getByText('Meridian Financial Group')).not.toBeVisible()
    await expect(page.getByText(/1 lead found/)).toBeVisible()
  })

  test('filters by IT type', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('leads')

    await selectByLabel(page, 'IT Type', 'Cloud')
    await expect(page.getByText('Pinnacle Logistics Co.')).toBeVisible()
    await expect(page.getByText('Meridian Financial Group')).not.toBeVisible()
  })

  test('filters by search query', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('leads')

    await page.locator('label:has-text("Search") + input').fill('Thornton')
    await expect(page.getByText('Meridian Financial Group')).toBeVisible()
    await expect(page.getByText('Crestview Healthcare Systems')).not.toBeVisible()
    await expect(page.getByText(/1 lead found/)).toBeVisible()
  })

  test('clears filters', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('leads')

    await selectByLabel(page, 'Industry', 'Healthcare')
    await expect(page.getByText(/2 leads found/)).toBeVisible()

    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.getByText(/15 leads found/)).toBeVisible()
  })
})
