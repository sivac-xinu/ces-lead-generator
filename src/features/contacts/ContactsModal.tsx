import { useState } from 'react'
import { parse } from 'papaparse'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useContacts, useCreateContact, useDeleteContact, useSetPrimaryContact } from '@/hooks/useContacts'
import { useUIStore } from '@/store/uiStore'
import { Plus, Trash2, Star, Upload, FileSpreadsheet } from 'lucide-react'
import type { Contact } from '@/types'

interface ContactsModalProps {
  leadId: number
  open: boolean
  onClose: () => void
}

type Tab = 'manual' | 'csv'

interface ContactForm {
  name: string
  title: string
  email: string
  phone: string
}

const EMPTY_CONTACT: ContactForm = { name: '', title: '', email: '', phone: '' }

const CONTACT_CSV_FIELDS = ['name', 'title', 'email', 'phone']

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function autoDetectContactMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  headers.forEach((header) => {
    const norm = normalizeHeader(header)
    for (const field of CONTACT_CSV_FIELDS) {
      if (mapping[field]) continue
      if (norm === field || norm.includes(field) || field.includes(norm)) {
        mapping[field] = header
        break
      }
    }
  })
  return mapping
}

export function ContactsModal({ leadId, open, onClose }: ContactsModalProps) {
  const { data: contacts = [], isLoading } = useContacts(leadId)
  const createContact = useCreateContact()
  const deleteContact = useDeleteContact()
  const setPrimary = useSetPrimaryContact()
  const { showToast } = useUIStore()

  const [tab, setTab] = useState<Tab>('manual')
  const [forms, setForms] = useState<ContactForm[]>([{ ...EMPTY_CONTACT }])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)

  const reset = () => {
    setTab('manual')
    setForms([{ ...EMPTY_CONTACT }])
    setCsvFile(null)
    setCsvRows([])
    setCsvMapping({})
    setImporting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const updateForm = (index: number, field: keyof ContactForm, value: string) => {
    setForms((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)))
  }

  const addRow = () => setForms((prev) => [...prev, { ...EMPTY_CONTACT }])

  const removeRow = (index: number) => {
    setForms((prev) => prev.filter((_, i) => i !== index))
  }

  const saveManual = async () => {
    const valid = forms.filter((f) => f.name.trim())
    if (valid.length === 0) {
      showToast('At least one contact name is required', 'error')
      return
    }

    try {
      await Promise.all(
        valid.map((f, i) =>
          createContact.mutateAsync({
            lead_id: leadId,
            name: f.name.trim(),
            title: f.title.trim() || undefined,
            email: f.email.trim() || undefined,
            phone: f.phone.trim() || undefined,
            is_primary: contacts.length === 0 && i === 0,
            source: 'Manual',
          })
        )
      )
      showToast(`${valid.length} contact${valid.length > 1 ? 's' : ''} added`)
      setForms([{ ...EMPTY_CONTACT }])
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save contacts', 'error')
    }
  }

  const handleCsvSelect = (file: File) => {
    setCsvFile(file)
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        setCsvRows(results.data as Record<string, string>[])
        setCsvMapping(autoDetectContactMapping(headers))
      },
      error: (err) => showToast(err.message, 'error'),
    })
  }

  const saveCsv = async () => {
    if (!csvFile || csvRows.length === 0) return

    const valid = csvRows
      .map((row) => ({
        name: row[csvMapping.name]?.trim() || row['name']?.trim(),
        title: row[csvMapping.title]?.trim() || row['title']?.trim(),
        email: row[csvMapping.email]?.trim() || row['email']?.trim(),
        phone: row[csvMapping.phone]?.trim() || row['phone']?.trim(),
      }))
      .filter((c) => c.name)

    if (valid.length === 0) {
      showToast('No valid contacts found in CSV', 'error')
      return
    }

    setImporting(true)
    try {
      await Promise.all(
        valid.map((c, i) =>
          createContact.mutateAsync({
            lead_id: leadId,
            name: c.name,
            title: c.title || undefined,
            email: c.email || undefined,
            phone: c.phone || undefined,
            is_primary: contacts.length === 0 && i === 0,
            source: `CSV: ${csvFile.name}`,
          })
        )
      )
      showToast(`${valid.length} contact${valid.length > 1 ? 's' : ''} imported`)
      reset()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to import contacts', 'error')
    } finally {
      setImporting(false)
    }
  }

  const hasValidForms = forms.some((f) => f.name.trim())

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Manage Contacts"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
          {tab === 'manual' ? (
            <Button variant="primary" onClick={saveManual} disabled={!hasValidForms} loading={createContact.isPending}>
              Save Contacts
            </Button>
          ) : (
            <Button variant="primary" onClick={saveCsv} disabled={!csvFile || importing} loading={importing}>
              Import {csvRows.filter((r) => r[csvMapping.name || 'name']?.trim()).length} Contacts
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-ces-border pb-1">
          <Button
            variant={tab === 'manual' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTab('manual')}
            className="rounded-b-none"
          >
            Manual
          </Button>
          <Button
            variant={tab === 'csv' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTab('csv')}
            className="rounded-b-none"
          >
            Import CSV
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-ces-muted">Loading contacts…</div>
        ) : (
          <>
            {contacts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-ces-navy">Existing Contacts</h4>
                {contacts.map((contact) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    onSetPrimary={() => setPrimary.mutateAsync({ lead_id: leadId, contact_id: contact.id })}
                    onDelete={() => deleteContact.mutateAsync({ lead_id: leadId, id: contact.id })}
                  />
                ))}
              </div>
            )}

            {tab === 'manual' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-ces-navy">Add Contacts</h4>
                  <Button type="button" size="sm" variant="secondary" onClick={addRow}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
                  </Button>
                </div>
                {forms.map((form, index) => (
                  <div key={index} className="rounded-lg border border-ces-border bg-slate-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Name *"
                        value={form.name}
                        onChange={(e) => updateForm(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Title"
                        value={form.title}
                        onChange={(e) => updateForm(index, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => updateForm(index, 'email', e.target.value)}
                      />
                      <Input
                        placeholder="Phone"
                        value={form.phone}
                        onChange={(e) => updateForm(index, 'phone', e.target.value)}
                      />
                    </div>
                    {forms.length > 1 && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove row
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {!csvFile ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-ces-border bg-ces-card p-8 hover:bg-slate-50">
                    <Upload className="mb-2 h-8 w-8 text-ces-muted" />
                    <p className="text-sm font-medium">Upload CSV of contacts</p>
                    <p className="mt-1 text-xs text-ces-muted">
                      Columns: name, title, email, phone
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleCsvSelect(file)
                      }}
                    />
                  </label>
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-lg border border-ces-border bg-ces-card p-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium">{csvFile.name}</span>
                        <span className="text-xs text-ces-muted">({csvRows.length} rows)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvFile(null)
                          setCsvRows([])
                          setCsvMapping({})
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    {csvRows.length > 0 && (
                      <div className="rounded-lg border border-ces-border">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold">CSV Column</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold">Maps to</th>
                            </tr>
                          </thead>
                          <tbody>
                            {CONTACT_CSV_FIELDS.map((field) => (
                              <tr key={field} className="border-t border-ces-border">
                                <td className="px-3 py-2 capitalize">{field}</td>
                                <td className="px-3 py-2">
                                  <select
                                    className="select w-full"
                                    value={csvMapping[field] || ''}
                                    onChange={(e) =>
                                      setCsvMapping((m) => ({ ...m, [field]: e.target.value }))
                                    }
                                  >
                                    <option value="">— Ignore —</option>
                                    {Object.keys(csvRows[0]).map((h) => (
                                      <option key={h} value={h}>
                                        {h}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

function ContactRow({
  contact,
  onSetPrimary,
  onDelete,
}: {
  contact: Contact
  onSetPrimary: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-start justify-between rounded-lg border p-3 ${
        contact.is_primary ? 'border-ces-orange bg-orange-50/50' : 'border-ces-border bg-white'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-ces-text">{contact.name}</span>
          {contact.is_primary && (
            <span className="rounded bg-ces-orange px-1.5 py-0.5 text-xs text-white">Primary</span>
          )}
        </div>
        <div className="text-sm text-ces-muted">
          {contact.title}
          {contact.title && (contact.email || contact.phone) && ' · '}
          {contact.email}
          {contact.email && contact.phone && ' · '}
          {contact.phone}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!contact.is_primary && (
          <button
            type="button"
            onClick={onSetPrimary}
            className="rounded p-1 text-ces-muted hover:bg-slate-100 hover:text-ces-orange"
            title="Set as primary"
          >
            <Star className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-ces-muted hover:bg-slate-100 hover:text-red-600"
          title="Delete contact"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
