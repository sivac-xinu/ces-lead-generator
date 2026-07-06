import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { CallTrackerPage } from './CallTrackerPage'
import * as useLeadsModule from '@/hooks/useLeads'
import * as useCallLogsModule from '@/hooks/useCallLogs'
import * as uiStore from '@/store/uiStore'
import { LEADS } from '@/data/leads'
import type { CallLog } from '@/types'
import { renderWithProviders, getControlByLabel } from '@/test/test-utils'

const createMutate = vi.fn().mockResolvedValue(undefined)
const deleteMutate = vi.fn().mockResolvedValue(undefined)
const showToast = vi.fn()
const setTrackerLeadId = vi.fn()

function mockHooks({
  leads = LEADS,
  logs = [] as CallLog[],
  trackerLeadId = null as number | null,
} = {}) {
  vi.spyOn(useLeadsModule, 'useLeads').mockReturnValue({
    data: leads,
    isLoading: false,
  } as unknown as ReturnType<typeof useLeadsModule.useLeads>)
  vi.spyOn(useCallLogsModule, 'useCallLogs').mockReturnValue({
    data: logs,
    isLoading: false,
  } as unknown as ReturnType<typeof useCallLogsModule.useCallLogs>)
  vi.spyOn(useCallLogsModule, 'useCreateCallLog').mockReturnValue({
    mutateAsync: createMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useCallLogsModule.useCreateCallLog>)
  vi.spyOn(useCallLogsModule, 'useDeleteCallLog').mockReturnValue({
    mutateAsync: deleteMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useCallLogsModule.useDeleteCallLog>)
  vi.spyOn(uiStore, 'useUIStore').mockReturnValue({
    showToast,
    setTrackerLeadId,
    trackerLeadId,
    scriptLeadId: null,
  } as unknown as ReturnType<typeof uiStore.useUIStore>)
}

describe('CallTrackerPage', () => {
  beforeEach(() => {
    createMutate.mockClear()
    deleteMutate.mockClear()
    showToast.mockClear()
    setTrackerLeadId.mockClear()
    mockHooks()
  })

  it('renders the header, pipeline and log form', () => {
    renderWithProviders(<CallTrackerPage />)
    expect(screen.getByRole('heading', { name: /Call Tracker/i })).toBeInTheDocument()
    expect(screen.getByText(/Log a Call/i)).toBeInTheDocument()
    expect(getControlByLabel('Lead')).toBeInTheDocument()
    expect(getControlByLabel('Outcome')).toBeInTheDocument()
  })

  it('preselects a lead passed from the UI store', () => {
    mockHooks({ trackerLeadId: 3 })
    renderWithProviders(<CallTrackerPage />)
    expect(setTrackerLeadId).toHaveBeenCalledWith(null)
    expect((getControlByLabel('Lead') as HTMLSelectElement).value).toBe('3')
  })

  it('submits a new call log', async () => {
    renderWithProviders(<CallTrackerPage />)
    fireEvent.change(getControlByLabel('Lead'), { target: { value: '1' } })
    fireEvent.change(getControlByLabel('Outcome'), { target: { value: 'Qualified' } })
    fireEvent.change(getControlByLabel('Notes'), { target: { value: 'Good call' } })
    fireEvent.click(screen.getByRole('button', { name: /Save Call Log/i }))

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalled()
      const payload = createMutate.mock.calls[0][0]
      expect(payload.lead_id).toBe(1)
      expect(payload.outcome).toBe('Qualified')
      expect(payload.notes).toBe('Good call')
      expect(payload.company).toBe(LEADS[0].company)
      expect(showToast).toHaveBeenCalledWith('Call logged')
    })
  })

  it('renders call logs and filters by outcome', () => {
    const logs: CallLog[] = [
      {
        id: 1,
        lead_id: 1,
        company: 'Acme Corp',
        contact_name: 'Alice',
        date: '2025-01-01',
        outcome: 'Prospect',
        notes: '',
      },
    ]
    mockHooks({ logs })
    renderWithProviders(<CallTrackerPage />)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    const comboboxes = screen.getAllByRole('combobox')
    fireEvent.change(comboboxes[comboboxes.length - 1], { target: { value: 'Qualified' } })
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })

  it('deletes a call log after confirmation', async () => {
    const logs: CallLog[] = [
      {
        id: 5,
        lead_id: 1,
        company: 'Acme Corp',
        contact_name: 'Alice',
        date: '2025-01-01',
        outcome: 'Prospect',
        notes: '',
      },
    ]
    mockHooks({ logs })
    window.confirm = vi.fn(() => true)

    renderWithProviders(<CallTrackerPage />)
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }))

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith(5)
      expect(showToast).toHaveBeenCalledWith('Call log deleted')
    })
  })
})
