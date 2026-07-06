import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeadCard } from './LeadCard'
import { LEADS } from '@/data/leads'

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
    render(<LeadCard lead={lead} {...handlers} />)
    expect(screen.getByText(lead.company)).toBeInTheDocument()
    expect(screen.getByText(lead.contact_name)).toBeInTheDocument()
    expect(screen.getByText(lead.it_type)).toBeInTheDocument()
    expect(screen.getByText(lead.industry)).toBeInTheDocument()
  })

  it('calls the intelligence callback with the lead', () => {
    render(<LeadCard lead={lead} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: /Intelligence/i }))
    expect(handlers.onIntelligence).toHaveBeenCalledWith(lead)
  })

  it('calls the script callback with the lead id', () => {
    render(<LeadCard lead={lead} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: /Script/i }))
    expect(handlers.onScript).toHaveBeenCalledWith(lead.id)
  })

  it('calls the tracker callback with the lead id', () => {
    render(<LeadCard lead={lead} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: /Log Call/i }))
    expect(handlers.onTracker).toHaveBeenCalledWith(lead.id)
  })

  it('calls the delete callback with the lead id', () => {
    render(<LeadCard lead={lead} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }))
    expect(handlers.onDelete).toHaveBeenCalledWith(lead.id)
  })

  it('shows LinkedIn import indicator when imported', () => {
    render(<LeadCard lead={{ ...lead, imported: true }} {...handlers} />)
    expect(screen.getByText(/LinkedIn Import/i)).toBeInTheDocument()
  })
})
