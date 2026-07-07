import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiSourcesPage } from './ApiSourcesPage'
import { searchZoomInfoCompanies } from '@/lib/zoominfo'
import { useCreateLead } from '@/hooks/useLeads'
import { useUIStore } from '@/store/uiStore'

vi.mock('@/lib/zoominfo', () => ({
  searchZoomInfoCompanies: vi.fn(),
}))

vi.mock('@/hooks/useLeads', () => ({
  useCreateLead: vi.fn(),
}))

vi.mock('@/store/uiStore', () => ({
  useUIStore: vi.fn(),
}))

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com', role: 'admin', approved: true },
    isAdmin: true,
    signOut: vi.fn(),
  })),
}))

describe('ApiSourcesPage', () => {
  const mockMutateAsync = vi.fn()
  const mockShowToast = vi.fn()
  let mockedFetch: ReturnType<typeof vi.fn>

  const mockedUseCreateLead = vi.mocked(useCreateLead)
  const mockedUseUIStore = vi.mocked(useUIStore)
  const mockedSearchZoomInfoCompanies = vi.mocked(searchZoomInfoCompanies)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseCreateLead.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLead>)
    mockedUseUIStore.mockReturnValue({
      showToast: mockShowToast,
    })
    mockedSearchZoomInfoCompanies.mockResolvedValue([])
    mockedFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )
    globalThis.fetch = mockedFetch as typeof fetch
  })

  it('renders the ZoomInfo tab by default with the credentials banner', () => {
    render(<ApiSourcesPage />)
    expect(screen.getByRole('heading', { name: /API Sources/i })).toBeInTheDocument()
    expect(screen.getByText(/ZoomInfo credentials required/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ZoomInfo/i })).toBeEnabled()
    expect(screen.getByLabelText(/ZoomInfo Username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ZoomInfo Password/i)).toBeInTheDocument()
  })

  it('switches to the Clearbit tab', async () => {
    render(<ApiSourcesPage />)
    await userEvent.click(screen.getByRole('button', { name: /Clearbit/i }))
    expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument()
  })

  it('disables the ZoomInfo test connection until credentials are entered', async () => {
    render(<ApiSourcesPage />)
    const testButton = screen.getByRole('button', { name: /Test Connection/i })
    expect(testButton).toBeDisabled()

    const usernameInput = screen.getByLabelText(/ZoomInfo Username/i)
    const passwordInput = screen.getByLabelText(/ZoomInfo Password/i)

    await userEvent.type(usernameInput, 'user@example.com')
    await userEvent.type(passwordInput, 'secret')

    await waitFor(() => {
      expect(testButton).not.toBeDisabled()
    })
  })

  it('fetches and displays ZoomInfo sample results', async () => {
    const sampleResults = [
      {
        company: 'Sample Corp',
        industry: 'Technology',
        employees: 250,
        website: 'sample.com',
        location: 'Austin, TX',
      },
    ]
    mockedSearchZoomInfoCompanies.mockResolvedValue(sampleResults)

    render(<ApiSourcesPage />)
    await userEvent.type(screen.getByLabelText(/ZoomInfo Username/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/ZoomInfo Password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /Test Connection/i }))

    await waitFor(() => {
      expect(screen.getByText('Sample Corp')).toBeInTheDocument()
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('250')).toBeInTheDocument()
      expect(screen.getByText('Austin, TX')).toBeInTheDocument()
    })

    expect(mockedSearchZoomInfoCompanies).toHaveBeenCalledWith({
      companyName: 'Example Corp',
      industry: 'Software',
      employeeCountMin: 50,
      employeeCountMax: 5000,
    })
  })

  it('imports a ZoomInfo result as a lead', async () => {
    const sampleResults = [
      {
        company: 'Sample Corp',
        industry: 'Technology',
        employees: 250,
        website: 'sample.com',
        location: 'Austin, TX',
      },
    ]
    mockMutateAsync.mockResolvedValue({ id: 1, company: 'Sample Corp' })
    mockedSearchZoomInfoCompanies.mockResolvedValue(sampleResults)

    render(<ApiSourcesPage />)
    await userEvent.type(screen.getByLabelText(/ZoomInfo Username/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/ZoomInfo Password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /Test Connection/i }))

    await waitFor(() => {
      expect(screen.getByText('Sample Corp')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Import/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          company: 'Sample Corp',
          industry: 'Technology',
          imported_by: 'ZoomInfo',
          company_source: 'ZoomInfo Search',
        })
      )
      expect(mockShowToast).toHaveBeenCalledWith('Imported Sample Corp from ZoomInfo')
    })
  })

  it('shows an error when ZoomInfo connection test fails', async () => {
    mockedSearchZoomInfoCompanies.mockRejectedValue(new Error('Invalid credentials'))

    render(<ApiSourcesPage />)
    await userEvent.type(screen.getByLabelText(/ZoomInfo Username/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/ZoomInfo Password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /Test Connection/i }))

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('searches Clearbit and displays results', async () => {
    const suggestions = [
      {
        name: 'Clearbit Inc',
        domain: 'clearbit.com',
        logo: 'https://logo.clearbit.com/clearbit.com',
      },
    ]
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(suggestions),
    })

    render(<ApiSourcesPage />)
    await userEvent.click(screen.getByRole('button', { name: /Clearbit/i }))
    await userEvent.type(screen.getByLabelText(/Company Name/i), 'clearbit')
    await userEvent.click(screen.getByRole('button', { name: /Search/i }))

    await waitFor(() => {
      expect(screen.getByText('Clearbit Inc')).toBeInTheDocument()
      expect(screen.getByText('clearbit.com')).toBeInTheDocument()
    })

    expect(mockedFetch).toHaveBeenCalledWith(
      'https://autocomplete.clearbit.com/v1/companies/suggest?query=clearbit'
    )
  })

  it('imports a Clearbit result as a lead', async () => {
    const suggestions = [
      {
        name: 'Clearbit Inc',
        domain: 'clearbit.com',
        logo: 'https://logo.clearbit.com/clearbit.com',
      },
    ]
    mockMutateAsync.mockResolvedValue({ id: 2, company: 'Clearbit Inc' })
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(suggestions),
    })

    render(<ApiSourcesPage />)
    await userEvent.click(screen.getByRole('button', { name: /Clearbit/i }))
    await userEvent.type(screen.getByLabelText(/Company Name/i), 'clearbit')
    await userEvent.click(screen.getByRole('button', { name: /Search/i }))

    await waitFor(() => {
      expect(screen.getByText('Clearbit Inc')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Import/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          company: 'Clearbit Inc',
          website: 'clearbit.com',
          imported_by: 'Clearbit',
          company_source: 'clearbit.com',
        })
      )
      expect(mockShowToast).toHaveBeenCalledWith('Imported Clearbit Inc from Clearbit')
    })
  })
})
