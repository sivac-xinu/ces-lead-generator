import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthPage } from './AuthPage'
import * as authProvider from './AuthProvider'
import { getControlByLabel, getSubmitButton } from '@/test/test-utils'

const signIn = vi.fn()
const signUp = vi.fn()
const resetPassword = vi.fn()

vi.spyOn(authProvider, 'useAuth').mockReturnValue({
  user: null,
  session: false,
  loading: false,
  isAdmin: false,
  signIn,
  signUp,
  signOut: vi.fn(),
  resetPassword,
} as unknown as ReturnType<typeof authProvider.useAuth>)

describe('AuthPage', () => {
  beforeEach(() => {
    signIn.mockReset()
    signUp.mockReset()
    resetPassword.mockReset()
  })

  it('renders the sign in form by default', () => {
    render(<AuthPage />)
    expect(screen.getByRole('heading', { name: /CES Lead Generator/i })).toBeInTheDocument()
    expect(getControlByLabel('Work Email')).toBeInTheDocument()
    expect(getControlByLabel('Password')).toBeInTheDocument()
  })

  it('submits sign in credentials', async () => {
    signIn.mockResolvedValue({ error: undefined })
    render(<AuthPage />)

    fireEvent.change(getControlByLabel('Work Email'), { target: { value: 'user@example.com' } })
    fireEvent.change(getControlByLabel('Password'), { target: { value: 'password123' } })
    fireEvent.click(getSubmitButton(/^Sign In$/i))

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('user@example.com', 'password123'))
  })

  it('switches to sign up and creates an account', async () => {
    signUp.mockResolvedValue({ error: undefined })
    render(<AuthPage />)

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }))
    fireEvent.change(getControlByLabel('First Name'), { target: { value: 'New' } })
    fireEvent.change(getControlByLabel('Last Name'), { target: { value: 'User' } })
    fireEvent.change(getControlByLabel('Work Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(getControlByLabel('Password'), { target: { value: 'password123' } })
    fireEvent.click(getSubmitButton(/Create Account/i))

    await waitFor(() => expect(signUp).toHaveBeenCalledWith('new@example.com', 'password123', 'New', 'User'))
  })

  it('submits password reset and shows a confirmation message', async () => {
    resetPassword.mockResolvedValue({ error: undefined })
    render(<AuthPage />)

    fireEvent.click(screen.getByRole('button', { name: /Forgot password/i }))
    fireEvent.change(getControlByLabel('Work Email'), { target: { value: 'reset@example.com' } })
    fireEvent.click(getSubmitButton(/Send Reset Link/i))

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith('reset@example.com')
      expect(screen.getByText(/Password reset link sent/i)).toBeInTheDocument()
    })
  })

  it('displays an error message when sign in fails', async () => {
    signIn.mockResolvedValue({ error: new Error('Invalid credentials') })
    render(<AuthPage />)

    fireEvent.change(getControlByLabel('Work Email'), { target: { value: 'user@example.com' } })
    fireEvent.change(getControlByLabel('Password'), { target: { value: 'wrong' } })
    fireEvent.click(getSubmitButton(/^Sign In$/i))

    await waitFor(() => expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument())
  })
})
