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

export function AddLeadModal({ open, onClose }: AddLeadModalProps) {
  const { user } = useAuth()
  const createLead = useCreateLead()
  const { data: profiles = [] } = useProfiles()
  const { showToast } = useUIStore()

  const [form, setForm] = useState({
    company: '',
    contact_name: '',
    contact_title: '',
    contact_email: '',
    contact_phone: '',
    industry: 'Other',
    employees: '',
    location: '',
    website: '',
    sales_rep: user?.email ?? '',
  })

  const reset = () => {
    setForm({
      company: '',
      contact_name: '',
      contact_title: '',
      contact_email: '',
      contact_phone: '',
      industry: 'Other',
      employees: '',
      location: '',
      website: '',
      sales_rep: user?.email ?? '',
    })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    if (!form.company.trim() || !form.contact_name.trim()) {
      showToast('Company and contact name are required', 'error')
      return
    }

    const employees = form.employees ? parseInt(form.employees, 10) : undefined
    const industry = form.industry || 'Other'

    try {
      await createLead.mutateAsync({
        company: form.company.trim(),
        contact_name: form.contact_name.trim(),
        contact_title: form.contact_title.trim() || '—',
        contact_email: form.contact_email.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
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
        sales_rep: form.sales_rep || user?.email || undefined,
        status: 'New',
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Company Name *</label>
          <Input value={form.company} onChange={(e) => update('company', e.target.value)} />
        </div>
        <div>
          <label className="label">Contact Name *</label>
          <Input value={form.contact_name} onChange={(e) => update('contact_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Job Title</label>
          <Input value={form.contact_title} onChange={(e) => update('contact_title', e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <Input value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <Input value={form.contact_phone} onChange={(e) => update('contact_phone', e.target.value)} />
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
          <Input
            type="number"
            value={form.employees}
            onChange={(e) => update('employees', e.target.value)}
          />
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
              <option key={p.id} value={p.email}>
                {p.email}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-ces-muted">This rep is accountable for the lead.</p>
        </div>
      </div>
    </Modal>
  )
}
