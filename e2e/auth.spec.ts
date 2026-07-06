import { test, expect } from '@playwright/test'

test.describe('Auth page', () => {
  test('renders the sign-in form', async ({ page }) => {
    await page.goto('')

    await expect(page.getByRole('heading', { name: 'CES Lead Generator' })).toBeVisible()
    await expect(page.getByText('Sign in to access your leads')).toBeVisible()
    await expect(page.locator('label:has-text("Work Email") + input')).toBeVisible()
    await expect(page.locator('label:has-text("Password") + input')).toBeVisible()
    await expect(page.locator('form').getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign Up' }).first()).toBeVisible()
  })

  test('can switch to sign-up mode', async ({ page }) => {
    await page.goto('')

    await page.getByRole('button', { name: 'Sign Up' }).click()
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  })

  test('can switch to password reset mode', async ({ page }) => {
    await page.goto('')

    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to Sign In' })).toBeVisible()
  })
})
