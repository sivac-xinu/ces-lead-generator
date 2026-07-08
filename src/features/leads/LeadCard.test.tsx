import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { LeadCard } from './LeadCard'
import { LEADS } from '@/data/leads'
import { renderWithProviders } from '@/test/test-utils'

vi.mock('@/hooks/useProfiles', () => ({
  useProfiles: () => ({ data: [], isLoading: false }),
}))

const lead = LEADS[0]
const handlers = {
  onIntelligence: vi.fn(),
  onScript: vi.fn(),
  onTracker: vi.fn(),
  onDelete: vi.fn(),
}

describe('LeadCard', () => {
  beforeEach(() => {
    Object.values(handlers).forEach(h => h.mockClear())
  })

  it('renders company and contact details', () => {
    renderWithProviders(<LeadCard lead={lead} {...handlers} />)
    expect(screen.getByText(lead.company)).toBeInTheDocument()
    expect(screen.getByText(lead.contact_name)).toBeInTheDocument()
    expect(screen.getByText(lead.it_type)).toBeInTheDocument()
    expect(screen.getByText(lead.industry)).toBeInTheDocument()
  })

  it('calls the intelligence callback with the lead', () => {
    renderWithProviders(<LeadCard lead={lead} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: /Intelligence/i }))
    expect(handlers.onIntelligence).toHaveBeenCalledWith(lead)
  })

  it('calls the script callback with the lead id', () => {
    renderWithProviders(<LeadCard lead={lead} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: /Script/i }))
    expect(handlers.onScript).toHaveBeenCalledWith(lead.id)
  })

  it('calls the tracker callback with the lead id', () => {
    renderWithProviders(<LeadCard lead={lead} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: /Log Call/i }))
    expect(handlers.onTracker).toHaveBeenCalledWith(lead.id)
  })

  it('calls the delete callback with the lead id', () => {
    renderWithProviders(<LeadCard lead={lead} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }))
    expect(handlers.onDelete).toHaveBeenCalledWith(lead.id)
  })

  it('shows LinkedIn import indicator when imported', () => {
    renderWithProviders(<LeadCard lead={{ ...lead, imported: true }} {...handlers} />)
    expect(screen.getByText(/LinkedIn Import/i)).toBeInTheDocument()
  })
})
