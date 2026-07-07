import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useContacts, useCreateContact, useDeleteContact, useSetPrimaryContact } from '@/hooks/useContacts'
import { Plus, Trash2, Star } from 'lucide-react'

interface ContactsPanelProps {
  leadId: number
}

export function ContactsPanel({ leadId }: ContactsPanelProps) {
  const { data: contacts = [], isLoading } = useContacts(leadId)
  const createContact = useCreateContact()
  const deleteContact = useDeleteContact()
  const setPrimary = useSetPrimaryContact()

  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '' })
  const [showForm, setShowForm] = useState(false)

  const handleAdd = async () => {
    if (!form.name.trim()) return
    await createContact.mutateAsync({
      lead_id: leadId,
      name: form.name.trim(),
      title: form.title.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      is_primary: contacts.length === 0,
      source: 'Manual',
    })
    setForm({ name: '', title: '', email: '', phone: '' })
    setShowForm(false)
  }

  if (isLoading) {
    return <div className="text-sm text-ces-muted">Loading contacts…</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ces-navy">Contacts · {contacts.length}</h4>
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-ces-border bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" variant="primary" onClick={handleAdd} loading={createContact.isPending}>
              Save Contact
            </Button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <p className="text-sm text-ces-muted">No contacts yet. Use Add to create one.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`flex items-start justify-between rounded-lg border p-3 ${contact.is_primary ? 'border-ces-orange bg-orange-50/50' : 'border-ces-border bg-white'}`}
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
                    onClick={() => setPrimary.mutateAsync({ lead_id: leadId, contact_id: contact.id })}
                    className="rounded p-1 text-ces-muted hover:bg-slate-100 hover:text-ces-orange"
                    title="Set as primary"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteContact.mutateAsync({ lead_id: leadId, id: contact.id })}
                  className="rounded p-1 text-ces-muted hover:bg-slate-100 hover:text-red-600"
                  title="Delete contact"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
