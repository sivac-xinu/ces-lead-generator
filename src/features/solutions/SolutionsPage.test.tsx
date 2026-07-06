import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SolutionsPage } from './SolutionsPage'
import * as authProvider from '@/features/auth/AuthProvider'
import * as useSolutionsModule from '@/hooks/useSolutions'
import { getControlByLabel } from '@/test/test-utils'
import type { Solution } from '@/types'

const mockSolutions: Solution[] = [
  {
    id: '1',
    service: 'FinOps for AI',
    urgency: 'critical',
    icon: '💰',
    keywords: ['cost', 'cloud'],
    trend: 'AI infra costs rising',
    buySignal: 'CFO mandates cost control',
    pitch: 'We reduce cloud spend.',
    stat: '31% savings',
  },
  {
    id: '2',
    service: 'Email Security',
    urgency: 'high',
    icon: '📧',
    keywords: ['phishing', 'email'],
    trend: 'BEC attacks rising',
    buySignal: 'Insurance requires DMARC',
    pitch: 'We stop phishing.',
    stat: '99% blocked',
  },
  {
    id: '3',
    service: 'GreenOps',
    urgency: 'medium',
    icon: '🌱',
    keywords: ['sustainability'],
    trend: 'ESG reporting required',
    buySignal: 'Board wants carbon metrics',
    pitch: 'We reduce energy.',
    stat: '27% less energy',
  },
]

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
  } as unknown as ReturnType<typeof authProvider.useAuth>)
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SolutionsPage />
    </QueryClientProvider>
  )
}

describe('SolutionsPage', () => {
  let createMutate: ReturnType<typeof vi.fn>
  let updateMutate: ReturnType<typeof vi.fn>
  let deleteMutate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createMutate = vi.fn().mockResolvedValue(undefined)
    updateMutate = vi.fn().mockResolvedValue(undefined)
    deleteMutate = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(useSolutionsModule, 'useSolutions').mockReturnValue({
      data: mockSolutions,
      isLoading: false,
    } as unknown as ReturnType<typeof useSolutionsModule.useSolutions>)
    vi.spyOn(useSolutionsModule, 'useCreateSolution').mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useSolutionsModule.useCreateSolution>)
    vi.spyOn(useSolutionsModule, 'useUpdateSolution').mockReturnValue({
      mutateAsync: updateMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useSolutionsModule.useUpdateSolution>)
    vi.spyOn(useSolutionsModule, 'useDeleteSolution').mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useSolutionsModule.useDeleteSolution>)
  })

  it('renders loading state', () => {
    mockUseAuth(false)
    vi.spyOn(useSolutionsModule, 'useSolutions').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useSolutionsModule.useSolutions>)
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays solution cards with details', () => {
    mockUseAuth(false)
    renderPage()
    expect(screen.getByText('FinOps for AI')).toBeInTheDocument()
    expect(screen.getByText('Email Security')).toBeInTheDocument()
    expect(screen.getByText('We reduce cloud spend.')).toBeInTheDocument()
    expect(screen.getByText('31% savings')).toBeInTheDocument()
  })

  it('filters by keyword', () => {
    mockUseAuth(false)
    renderPage()
    const input = screen.getByPlaceholderText('Service, keyword, or trend…')
    fireEvent.change(input, { target: { value: 'phishing' } })
    expect(screen.getByText('Email Security')).toBeInTheDocument()
    expect(screen.queryByText('FinOps for AI')).not.toBeInTheDocument()
  })

  it('filters by urgency', () => {
    mockUseAuth(false)
    renderPage()
    const select = getControlByLabel('Urgency')
    fireEvent.change(select, { target: { value: 'critical' } })
    expect(screen.getByText('FinOps for AI')).toBeInTheDocument()
    expect(screen.queryByText('Email Security')).not.toBeInTheDocument()
    expect(screen.queryByText('GreenOps')).not.toBeInTheDocument()
  })

  it('shows admin controls for admin user', () => {
    mockUseAuth(true)
    renderPage()
    expect(screen.getByRole('button', { name: 'Add Solution' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBe(3)
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBe(3)
  })

  it('hides admin controls for non-admin user', () => {
    mockUseAuth(false)
    renderPage()
    expect(screen.queryByRole('button', { name: 'Add Solution' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('opens create modal when Add Solution clicked', () => {
    mockUseAuth(true)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Add Solution' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add Solution' })).toBeInTheDocument()
  })

  it('calls create mutation on submit', async () => {
    mockUseAuth(true)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Add Solution' }))
    fireEvent.change(getControlByLabel('Service Name'), { target: { value: 'New Service' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Solution' }))
    await waitFor(() => {
      expect(createMutate).toHaveBeenCalled()
    })
  })

  it('calls delete mutation when Delete confirmed', async () => {
    window.confirm = vi.fn(() => true)
    mockUseAuth(true)
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith('1')
    })
  })
})
