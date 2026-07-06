import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { parse } from 'papaparse'
import { CsvImportModal } from './CsvImportModal'
import { useUIStore } from '@/store/uiStore'

const createLeadMock = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useLeads', () => ({
  useCreateLead: () => ({ mutateAsync: createLeadMock, isPending: false }),
}))

const authMock = vi.hoisted(() => ({
  user: { email: 'admin@example.com', role: 'admin', approved: true, id: '1' },
}))
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => authMock,
}))

vi.mock('@/hooks/useProfiles', () => ({
  useProfiles: () => ({ data: [], isLoading: false }),
}))

vi.mock('papaparse', () => ({
  parse: vi.fn(),
}))

const ROW_LIMIT = 5000

function csvFile(name: string, _rows: Record<string, string>[], _headers: string[]) {
  return new File([''], name, { type: 'text/csv' })
}

function mockParse(
  rows: Record<string, string>[],
  headers: string[],
  errors: { message: string }[] = []
) {
  ;(parse as Mock).mockImplementation(
    (
      _file: File,
      config: {
        complete?: (results: {
          data: typeof rows
          meta: { fields: string[] }
          errors: typeof errors
        }) => void
      }
    ) => {
      if (config.complete) {
        config.complete({ data: rows, meta: { fields: headers }, errors })
      }
    }
  )
}

