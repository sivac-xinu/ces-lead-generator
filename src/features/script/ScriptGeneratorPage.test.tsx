import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { ScriptGeneratorPage } from './ScriptGeneratorPage'
import * as useLeadsModule from '@/hooks/useLeads'
import * as useSolutionsModule from '@/hooks/useSolutions'
import * as uiStore from '@/store/uiStore'
import { LEADS } from '@/data/leads'
import { SEED_SOLUTIONS } from '@/data/solutions'
import { renderWithProviders, getControlByLabel } from '@/test/test-utils'

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const showToast = vi.fn()
const setScriptLeadId = vi.fn()

function mockHooks({ leads = LEADS, scriptLeadId = null as number | null } = {}) {
  vi.spyOn(useLeadsModule, 'useLeads').mockReturnValue({
    data: leads,
    isLoading: false,
  } as unknown as ReturnType<typeof useLeadsModule.useLeads>)
  vi.spyOn(useSolutionsModule, 'useSolutions').mockReturnValue({
    data: SEED_SOLUTIONS,
    isLoading: false,
  } as unknown as ReturnType<typeof useSolutionsModule.useSolutions>)
  vi.spyOn(uiStore, 'useUIStore').mockReturnValue({
    showToast,
    setScriptLeadId,
    scriptLeadId,
    trackerLeadId: null,
  } as unknown as ReturnType<typeof uiStore.useUIStore>)
}

describe('ScriptGeneratorPage', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    mockNavigate.mockClear()
    showToast.mockClear()
    setScriptLeadId.mockClear()
    mockHooks()
  })

  it('renders header and lead selector', () => {
    renderWithProviders(<ScriptGeneratorPage />)
    expect(screen.getByRole('heading', { name: /Script Generator/i })).toBeInTheDocument()
    expect(getControlByLabel('Select Lead')).toBeInTheDocument()
  })

  it('shows empty state when no leads exist', () => {
    mockHooks({ leads: [] })
    renderWithProviders(<ScriptGeneratorPage />)
    expect(screen.getByText(/No leads available/i)).toBeInTheDocument()
  })

  it('preselects a lead passed from the UI store', () => {
    mockHooks({ scriptLeadId: 2 })
    renderWithProviders(<ScriptGeneratorPage />)
    expect(setScriptLeadId).toHaveBeenCalledWith(null)
    expect((getControlByLabel('Select Lead') as HTMLSelectElement).value).toBe('2')
    expect(screen.getByText(/Opening \/ Hook/i)).toBeInTheDocument()
  })

  it('generates script sections for a selected lead', async () => {
    renderWithProviders(<ScriptGeneratorPage />)
    fireEvent.change(getControlByLabel('Select Lead'), { target: { value: LEADS[0].id.toString() } })

    await waitFor(() => {
      expect(screen.getByText(/Opening \/ Hook/i)).toBeInTheDocument()
      expect(screen.getByText(/Value Proposition/i)).toBeInTheDocument()
    })
  })

  it('switches the active tone', async () => {
    renderWithProviders(<ScriptGeneratorPage />)
    fireEvent.change(getControlByLabel('Select Lead'), { target: { value: LEADS[0].id.toString() } })
    await waitFor(() => screen.getByText(/Opening \/ Hook/i))

    fireEvent.click(screen.getByRole('button', { name: /Challenger/i }))
    expect(screen.getByRole('button', { name: /Challenger/i })).toHaveClass('border-ces-orange')
  })

  it('copies the script to the clipboard', async () => {
    renderWithProviders(<ScriptGeneratorPage />)
    fireEvent.change(getControlByLabel('Select Lead'), { target: { value: LEADS[0].id.toString() } })
    await waitFor(() => screen.getByRole('button', { name: /Copy to Clipboard/i }))

    fireEvent.click(screen.getByRole('button', { name: /Copy to Clipboard/i }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith('Script copied to clipboard')
    })
  })

  it('toggles common objections', async () => {
    renderWithProviders(<ScriptGeneratorPage />)
    fireEvent.change(getControlByLabel('Select Lead'), { target: { value: LEADS[0].id.toString() } })
    await waitFor(() => screen.getByRole('button', { name: /Show Common Objections/i }))

    fireEvent.click(screen.getByRole('button', { name: /Show Common Objections/i }))
    expect(screen.getByText(/happy with our current vendor/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Hide Common Objections/i }))
    expect(screen.queryByText(/happy with our current vendor/i)).not.toBeInTheDocument()
  })

  it('navigates to the call tracker', async () => {
    renderWithProviders(<ScriptGeneratorPage />)
    fireEvent.change(getControlByLabel('Select Lead'), { target: { value: LEADS[0].id.toString() } })
    await waitFor(() => screen.getByRole('button', { name: /Log a Call/i }))

    fireEvent.click(screen.getByRole('button', { name: /Log a Call/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/tracker')
  })
})
