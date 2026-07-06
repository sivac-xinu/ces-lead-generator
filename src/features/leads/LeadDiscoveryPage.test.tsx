import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { LeadDiscoveryPage } from './LeadDiscoveryPage'
import * as useLeadsModule from '@/hooks/useLeads'
import * as uiStore from '@/store/uiStore'
import { LEADS } from '@/data/leads'
import { renderWithProviders, getControlByLabel } from '@/test/test-utils'

vi.mock('@/features/csv/CsvImportModal', () => ({
  CsvImportModal: () => null,
}))

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const deleteMutate = vi.fn().mockResolvedValue(undefined)
const updateMutate = vi.fn().mockResolvedValue(undefined)
const showToast = vi.fn()
const setScriptLeadId = vi.fn()
const setTrackerLeadId = vi.fn()

function mockHooks({ leads = LEADS, isLoading = false } = {}) {
  vi.spyOn(useLeadsModule, 'useLeads').mockReturnValue({
    data: leads,
    isLoading,
  } as unknown as ReturnType<typeof useLeadsModule.useLeads>)
  vi.spyOn(useLeadsModule, 'useDeleteLead').mockReturnValue({
    mutateAsync: deleteMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useLeadsModule.useDeleteLead>)
  vi.spyOn(useLeadsModule, 'useUpdateLead').mockReturnValue({
    mutateAsync: updateMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useLeadsModule.useUpdateLead>)
}

describe('LeadDiscoveryPage', () => {
  beforeEach(() => {
    vi.spyOn(uiStore, 'useUIStore').mockReturnValue({
      showToast,
      setScriptLeadId,
      setTrackerLeadId,
      scriptLeadId: null,
      trackerLeadId: null,
    } as unknown as ReturnType<typeof uiStore.useUIStore>)

    deleteMutate.mockClear()
    updateMutate.mockClear()
    showToast.mockClear()
    setScriptLeadId.mockClear()
    setTrackerLeadId.mockClear()
    mockNavigate.mockClear()
    mockHooks()
  })

  it('renders the header and lead count', () => {
    renderWithProviders(<LeadDiscoveryPage />)
    expect(screen.getByRole('heading', { name: /Lead Discovery/i })).toBeInTheDocument()
    expect(screen.getByText(`${LEADS.length} leads found`)).toBeInTheDocument()
  })

  it('shows a loading spinner while leads are loading', () => {
    mockHooks({ isLoading: true })
    const { container } = renderWithProviders(<LeadDiscoveryPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('filters leads by industry', () => {
    renderWithProviders(<LeadDiscoveryPage />)
    fireEvent.change(getControlByLabel('Industry'), { target: { value: 'Finance' } })
    expect(screen.getByText('Meridian Financial Group')).toBeInTheDocument()
    expect(screen.queryByText('Crestview Healthcare Systems')).not.toBeInTheDocument()
  })

  it('filters leads by search', () => {
    renderWithProviders(<LeadDiscoveryPage />)
    fireEvent.change(screen.getByPlaceholderText(/Company or contact/i), { target: { value: 'Crestview' } })
    expect(screen.getByText('Crestview Healthcare Systems')).toBeInTheDocument()
    expect(screen.queryByText('Meridian Financial Group')).not.toBeInTheDocument()
  })

  it('clears filters when Clear is clicked', () => {
    renderWithProviders(<LeadDiscoveryPage />)
    fireEvent.change(getControlByLabel('Industry'), { target: { value: 'Finance' } })
    fireEvent.change(screen.getByPlaceholderText(/Company or contact/i), { target: { value: 'Meridian' } })
    fireEvent.click(screen.getByRole('button', { name: /Clear/i }))
    expect(screen.getByText(`${LEADS.length} leads found`)).toBeInTheDocument()
  })

  it('opens the intelligence modal', async () => {
    renderWithProviders(<LeadDiscoveryPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /Intelligence/i })[0])
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Lead Intelligence/i })).toBeInTheDocument()
    })
  })

  it('navigates to the script page for a lead', () => {
    renderWithProviders(<LeadDiscoveryPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /Script/i })[0])
    expect(setScriptLeadId).toHaveBeenCalledWith(LEADS[0].id)
    expect(mockNavigate).toHaveBeenCalledWith('/script')
  })

  it('navigates to the tracker page for a lead', () => {
    renderWithProviders(<LeadDiscoveryPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /Log Call/i })[0])
    expect(setTrackerLeadId).toHaveBeenCalledWith(LEADS[0].id)
    expect(mockNavigate).toHaveBeenCalledWith('/tracker')
  })

  it('deletes a lead after confirmation', async () => {
    window.confirm = vi.fn(() => true)
    renderWithProviders(<LeadDiscoveryPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /Remove/i })[0])
    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith(LEADS[0].id)
      expect(showToast).toHaveBeenCalledWith('Lead removed')
    })
  })
})
