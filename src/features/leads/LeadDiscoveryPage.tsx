import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LeadCard } from './LeadCard'
import { IntelligenceModal } from '@/features/intelligence/IntelligenceModal'
import { CsvImportModal } from '@/features/csv/CsvImportModal'
import { useDeleteLead, useLeads } from '@/hooks/useLeads'
import { useProfiles } from '@/hooks/useProfiles'
import { useUIStore } from '@/store/uiStore'
import type { Lead } from '@/types'

const industries = [
  'Finance',
  'Healthcare',
  'Logistics',
  'Manufacturing',
  'Retail',
  'Legal',
  'Education',
  'Technology',
]
const itTypes = ['Cloud', 'On-Premise', 'Hybrid']
const icps = ['Enterprise', 'Mid-Market', 'SMB']
const tiers = ['Tier 1', 'Tier 2', 'Tier 3']
const sizes = ['1-50', '50-200', '200-500', '500-1000', '1000-5000', '5000+']

export function LeadDiscoveryPage() {
  const navigate = useNavigate()
  const { data: leads = [], isLoading } = useLeads()
  const { data: profiles = [] } = useProfiles()
  const deleteLead = useDeleteLead()
  const { showToast, setScriptLeadId, setTrackerLeadId } = useUIStore()

  const [filters, setFilters] = useState({
    industry: '',
    itType: '',
    icp: '',
    tier: '',
    size: '',
    salesRep: '',
    search: '',
  })

  const [intelligenceLead, setIntelligenceLead] = useState<Lead | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return leads.filter((l) => {
      if (filters.industry && l.industry !== filters.industry) return false
      if (filters.itType && l.it_type !== filters.itType) return false
      if (filters.icp && !l.icp?.startsWith(filters.icp)) return false
      if (filters.tier && l.tier !== filters.tier) return false
      if (filters.size && l.size !== filters.size) return false
      if (filters.salesRep && l.sales_rep !== filters.salesRep) return false
      if (q && !l.company.toLowerCase().includes(q) && !l.contact_name.toLowerCase().includes(q))
        return false
      return true
    })
  }, [leads, filters])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this lead?')) return
    try {
      await deleteLead.mutateAsync(id)
      showToast('Lead removed')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove lead', 'error')
    }
  }

  const goToScript = (id: number) => {
    setScriptLeadId(id)
    navigate('/script')
  }

  const goToTracker = (id: number) => {
    setTrackerLeadId(id)
    navigate('/tracker')
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ces-orange border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lead Discovery</h1>
          <p className="text-ces-muted">Browse and filter IT infrastructure leads.</p>
        </div>
        <Button variant="primary" onClick={() => setImportOpen(true)}>
          Import CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ces-border bg-ces-card p-4">
        <FilterSelect
          label="Industry"
          value={filters.industry}
          onChange={(v) => setFilters((f) => ({ ...f, industry: v }))}
          options={industries}
        />
        <FilterSelect
          label="IT Type"
          value={filters.itType}
          onChange={(v) => setFilters((f) => ({ ...f, itType: v }))}
          options={itTypes}
        />
        <FilterSelect
          label="ICP"
          value={filters.icp}
          onChange={(v) => setFilters((f) => ({ ...f, icp: v }))}
          options={icps}
        />
        <FilterSelect
          label="Tier"
          value={filters.tier}
          onChange={(v) => setFilters((f) => ({ ...f, tier: v }))}
          options={tiers}
        />
        <FilterSelect
          label="Size"
          value={filters.size}
          onChange={(v) => setFilters((f) => ({ ...f, size: v }))}
          options={sizes}
        />
        <FilterSelect
          label="Sales Rep"
          value={filters.salesRep}
          onChange={(v) => setFilters((f) => ({ ...f, salesRep: v }))}
          options={profiles.map((p) => p.email)}
        />
        <div className="min-w-[200px] flex-1">
          <label className="label">Search</label>
          <Input
            placeholder="Company or contact…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            setFilters({ industry: '', itType: '', icp: '', tier: '', size: '', salesRep: '', search: '' })
          }
        >
          Clear
        </Button>
      </div>

      <p className="text-sm text-ces-muted">
        {filtered.length} lead{filtered.length !== 1 ? 's' : ''} found
      </p>

      <div className="grid gap-4">
        {filtered.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onIntelligence={setIntelligenceLead}
            onScript={goToScript}
            onTracker={goToTracker}
            onDelete={handleDelete}
          />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-ces-border bg-ces-card p-12 text-center">
            <p className="text-ces-muted">No leads match your filters.</p>
          </div>
        )}
      </div>

      <IntelligenceModal
        lead={intelligenceLead}
        open={!!intelligenceLead}
        onClose={() => setIntelligenceLead(null)}
      />
      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="min-w-[140px]">
      <label className="label">{label}</label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All {label}s</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </div>
  )
}
