import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminPage } from './AdminPage'
import * as authProvider from '@/features/auth/AuthProvider'
import * as supabaseModule from '@/lib/supabase'
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

function setupSupabase() {
  const profiles = [...mockProfiles]
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: profiles, error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
  const from = vi.fn().mockReturnValue(chain)
  vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
    from,
  } as unknown as typeof supabaseModule.supabase)
  return { from, chain, profiles }
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
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => new Promise(() => {})),
    }
    const from = vi.fn().mockReturnValue(chain)
    vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
      from,
    } as unknown as typeof supabaseModule.supabase)
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders pending and approved user sections', async () => {
    mockUseAuth(true)
    setupSupabase()
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
    const { chain } = setupSupabase()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => {
      expect(chain.update).toHaveBeenCalledWith({ approved: true })
    })
  })

  it('rejects a pending user after confirmation', async () => {
    window.confirm = vi.fn(() => true)
    mockUseAuth(true)
    const { chain } = setupSupabase()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    await waitFor(() => {
      expect(chain.delete).toHaveBeenCalled()
    })
  })

  it('changes a user role', async () => {
    mockUseAuth(true)
    const { chain } = setupSupabase()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })
    const selects = screen.getAllByLabelText(/Change role/)
    fireEvent.change(selects[0], { target: { value: 'admin' } })
    await waitFor(() => {
      expect(chain.update).toHaveBeenCalledWith({ role: 'admin' })
    })
  })

  it('deletes a user after confirmation', async () => {
    window.confirm = vi.fn(() => true)
    mockUseAuth(true)
    const { chain } = setupSupabase()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButtons[0])
    await waitFor(() => {
      expect(chain.delete).toHaveBeenCalled()
    })
  })
})
