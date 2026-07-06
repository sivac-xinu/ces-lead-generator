import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { IntelligenceModal } from './IntelligenceModal'
import * as useLeadsModule from '@/hooks/useLeads'
import * as uiStore from '@/store/uiStore'
import { LEADS } from '@/data/leads'
import { renderWithProviders } from '@/test/test-utils'

const updateMutate = vi.fn().mockResolvedValue(undefined)
const showToast = vi.fn()
const onClose = vi.fn()

vi.spyOn(useLeadsModule, 'useUpdateLead').mockReturnValue({
  mutateAsync: updateMutate,
  isPending: false,
} as unknown as ReturnType<typeof useLeadsModule.useUpdateLead>)

vi.spyOn(uiStore, 'useUIStore').mockReturnValue({
  showToast,
  toast: null,
  clearToast: vi.fn(),
} as unknown as ReturnType<typeof uiStore.useUIStore>)

describe('IntelligenceModal', () => {
  beforeEach(() => {
    updateMutate.mockClear()
    showToast.mockClear()
    onClose.mockClear()
  })

  it('renders lead details when open', () => {
    renderWithProviders(<IntelligenceModal lead={LEADS[0]} open onClose={onClose} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(new RegExp(LEADS[0].company))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(LEADS[0].contact_name))).toBeInTheDocument()
  })

  it('does not render when lead is null', () => {
    const { container } = renderWithProviders(<IntelligenceModal lead={null} open onClose={onClose} />)
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('runs local intelligence and displays results', async () => {
    renderWithProviders(<IntelligenceModal lead={LEADS[0]} open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Run Intelligence/i }))

    await waitFor(() => expect(screen.getByText(/ICP Suggestions/i)).toBeInTheDocument())
    expect(screen.getByText(/Inferred Pain Points/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Apply All to Lead/i })).toBeInTheDocument()
  })

  it('applies all intelligence to the lead', async () => {
    renderWithProviders(<IntelligenceModal lead={LEADS[0]} open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Run Intelligence/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Apply All to Lead/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Apply All to Lead/i }))

    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('applies pain points only', async () => {
    renderWithProviders(<IntelligenceModal lead={LEADS[0]} open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Run Intelligence/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Apply Pain Points Only/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Apply Pain Points Only/i }))

    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith('Pain points updated')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('closes when the close button is clicked', () => {
    renderWithProviders(<IntelligenceModal lead={LEADS[0]} open onClose={onClose} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Close/i })[0])
    expect(onClose).toHaveBeenCalled()
  })
})
