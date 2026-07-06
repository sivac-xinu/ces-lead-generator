import { test, expect } from './fixtures'

const MERIDIAN_OPTION = 'Meridian Financial Group — James Thornton'

test.describe('Script Generator', () => {
  test('renders the page and selects a lead', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('script')

    await expect(page.getByRole('heading', { name: 'Script Generator' })).toBeVisible()
    await expect(page.getByText('Select a lead and tone to generate a tailored cold call script.')).toBeVisible()

    await page.locator('label:has-text("Select Lead") + select').selectOption({ label: MERIDIAN_OPTION })

    await expect(page.getByRole('button', { name: 'Download Script' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy to Clipboard' })).toBeVisible()
    await expect(page.getByText('Pain Points → CES Solutions')).toBeVisible()
  })

  test('switches call tones', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('script')
    await page.locator('label:has-text("Select Lead") + select').selectOption({ label: MERIDIAN_OPTION })

    await page.getByRole('button', { name: 'Executive' }).click()
    await expect(page.locator('button.bg-ces-orange-light').getByText('Executive')).toBeVisible()

    await page.getByRole('button', { name: 'Technical' }).click()
    await expect(page.locator('button.bg-ces-orange-light').getByText('Technical')).toBeVisible()
  })

  test('toggles common objections', async ({ authenticatedPage, page }) => {
    await authenticatedPage.goto('script')
    await page.locator('label:has-text("Select Lead") + select').selectOption({ label: MERIDIAN_OPTION })

    await page.getByRole('button', { name: 'Show Common Objections' }).click()
    await expect(page.getByText('happy with our current vendor')).toBeVisible()

    await page.getByRole('button', { name: 'Hide Common Objections' }).click()
    await expect(page.getByText('happy with our current vendor')).not.toBeVisible()
  })
})
