import { cn } from '@/utils/cn'
import type { IcpOption, IntelligenceResult, Lead } from '@/types'

interface IntelligenceResultViewProps {
  result: IntelligenceResult
  lead: Lead
  selectedIcp: string | null
  onSelectIcp: (v: string) => void
  depth: 'quick' | 'deep'
}

export function IntelligenceResultView({ result, lead, selectedIcp, onSelectIcp, depth }: IntelligenceResultViewProps) {
  return (
    <div className="space-y-4 pt-2">
      <div>
        <h4 className="text-sm font-semibold text-ces-navy">ICP Suggestions</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.icp_options.map((opt: IcpOption) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelectIcp(opt.value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                selectedIcp === opt.value
                  ? 'border-ces-orange bg-ces-orange-light'
                  : 'border-ces-border bg-white hover:bg-slate-50'
              )}
            >
              <div className="font-medium">{opt.value}</div>
              <div className="text-xs text-ces-muted">
                {opt.confidence} · {opt.reasoning}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <InfoCard label="Industry" value={result.industry || lead.industry || '—'} />
        <InfoCard
          label="Employees"
          value={result.employees ? result.employees.toLocaleString() : lead.employees?.toLocaleString() || '—'}
        />
        <InfoCard label="Selected ICP" value={selectedIcp || '—'} />
        <InfoCard label="Inferred Tier" value={result.tier} />
        <InfoCard label="Inferred IT Type" value={result.it_type} />
        <InfoCard label="Research Depth" value={depth === 'deep' ? 'Deep Research' : 'Quick'} />
      </div>

      {result.enrichment && (
        <div className="space-y-3">
          <InfoBlock title="Company Context" content={result.enrichment.company_context} />
          <InfoBlock title="Key Challenges" content={result.enrichment.key_challenges} />
          <InfoBlock title="Recommended CES Approach" content={result.enrichment.recommended_approach} />
        </div>
      )}

      {result.research && (
        <div className="space-y-3 rounded-lg border border-ces-border bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-ces-navy">Sales Research Snippet</h4>
          {result.research.summary && (
            <div className="rounded-lg border border-ces-border bg-white p-3 text-sm leading-relaxed">
              <span className="font-medium text-ces-orange">At a glance:</span>{' '}
              {result.research.summary}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock title="Recent Activities" content={result.research.recent_activities} />
            <InfoBlock title="Upcoming Activities / Events" content={result.research.upcoming_activities} />
            <InfoBlock title="Key Drivers" content={result.research.key_drivers} />
            <InfoBlock title="Industry Trends" content={result.research.industry_trends} />
            <InfoBlock title="Likely Next Portfolio" content={result.research.next_portfolio} />
            <InfoBlock title="Competitors / Peers" content={result.research.competitors} />
            <InfoBlock title="Inferred Tech Stack" content={result.research.tech_stack} />
            <InfoBlock title="Decision Makers to Target" content={result.research.decision_makers} />
            <InfoBlock title="Buying Triggers" content={result.research.buying_triggers} />
          </div>
          {result.research.talking_points && (
            <InfoBlock title="Suggested Talking Points" content={result.research.talking_points} />
          )}
          {result.research.ces_entry_angle && (
            <div className="rounded-lg border border-ces-orange bg-orange-50 p-3 text-sm leading-relaxed">
              <span className="font-semibold text-ces-orange">Best CES Entry Angle:</span>{' '}
              {result.research.ces_entry_angle}
            </div>
          )}
          {result.research.ces_support && (
            <InfoBlock title="How CES Can Support" content={result.research.ces_support} />
          )}
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-ces-navy">
          Inferred Pain Points · {result.pain_points.length} identified
        </h4>
        <div className="mt-2 whitespace-pre-wrap rounded-lg border border-ces-border bg-white p-3 text-sm leading-relaxed">
          {result.pain_points.map((p, i) => (
            <div key={i} className="py-1">
              {i + 1}. {p}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ces-border bg-ces-card p-3">
      <div className="text-xs text-ces-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  )
}

function InfoBlock({ title, content }: { title: string; content?: string }) {
  if (!content) return null
  return (
    <div className="rounded-lg border border-ces-border bg-ces-card p-3">
      <div className="text-sm font-semibold text-ces-navy">{title}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ces-text">{content}</div>
    </div>
  )
}
