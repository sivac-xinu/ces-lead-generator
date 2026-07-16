import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminPage } from './AdminPage'
import * as authProvider from '@/features/auth/AuthProvider'
import { initAuth } from '@/lib/auth'
import type { UserProfile } from '@/types'

const mockProfiles: UserProfile[] = [
  {
    id: 'p1',
    email: 'pending@example.com',
    role: 'user',
    approved: false,
    created_at: '2025-01-01',
  },
  { id: 'p2', email: 'user@example.com', role: 'user', approved: true, created_at: '2025-01-02' },
  { id: 'p3', email: 'admin@example.com', role: 'admin', approved: true, created_at: '2025-01-03' },
]

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
  vi.clearAllMocks()
  queryClient.clear()
})

function mockUseAuth(isAdmin: boolean) {
  vi.spyOn(authProvider, 'useAuth').mockReturnValue({
    user: isAdmin
      ? { id: 'admin-1', email: 'admin@example.com', role: 'admin', approved: true }
      : null,
    session: true,
    loading: false,
    isAdmin,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  })
}

function setupAuthAdapter() {
  const profiles = [...mockProfiles]
  const authAdapter = {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    getProfile: vi.fn().mockResolvedValue(null),
    signIn: vi.fn().mockResolvedValue({}),
    signUp: vi.fn().mockResolvedValue({}),
    signOut: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue({}),
    onAuthStateChange: vi.fn().mockReturnValue(() => {}),
    listProfiles: vi.fn().mockResolvedValue(profiles),
    updateProfile: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue({}),
  }
  initAuth(authAdapter)
  return { authAdapter, profiles }
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPage />
    </QueryClientProvider>
  )
}

describe('AdminPage', () => {
  it('shows loading state', () => {
    mockUseAuth(true)
    initAuth({
      getCurrentUser: vi.fn().mockResolvedValue(null),
      getProfile: vi.fn().mockResolvedValue(null),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue(() => {}),
      listProfiles: vi.fn().mockImplementation(() => new Promise(() => {})),
      updateProfile: vi.fn(),
      deleteUser: vi.fn(),
    })
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders pending and approved user sections', async () => {
    mockUseAuth(true)
    setupAuthAdapter()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    })
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Pending Approval')).toBeInTheDocument()
    expect(screen.getByText('All Users')).toBeInTheDocument()
  })

  it('approves a pending user', async () => {
    mockUseAuth(true)
    const { authAdapter } = setupAuthAdapter()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => {
      expect(authAdapter.updateProfile).toHaveBeenCalledWith('p1', { approved: true })
    })
  })

  it('rejects a pending user after confirmation', async () => {
    window.confirm = vi.fn(() => true)
    mockUseAuth(true)
    const { authAdapter } = setupAuthAdapter()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    await waitFor(() => {
      expect(authAdapter.deleteUser).toHaveBeenCalledWith('p1')
    })
  })

  it('changes a user role', async () => {
    mockUseAuth(true)
    const { authAdapter } = setupAuthAdapter()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })
    const select = screen.getByLabelText('Change role for pending@example.com')
    fireEvent.change(select, { target: { value: 'admin' } })
    await waitFor(() => {
      expect(authAdapter.updateProfile).toHaveBeenCalledWith('p1', { role: 'admin' })
    })
  })

  it('deletes a user after confirmation', async () => {
    window.confirm = vi.fn(() => true)
    mockUseAuth(true)
    const { authAdapter } = setupAuthAdapter()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButtons[1])
    await waitFor(() => {
      expect(authAdapter.deleteUser).toHaveBeenCalledWith('p2')
    })
  })
})
