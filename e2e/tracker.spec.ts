import { test, expect } from './fixtures'

test.describe('Call Tracker', () => {
  test('renders the page and pipeline counters', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('tracker')

    await expect(page.getByRole('heading', { name: 'Call Tracker' })).toBeVisible()
    await expect(page.getByText('Log calls, set follow-ups, and track your pipeline.')).toBeVisible()

    await expect(page.getByText('Contacted').first()).toBeVisible()
    await expect(page.getByText('Qualified').first()).toBeVisible()
  })

  test('displays call logs', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('tracker')

    await expect(page.getByRole('cell', { name: 'Meridian Financial Group' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'James Thornton' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Crestview Healthcare Systems' })).toBeVisible()
  })

  test('filters logs by outcome', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('tracker')

    await page.getByRole('combobox').filter({ has: page.locator('option', { hasText: 'All Outcomes' }) }).selectOption('Qualified')
    await expect(page.getByRole('cell', { name: 'Crestview Healthcare Systems' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Meridian Financial Group' })).not.toBeVisible()
  })

  test('filters logs by company search', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('tracker')

    await page.getByPlaceholder('Search company…').fill('Meridian')
    await expect(page.getByRole('cell', { name: 'Meridian Financial Group' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Crestview Healthcare Systems' })).not.toBeVisible()
  })
})