describe('CsvImportModal', () => {
  beforeEach(() => {
    createLeadMock.mockReset()
    createLeadMock.mockResolvedValue({ id: 1 })
    useUIStore.setState({ toast: null })
  })

  it('renders upload area and accepts a CSV file', async () => {
    const user = userEvent.setup()
    mockParse(
      [
        {
          Company: 'Acme',
          'Contact Name': 'Alice Smith',
          Title: 'CIO',
          Industry: 'Healthcare',
          Employees: '500',
        },
      ],
      ['Company', 'Contact Name', 'Title', 'Industry', 'Employees']
    )

    render(<CsvImportModal open onClose={() => {}} />)

    const input = screen.getByTestId('csv-file-input')
    await user.upload(input, csvFile('leads.csv', [], []))

    await waitFor(() => {
      expect(screen.getByText('Column Mapping')).toBeInTheDocument()
      expect(screen.getByText('leads.csv')).toBeInTheDocument()
    })
  })

  it('auto-detects column mapping from FIELD_SYNONYMS', async () => {
    const user = userEvent.setup()
    mockParse(
      [
        {
          'Company Name': 'Acme',
          'Full Name': 'Alice Smith',
          'Job Title': 'CIO',
          Industry: 'Healthcare',
          'Company Size': '500',
        },
      ],
      ['Company Name', 'Full Name', 'Job Title', 'Industry', 'Company Size']
    )

    render(<CsvImportModal open onClose={() => {}} />)

    const input = screen.getByTestId('csv-file-input')
    await user.upload(input, csvFile('leads.csv', [], []))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Company Name' })).toHaveValue('Company Name')
      expect(screen.getByRole('combobox', { name: 'Contact Full Name' })).toHaveValue('Full Name')
      expect(screen.getByRole('combobox', { name: 'Job Title' })).toHaveValue('Job Title')
      expect(screen.getByRole('combobox', { name: 'Industry' })).toHaveValue('Industry')
      expect(screen.getByRole('combobox', { name: 'Company Size / Employees' })).toHaveValue(
        'Company Size'
      )
    })
  })

  it('previews the first 5 rows', async () => {
    const user = userEvent.setup()
    const rows = Array.from({ length: 6 }, (_, i) => ({
      Company: `Company ${i + 1}`,
      Name: `Person ${i + 1}`,
      Title: 'Director',
    }))
    mockParse(rows, ['Company', 'Name', 'Title'])

    render(<CsvImportModal open onClose={() => {}} />)

    const input = screen.getByTestId('csv-file-input')
    await user.upload(input, csvFile('leads.csv', [], []))

    await waitFor(() => {
      expect(screen.getByText('Preview')).toBeInTheDocument()
      expect(screen.getByText('Company 1')).toBeInTheDocument()
      expect(screen.getByText('Company 5')).toBeInTheDocument()
      expect(screen.queryByText('Company 6')).not.toBeInTheDocument()
    })
  })

  it('disables import until required fields are mapped', async () => {
    const user = userEvent.setup()
    mockParse([{ Name: 'Alice', Title: 'CIO' }], ['Name', 'Title'])

    render(<CsvImportModal open onClose={() => {}} />)

    const input = screen.getByTestId('csv-file-input')
    await user.upload(input, csvFile('leads.csv', [], []))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /import/i })).toBeDisabled()
    })
  })

  it('imports rows and infers lead attributes', async () => {
    const user = userEvent.setup()
    mockParse(
      [
        {
          'Company Name': 'Acme',
          'Full Name': 'Alice Smith',
          'Job Title': 'CIO',
          Industry: 'Healthcare',
          'Company Size': '500',
        },
        {
          'Company Name': 'Globex',
          'Full Name': 'Bob Jones',
          'Job Title': 'IT Director',
          Industry: 'Technology',
          'Company Size': '50',
        },
      ],
      ['Company Name', 'Full Name', 'Job Title', 'Industry', 'Company Size']
    )

    render(<CsvImportModal open onClose={() => {}} />)

    const input = screen.getByTestId('csv-file-input')
    await user.upload(input, csvFile('leads.csv', [], []))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Company Name' })).toHaveValue('Company Name')
    })

    await user.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => {
      expect(createLeadMock).toHaveBeenCalledTimes(2)
    })

    const first = createLeadMock.mock.calls[0][0] as Record<string, unknown>
    expect(first.company).toBe('Acme')
    expect(first.contact_name).toBe('Alice Smith')
    expect(first.contact_title).toBe('CIO')
    expect(first.industry).toBe('Healthcare')
    expect(first.employees).toBe(500)
    expect(first.it_type).toBe('On-Premise')
    expect(first.tier).toBe('Tier 2')
    expect(first.icp).toBe('Mid-Market')
    expect(first.imported).toBe(true)
    expect(first.imported_by).toBe('admin@example.com')
    expect(first.company_source).toBe('leads.csv')
    expect(Array.isArray(first.pain_points)).toBe(true)

    const second = createLeadMock.mock.calls[1][0] as Record<string, unknown>
    expect(second.company).toBe('Globex')
    expect(second.icp).toBe('SMB')
    expect(second.it_type).toBe('Cloud')

    expect(useUIStore.getState().toast?.type).toBe('success')
  })

  it('shows an error toast when CSV exceeds the row limit', async () => {
    const user = userEvent.setup()
    const rows = Array.from({ length: ROW_LIMIT + 1 }, () => ({
      Company: 'Acme',
      Name: 'Alice',
      Title: 'CIO',
    }))
    mockParse(rows, ['Company', 'Name', 'Title'])

    render(<CsvImportModal open onClose={() => {}} />)

    const input = screen.getByTestId('csv-file-input')
    await user.upload(input, csvFile('huge.csv', [], []))

    await waitFor(() => {
      expect(useUIStore.getState().toast?.type).toBe('error')
      expect(screen.getByRole('button', { name: /import/i })).toBeDisabled()
    })
  })

  it('shows progress while importing and reports errors', async () => {
    const user = userEvent.setup()
    createLeadMock.mockRejectedValueOnce(new Error('Insert failed'))
    createLeadMock.mockResolvedValue({ id: 2 })

    mockParse(
      [
        { Company: 'Acme', Name: 'Alice', Title: 'CIO' },
        { Company: 'Globex', Name: 'Bob', Title: 'IT Director' },
      ],
      ['Company', 'Name', 'Title']
    )

    render(<CsvImportModal open onClose={() => {}} />)

    const input = screen.getByTestId('csv-file-input')
    await user.upload(input, csvFile('leads.csv', [], []))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Company Name' })).toHaveValue('Company')
    })

    await user.click(screen.getByRole('button', { name: /import/i }))

    await waitFor(() => {
      expect(screen.getByText(/1 errors/i)).toBeInTheDocument()
      expect(useUIStore.getState().toast?.type).toBe('error')
    })
  })
})
