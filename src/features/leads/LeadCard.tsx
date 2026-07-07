import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { Lead } from '@/types'
import { Brain, FileText, Phone, Trash2 } from 'lucide-react'

interface LeadCardProps {
  lead: Lead
  onIntelligence: (lead: Lead) => void
  onScript: (leadId: number) => void
  onTracker: (leadId: number) => void
  onDelete: (leadId: number) => void
}

export function LeadCard({ lead, onIntelligence, onScript, onTracker, onDelete }: LeadCardProps) {
  const itTypeVariant =
    lead.it_type === 'Cloud' ? 'cloud' : lead.it_type === 'On-Premise' ? 'onprem' : 'hybrid'

  return (
    <div className={cn('card', lead.imported && 'border-l-4 border-l-green-600')}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">{lead.company}</h3>
          <p className="text-sm text-ces-muted">
            {lead.location} · {lead.employees ? `${lead.employees.toLocaleString()} employees` : 'employees unknown'}
          </p>
        </div>
        {lead.imported && <span className="text-xs font-medium text-green-700">LinkedIn Import</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={itTypeVariant}>{lead.it_type}</Badge>
        <Badge variant="industry">{lead.industry}</Badge>
        {lead.size && <Badge>{lead.size} emp</Badge>}
        {lead.sales_rep && <Badge variant="industry">Rep: {lead.sales_rep}</Badge>}
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
          <p className="text-ces-muted">No contacts — open Intelligence to add contacts.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => onIntelligence(lead)}>
          <Brain className="h-3.5 w-3.5" /> Intelligence
        </Button>
        <Button size="sm" onClick={() => onScript(lead.id)}>
          <FileText className="h-3.5 w-3.5" /> Script
        </Button>
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
