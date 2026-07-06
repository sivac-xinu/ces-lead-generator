import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { Layout } from './Layout'
import * as authProvider from '@/features/auth/AuthProvider'
import * as uiStore from '@/store/uiStore'
import { renderWithProviders } from '@/test/test-utils'

const mockSignOut = vi.fn()

function mockAuth({ isAdmin = false }: { isAdmin?: boolean } = {}) {
  vi.spyOn(authProvider, 'useAuth').mockReturnValue({
    user: {
      id: 'u1',
      email: 'user@example.com',
      role: isAdmin ? 'admin' : 'user',
      approved: true,
    },
    session: true,
    loading: false,
    isAdmin,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: mockSignOut,
    resetPassword: vi.fn(),
  } as unknown as ReturnType<typeof authProvider.useAuth>)
}

vi.spyOn(uiStore, 'useUIStore').mockReturnValue({
  toast: null,
  clearToast: vi.fn(),
} as unknown as ReturnType<typeof uiStore.useUIStore>)

describe('Layout', () => {
  beforeEach(() => {
    mockSignOut.mockClear()
  })

  it('renders navigation, children and user email', () => {
    mockAuth({ isAdmin: false })
    renderWithProviders(
      <Layout>
        <div data-testid="page-content">Hello</div>
      </Layout>,
      { route: '/leads' }
    )

    expect(screen.getByTestId('page-content')).toHaveTextContent('Hello')
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Lead Discovery/i })).toBeInTheDocument()
  })

  it('shows admin link only for admins', () => {
    mockAuth({ isAdmin: false })
    const { unmount } = renderWithProviders(<Layout><div /></Layout>, { route: '/leads' })
    expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument()

    unmount()
    mockAuth({ isAdmin: true })
    renderWithProviders(<Layout><div /></Layout>, { route: '/leads' })
    expect(screen.getByRole('link', { name: /Admin/i })).toBeInTheDocument()
  })

  it('calls signOut when the sign out button is clicked', () => {
    mockAuth({ isAdmin: false })
    renderWithProviders(<Layout><div /></Layout>, { route: '/leads' })

    fireEvent.click(screen.getByRole('button', { name: /Sign Out/i }))
    expect(mockSignOut).toHaveBeenCalled()
  })
})
