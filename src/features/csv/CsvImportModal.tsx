import { useEffect, useRef, useState } from 'react'
import { parse } from 'papaparse'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useCreateLead } from '@/hooks/useLeads'
import { useProfiles } from '@/hooks/useProfiles'
import { useAuth } from '@/features/auth/AuthProvider'
import { useUIStore } from '@/store/uiStore'
import { CES_FIELDS, FIELD_SYNONYMS, inferPainPoints } from '@/data/inference'
import { inferICP, inferITType, inferTier } from '@/utils/lead'
import { cn } from '@/utils/cn'
import type { Lead } from '@/types'

interface CsvImportModalProps {
  open: boolean
  onClose: () => void
}

type CsvRow = Record<string, string>
type Mapping = Record<string, string>

const MAX_ROWS = 5000
const CHUNK_SIZE = 5

function generateSampleCsv(): string {
  const headers = CES_FIELDS.map((f) => `"${f.label}"`)
  const sampleRow = CES_FIELDS.map((f) => {
    if (f.key === 'contact_name') return '"Jane Smith"'
    if (f.key === 'first_name') return '"Jane"'
    if (f.key === 'last_name') return '"Smith"'
    if (f.key === 'contact_title') return '"VP of Information Technology"'
    if (f.key === 'company') return '"Acme Corp"'
    if (f.key === 'industry') return '"Healthcare"'
    if (f.key === 'employees') return '"350"'
    if (f.key === 'location') return '"Chicago, IL"'
    if (f.key === 'contact_email') return '"jane.smith@acme.com"'
    if (f.key === 'contact_phone') return '"+1 312-555-0100"'
    if (f.key === 'website') return '"https://linkedin.com/in/janesmith"'
    return '""'
  })
  return [headers.join(','), sampleRow.join(',')].join('\n')
}

