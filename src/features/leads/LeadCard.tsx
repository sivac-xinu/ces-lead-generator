import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { displayName } from '@/utils/user'
import { useProfiles } from '@/hooks/useProfiles'
import type { Lead } from '@/types'
import { Brain, FileText, Phone, Trash2, StickyNote, Users } from 'lucide-react'

interface LeadCardProps {
  lead: Lead
  onIntelligence: (lead: Lead) => void
  onScript: (leadId: number) => void
  onTracker: (leadId: number) => void
  onDelete: (leadId: number) => void
  onContacts?: (leadId: number) => void
}

export function LeadCard({ lead, onIntelligence, onScript, onTracker, onDelete, onContacts }: LeadCardProps) {
  const { data: profiles = [] } = useProfiles()
  const itTypeVariant =
    lead.it_type === 'Cloud' ? 'cloud' : lead.it_type === 'On-Premise' ? 'onprem' : 'hybrid'

  const repDisplay = (() => {
    if (!lead.sales_rep) return null
    const match = profiles.find(
      (p) => p.email === lead.sales_rep || displayName(p) === lead.sales_rep
    )
    return match ? displayName(match) : lead.sales_rep
  })()

  const importLabel = (() => {
    if (!lead.imported) return null
    const source = lead.company_source?.toLowerCase() ?? ''
    if (source.includes('zoominfo')) return 'ZoomInfo Import'
    if (source.includes('clearbit') || source.includes('.com') || source.includes('.io') || source.includes('.co')) return 'Clearbit Import'
    if (source.endsWith('.csv')) return 'CSV Import'
    const by = lead.imported_by?.toLowerCase() ?? ''
    if (by === 'manual') return 'Manual Import'
    if (by === 'zoominfo') return 'ZoomInfo Import'
    if (by === 'clearbit') return 'Clearbit Import'
    if (by.includes('@')) return 'CSV Import'
    return lead.imported_by ? `${lead.imported_by} Import` : 'Imported'
  })()

  return (
    <div className={cn('card', lead.imported && 'border-l-4 border-l-green-600')}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">{lead.company}</h3>
          <p className="text-sm text-ces-muted">
            {lead.location} · {lead.employees ? `${lead.employees.toLocaleString()} employees` : 'employees unknown'}
          </p>
        </div>
        {importLabel && <span className="text-xs font-medium text-green-700">{importLabel}</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={itTypeVariant}>{lead.it_type}</Badge>
        <Badge variant="industry">{lead.industry}</Badge>
        {lead.size && <Badge>{lead.size} emp</Badge>}
        {repDisplay && <Badge variant="industry">Rep: {repDisplay}</Badge>}
        {lead.notes && (
          <span title={lead.notes.slice(0, 120)}>
            <Badge variant="default">
              <StickyNote className="mr-1 h-3 w-3" /> Notes
            </Badge>
          </span>
        )}
      </div>

      <div className="mt-3 text-sm">
        {lead.contact_name ? (
          <>
            <p>
              <span className="font-medium">{lead.contact_name}</span> · {lead.contact_title}
            </p>
            {lead.contact_email && <p className="text-ces-muted">{lead.contact_email}</p>}
          </>
        ) : (
          <p className="text-ces-muted">No contacts — click Contacts to add them.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => onIntelligence(lead)}>
          <Brain className="h-3.5 w-3.5" /> Intelligence
        </Button>
        <Button size="sm" onClick={() => onScript(lead.id)}>
          <FileText className="h-3.5 w-3.5" /> Script
        </Button>
        {onContacts && (
          <Button size="sm" onClick={() => onContacts(lead.id)}>
            <Users className="h-3.5 w-3.5" /> Contacts
          </Button>
        )}
        <Button size="sm" onClick={() => onTracker(lead.id)}>
          <Phone className="h-3.5 w-3.5" /> Log Call
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(lead.id)}>
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </Button>
      </div>
    </div>
  )
}
