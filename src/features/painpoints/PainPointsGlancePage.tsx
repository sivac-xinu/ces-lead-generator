import { useMemo, useState } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { Lightbulb, Building2, Tag } from 'lucide-react'

type GroupMode = 'company' | 'theme'

function extractThemes(painPoints: string[]): string[] {
  const themeHints: Record<string, string[]> = {
    'Cloud': ['cloud', 'aws', 'azure', 'gcp', 'migration', 'finops', 'spend'],
    'Security': ['security', 'compliance', 'cyber', 'breach', 'risk', 'gdpr', 'soc2'],
    'Data': ['data', 'silos', 'analytics', 'warehouse', 'lake', 'backup'],
    'Infrastructure': ['legacy', 'hardware', 'modernisation', 'modernization', 'end-of-life', 'datacenter'],
    'AI': ['ai', 'ml', 'artificial intelligence', 'model', 'gpu', 'llm'],
    'Operations': ['incident', 'observability', 'monitoring', 'sre', 'downtime'],
    'Talent': ['talent', 'skills', 'hiring', 'staffing', 'expertise'],
  }

  const themes = new Set<string>()
  painPoints.forEach((point) => {
    const lower = point.toLowerCase()
    Object.entries(themeHints).forEach(([theme, keywords]) => {
      if (keywords.some((k) => lower.includes(k))) themes.add(theme)
    })
    if (themes.size === 0) themes.add('General')
  })
  return Array.from(themes)
}

export function PainPointsGlancePage() {
  const { data: leads = [], isLoading } = useLeads()
  const [groupBy, setGroupBy] = useState<GroupMode>('company')
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const q = search.toLowerCase()
    const map = new Map<string, { leads: Set<string>; points: { text: string; company: string }[] }>()

    leads.forEach((lead) => {
      if (!lead.pain_points?.length) return
      lead.pain_points.forEach((point) => {
        if (q && !point.toLowerCase().includes(q) && !lead.company.toLowerCase().includes(q)) return

        const keys = groupBy === 'company' ? [lead.company] : extractThemes([point])
        keys.forEach((key) => {
          const entry = map.get(key) || { leads: new Set<string>(), points: [] }
          entry.leads.add(lead.company)
          entry.points.push({ text: point, company: lead.company })
          map.set(key, entry)
        })
      })
    })

    return Array.from(map.entries()).sort((a, b) => b[1].points.length - a[1].points.length)
  }, [leads, groupBy, search])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ces-orange border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pain Points Glance</h1>
        <p className="text-ces-muted">See all inferred pain points across your lead pipeline.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ces-border bg-ces-card p-4">
        <div className="min-w-[240px] flex-1">
          <label className="label">Search</label>
          <Input
            placeholder="Filter by pain point or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Group By</label>
          <div className="flex rounded-lg border border-ces-border bg-white p-1">
            <button
              type="button"
              onClick={() => setGroupBy('company')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                groupBy === 'company' ? 'bg-ces-orange text-white' : 'text-ces-text hover:bg-slate-50'
              )}
            >
              <Building2 className="h-3.5 w-3.5" /> Company
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('theme')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                groupBy === 'theme' ? 'bg-ces-orange text-white' : 'text-ces-text hover:bg-slate-50'
              )}
            >
              <Tag className="h-3.5 w-3.5" /> Theme
            </button>
          </div>
        </div>
      </div>

      <p className="text-sm text-ces-muted">
        {grouped.length} group{grouped.length !== 1 ? 's' : ''} ·{' '}
        {grouped.reduce((sum, [, g]) => sum + g.points.length, 0)} pain point
        {grouped.reduce((sum, [, g]) => sum + g.points.length, 0) !== 1 ? 's' : ''}
      </p>

      <div className="grid gap-4">
        {grouped.map(([key, group]) => (
          <div key={key} className="rounded-xl border border-ces-border bg-ces-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ces-navy">{key}</h3>
              <div className="flex items-center gap-2 text-xs text-ces-muted">
                <Lightbulb className="h-3.5 w-3.5" />
                {group.points.length} point{group.points.length !== 1 ? 's' : ''} · {group.leads.size} lead
                {group.leads.size !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="space-y-2">
              {group.points.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-ces-border bg-white px-3 py-2 text-sm"
                >
                  <span>{p.text}</span>
                  {groupBy === 'theme' && (
                    <Badge variant="industry" className="shrink-0">
                      {p.company}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-xl border border-dashed border-ces-border bg-ces-card p-12 text-center">
            <p className="text-ces-muted">No pain points found. Run Intelligence on leads first.</p>
          </div>
        )}
      </div>
    </div>
  )
}
