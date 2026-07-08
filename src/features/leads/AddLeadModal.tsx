import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCreateLead } from '@/hooks/useLeads'
import { useProfiles } from '@/hooks/useProfiles'
import { useUIStore } from '@/store/uiStore'
import { inferICP, inferITType, inferTier } from '@/utils/lead'
import { displayName } from '@/utils/user'
import { Plus, Trash2, Star } from 'lucide-react'

interface AddLeadModalProps {
  open: boolean
  onClose: () => void
}

const industries = [
  'Finance',
  'Healthcare',
  'Logistics',
  'Manufacturing',
  'Retail',
  'Legal',
  'Education',
  'Technology',
  'Other',
]

interface ContactForm {
  name: string
  title: string
  email: string
  phone: string
}

export function AddLeadModal({ open, onClose }: AddLeadModalProps) {
  const { user } = useAuth()
  const createLead = useCreateLead()
  const { data: profiles = [] } = useProfiles()
  const { showToast } = useUIStore()

  const [form, setForm] = useState({
    company: '',
    industry: 'Other',
    employees: '',
    location: '',
    website: '',
    sales_rep: displayName(user) ?? '',
  })
  const [contacts, setContacts] = useState<ContactForm[]>([
    { name: '', title: '', email: '', phone: '' },
  ])
  const [primaryIndex, setPrimaryIndex] = useState(0)

  const reset = () => {
    setForm({
      company: '',
      industry: 'Other',
      employees: '',
      location: '',
      website: '',
      sales_rep: displayName(user) ?? '',
    })
    setContacts([{ name: '', title: '', email: '', phone: '' }])
    setPrimaryIndex(0)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const updateContact = (index: number, field: keyof ContactForm, value: string) => {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  const addContact = () => {
    setContacts((prev) => [...prev, { name: '', title: '', email: '', phone: '' }])
  }

  const removeContact = (index: number) => {
    setContacts((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (primaryIndex >= next.length) setPrimaryIndex(Math.max(0, next.length - 1))
      return next
    })
  }

  const handleSave = async () => {
    if (!form.company.trim()) {
      showToast('Company name is required', 'error')
      return
    }
    const validContacts = contacts.filter((c) => c.name.trim())
    if (validContacts.length === 0) {
      showToast('At least one contact with a name is required', 'error')
      return
    }

    const employees = form.employees ? parseInt(form.employees, 10) : undefined
    const industry = form.industry || 'Other'
    const primary = validContacts[primaryIndex] ?? validContacts[0]

    try {
      await createLead.mutateAsync({
        company: form.company.trim(),
        contact_name: primary.name.trim(),
        contact_title: primary.title.trim() || '—',
        contact_email: primary.email.trim() || undefined,
        contact_phone: primary.phone.trim() || undefined,
        industry,
        employees: employees && !Number.isNaN(employees) ? employees : undefined,
        location: form.location.trim() || undefined,
        website: form.website.trim() || undefined,
        linkedin_url: form.website.trim() || undefined,
        it_type: inferITType(industry),
        tier: inferTier(employees),
        icp: inferICP(employees),
        pain_points: [],
        imported: false,
        imported_by: user?.email ?? 'Manual',
        sales_rep: form.sales_rep || displayName(user) || undefined,
        status: 'New',
        contacts: validContacts.map((c, i) => ({
          name: c.name.trim(),
          title: c.title.trim() || undefined,
          email: c.email.trim() || undefined,
          phone: c.phone.trim() || undefined,
          is_primary: i === primaryIndex,
          source: 'Manual',
        })),
      })
      showToast('Lead added')
      handleClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add lead', 'error')
    }
  }

  const update = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Lead"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={createLead.isPending}>
            Add Lead
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Company Name *</label>
            <Input value={form.company} onChange={(e) => update('company', e.target.value)} />
          </div>
          <div>
            <label className="label">Industry</label>
            <Select value={form.industry} onChange={(e) => update('industry', e.target.value)}>
              {industries.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Employees</label>
            <Input type="number" value={form.employees} onChange={(e) => update('employees', e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <Input value={form.location} onChange={(e) => update('location', e.target.value)} />
          </div>
          <div>
            <label className="label">Website / LinkedIn</label>
            <Input value={form.website} onChange={(e) => update('website', e.target.value)} />
          </div>
          <div>
            <label className="label">Sales Rep *</label>
            <Select value={form.sales_rep} onChange={(e) => update('sales_rep', e.target.value)}>
              <option value="">— Select —</option>
              {profiles.map((p) => (
                <option key={p.id} value={displayName(p)}>
                  {displayName(p)}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-ces-muted">This rep is accountable for the lead.</p>
          </div>
        </div>

        <div className="border-t border-ces-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-ces-navy">Contacts *</h3>
            <Button type="button" size="sm" variant="secondary" onClick={addContact}>
              <Plus className="mr-1 h-4 w-4" /> Add Contact
            </Button>
          </div>
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 ${index === primaryIndex ? 'border-ces-orange bg-orange-50/50' : 'border-ces-border'}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-ces-navy">Contact {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrimaryIndex(index)}
                      className={`flex items-center gap-1 text-xs ${index === primaryIndex ? 'text-ces-orange' : 'text-ces-muted hover:text-ces-text'}`}
                      title="Set as primary contact"
                    >
                      <Star className="h-4 w-4" fill={index === primaryIndex ? 'currentColor' : 'none'} />
                      {index === primaryIndex ? 'Primary' : 'Set Primary'}
                    </button>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="text-ces-muted hover:text-red-600"
                        title="Remove contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label text-xs">Name *</label>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Job Title</label>
                    <Input
                      value={contact.title}
                      onChange={(e) => updateContact(index, 'title', e.target.value)}
                      placeholder="CIO"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Email</label>
                    <Input
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                      placeholder="jane@company.com"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Phone</label>
                    <Input
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