function downloadSampleCsv() {
  const blob = new Blob([generateSampleCsv()], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'linkedin-leads-sample.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function autoDetectMapping(headers: string[]): Mapping {
  const mapping: Mapping = {}

  headers.forEach((header) => {
    const norm = normalizeHeader(header)
    let bestField: string | null = null
    let bestScore = 0

    for (const field of CES_FIELDS) {
      if (mapping[field.key]) continue
      const synonyms = FIELD_SYNONYMS[field.key] ?? []

      for (const synonym of synonyms) {
        const s = normalizeHeader(synonym)
        if (!s) continue

        const exact = s === norm
        const contained = norm.includes(s) || s.includes(norm)
        if (!exact && !contained) continue

        const score = exact ? s.length + 100 : s.length
        if (score > bestScore) {
          bestScore = score
          bestField = field.key
        }
      }
    }

    if (bestField) {
      mapping[bestField] = header
    }
  })

  return mapping
}

function parseEmployees(raw?: string): number | undefined {
  if (!raw) return undefined
  const digits = raw.replace(/[^0-9]/g, '')
  const num = parseInt(digits, 10)
  return Number.isNaN(num) ? undefined : num
}

function buildLead(
  row: CsvRow,
  mapping: Mapping,
  fileName: string,
  importedBy: string,
  salesRep: string
): Partial<Lead> {
  const get = (key: string): string => row[mapping[key]]?.trim() ?? ''

  const company = get('company') || 'Unknown Company'

  const contactNameRaw = get('contact_name')
  const firstName = get('first_name')
  const lastName = get('last_name')
  const contact_name =
    contactNameRaw ||
    (firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || 'Unknown Contact')

  const contact_title = get('contact_title') || '—'
  const industry = get('industry') || 'Other'
  const employees = parseEmployees(get('employees'))

  const it_type = inferITType(industry)
  const tier = inferTier(employees)
  const icp = inferICP(employees)
  const pain_points = inferPainPoints(contact_title, industry)

  return {
    company,
    contact_name,
    contact_title,
    industry,
    employees,
    location: get('location') || undefined,
    contact_email: get('contact_email') || undefined,
    contact_phone: get('contact_phone') || undefined,
    website: get('website') || undefined,
    linkedin_url: get('website') || undefined,
    it_type,
    tier,
    icp,
    pain_points,
    imported: true,
    imported_by: importedBy || 'Unknown',
    company_source: fileName,
    sales_rep: salesRep || undefined,
    status: 'New',
  }
}

export function CsvImportModal({ open, onClose }: CsvImportModalProps) {
  const { user } = useAuth()
  const createLead = useCreateLead()
  const { data: profiles = [] } = useProfiles()
  const { showToast } = useUIStore()

  const inputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [salesRep, setSalesRep] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0, errors: 0 })
  const [parseError, setParseError] = useState<string | null>(null)

  const resetState = () => {
    setFile(null)
    setDragOver(false)
    setHeaders([])
    setRows([])
    setMapping({})
    setSalesRep('')
    setImporting(false)
    setDone(false)
    setProgress({ completed: 0, total: 0, errors: 0 })
    setParseError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setParseError(null)
    setDone(false)
    setProgress({ completed: 0, total: 0, errors: 0 })

    parse<CsvRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const messages = results.errors.slice(0, 3).map((e) => e.message)
          setParseError(`CSV parse error: ${messages.join('; ')}`)
          showToast('Failed to parse CSV', 'error')
          return
        }

        const parsedHeaders = results.meta.fields ?? []
        const parsedRows = results.data

        if (parsedRows.length > MAX_ROWS) {
          showToast(
            `CSV has ${parsedRows.length.toLocaleString()} rows; maximum is ${MAX_ROWS.toLocaleString()}`,
            'error'
          )
          setParseError(
            `Too many rows: ${parsedRows.length.toLocaleString()} (limit ${MAX_ROWS.toLocaleString()})`
          )
          return
        }

        setHeaders(parsedHeaders)
        setRows(parsedRows)
        setMapping(autoDetectMapping(parsedHeaders))
      },
      error: (err) => {
        setParseError(err.message)
        showToast(err.message, 'error')
      },
    })
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  const requiredFields = CES_FIELDS.filter((f) => f.required)
  const requiredMapped = requiredFields.every((f) => !!mapping[f.key])

  const handleImport = async () => {
    if (!requiredMapped || rows.length === 0) return

    setImporting(true)
    setDone(false)
    setProgress({ completed: 0, total: rows.length, errors: 0 })

    const fileName = file?.name ?? 'unknown.csv'
    const importedBy = user?.email ?? 'Unknown'
    const assignedSalesRep = salesRep || importedBy

    let completed = 0
    let errors = 0

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      if (cancelledRef.current) return
      const chunk = rows.slice(i, i + CHUNK_SIZE)
      const results = await Promise.allSettled(
        chunk.map((row) => createLead.mutateAsync(buildLead(row, mapping, fileName, importedBy, assignedSalesRep)))
      )

      if (cancelledRef.current) return

      results.forEach((result) => {
        if (result.status === 'rejected') {
          errors += 1
        } else {
          completed += 1
        }
      })

      setProgress({ completed, total: rows.length, errors })
    }

    if (cancelledRef.current) return

    setImporting(false)
    setDone(true)

    if (errors > 0) {
      showToast(`Imported ${completed} of ${rows.length} leads (${errors} errors)`, 'error')
    } else {
      showToast(`Imported ${completed} leads successfully`, 'success')
    }
  }

  const previewRows = rows.slice(0, 5)

  const footer = done ? (
    <div className="flex items-center justify-between">
      <p className={cn('text-sm', progress.errors > 0 ? 'text-red-600' : 'text-green-600')}>
        {progress.errors > 0
          ? `Imported ${progress.completed} leads with ${progress.errors} errors.`
          : `Imported ${progress.completed} leads.`}
      </p>
      <Button variant="secondary" onClick={handleClose}>
        Close
      </Button>
    </div>
  ) : (
    <div className="flex items-center justify-between">
      <div className="text-sm text-ces-muted">
        {importing ? (
          <span>
            Importing {progress.completed} of {progress.total}
            {progress.errors > 0 && (
              <span className="ml-2 text-red-600">({progress.errors} errors)</span>
            )}
          </span>
        ) : (
          <span>
            {rows.length > 0 ? `${rows.length.toLocaleString()} rows ready` : 'No file selected'}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={handleClose} disabled={importing}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleImport}
          loading={importing}
          disabled={!requiredMapped || rows.length === 0 || !!parseError}
        >
          Import
        </Button>
      </div>
    </div>
  )

  return (
    <Modal open={open} onClose={handleClose} title="Import CSV Leads" size="lg" footer={footer}>
      <div className="space-y-6">
        <div className="rounded-xl border border-ces-border bg-ces-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-ces-orange" />
            <h3 className="text-sm font-semibold text-ces-navy">Supported CSV columns</h3>
          </div>
          <p className="mb-3 text-xs text-ces-muted">
            The importer auto-detects headers. Required columns are marked with{' '}
            <span className="text-red-500">*</span>. Extra columns are ignored.
          </p>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            {CES_FIELDS.map((field) => {
              const synonyms = FIELD_SYNONYMS[field.key] ?? []
              return (
                <div key={field.key} className="rounded-lg border border-ces-border bg-white p-2.5">
                  <div className="font-medium text-ces-text">
                    {field.label}
                    {field.required && <span className="ml-1 text-red-500">*</span>}
                  </div>
                  {synonyms.length > 0 && (
                    <div className="mt-1 text-ces-muted">
                      Accepts: {synonyms.slice(0, 5).join(', ')}
                      {synonyms.length > 5 && ` +${synonyms.length - 5} more`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={downloadSampleCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download sample CSV
            </Button>
            <span className="text-xs text-ces-muted">Use this template to format your LinkedIn export.</span>
          </div>
        </div>

        <div
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors',
            dragOver
              ? 'border-ces-orange bg-ces-orange-light'
              : 'border-ces-border bg-ces-card hover:border-ces-orange',
            importing && 'pointer-events-none opacity-60'
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          aria-label="Drag and drop a CSV file here, or click to browse"
          data-testid="csv-drop-zone"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleInputChange}
            data-testid="csv-file-input"
          />
          {file ? (
            <>
              <FileSpreadsheet className="h-8 w-8 text-ces-orange" />
              <p className="text-sm font-medium text-ces-text">{file.name}</p>
              <p className="text-xs text-ces-muted">Click or drop another file to replace</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-ces-muted" />
              <p className="text-sm font-medium text-ces-text">Drag & drop a CSV file here</p>
              <p className="text-xs text-ces-muted">or click to browse</p>
            </>
          )}
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {headers.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className="label">Assign Sales Rep</label>
              <Select
                aria-label="Assign sales rep"
                value={salesRep}
                onChange={(e) => setSalesRep(e.target.value)}
                disabled={importing}
              >
                <option value="">— Default (importer) —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.email}>
                    {p.email}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-ces-muted">
                Choose the sales rep who will own these leads. Defaults to you if left blank.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ces-navy">Column Mapping</h3>
              <p className="text-xs text-ces-muted">
                Required fields are marked with <span className="text-red-500">*</span>. Unmapped
                columns will be ignored.
              </p>
            </div>

            <div className="rounded-lg border border-ces-border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-ces-muted">Target Field</th>
                    <th className="px-4 py-2 text-left font-medium text-ces-muted">CSV Column</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ces-border">
                  {CES_FIELDS.map((field) => (
                    <tr key={field.key}>
                      <td className="px-4 py-2">
                        <label htmlFor={`map-${field.key}`} className="text-ces-text">
                          {field.label}
                          {field.required && <span className="ml-1 text-red-500">*</span>}
                        </label>
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          id={`map-${field.key}`}
                          aria-label={field.label}
                          value={mapping[field.key] ?? ''}
                          onChange={(e) =>
                            setMapping((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          disabled={importing}
                        >
                          <option value="">— Unmapped —</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ces-navy">Preview</h3>
                  <span className="text-xs text-ces-muted">(first {previewRows.length} rows)</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-ces-border">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {headers.map((header) => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-3 py-2 text-left font-medium text-ces-muted"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ces-border">
                      {previewRows.map((row, idx) => (
                        <tr key={idx}>
                          {headers.map((header) => (
                            <td key={header} className="whitespace-nowrap px-3 py-2 text-ces-text">
                              {row[header] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {done && progress.errors === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>All leads imported successfully.</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
