import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { runAIIntelligence } from '@/lib/ai'
import { cn } from '@/utils/cn'
import { deepInferAll } from '@/data/inference'
import { useUpdateLead } from '@/hooks/useLeads'
import { useUIStore } from '@/store/uiStore'
import { AISettingsModal } from './AISettingsModal'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAISettings } from '@/hooks/useAISettings'
import { ContactsPanel } from '@/features/contacts/ContactsPanel'
import { useContacts } from '@/hooks/useContacts'
import type { AIProvider, Contact, IcpOption, IntelligenceResult, Lead } from '@/types'

interface IntelligenceModalProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
}

const PROVIDERS: { key: AIProvider; label: string; models: string[] }[] = [
  { key: 'local', label: 'Local Rules', models: ['rules'] },
  { key: 'openrouter', label: 'OpenRouter', models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-4-26b-a4b-it:free'] },
  { key: 'openai', label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o'] },
  { key: 'anthropic', label: 'Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
]

export function IntelligenceModal({ lead, open, onClose }: IntelligenceModalProps) {
  const [provider, setProvider] = useState<AIProvider>('local')
  const [model, setModel] = useState('rules')
  const [depth, setDepth] = useState<'quick' | 'deep'>('deep')
  const [result, setResult] = useState<IntelligenceResult | null>(null)
  const [selectedIcp, setSelectedIcp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)
  const [fallbackReason, setFallbackReason] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const updateLead = useUpdateLead()
  const { showToast } = useUIStore()
  const { isAdmin } = useAuth()
  const { data: adminKeys } = useAISettings()
  const { data: contacts = [] } = useContacts(lead?.id)
  function getAdminKey(p: AIProvider): string | undefined {
    if (!adminKeys) return undefined
    if (p === 'openrouter') return adminKeys.openrouter_key
    if (p === 'openai') return adminKeys.openai_key
    if (p === 'anthropic') return adminKeys.anthropic_key
    return undefined
  }
  const hasKey = provider === 'local' || !!getAdminKey(provider)

  if (!lead) return null

  const activeContact = selectedContact || contacts.find((c) => c.is_primary) || contacts[0] || null

  const run = async () => {
    setLoading(true)
    setUsedFallback(false)
    setFallbackReason(null)
    try {
      let res: IntelligenceResult
      let fallback = false
      let reason: string | null = null
      if (provider === 'local') {
        res = deepInferAll(lead)
      } else {
        const aiLead = activeContact
          ? {
              ...lead,
              contact_name: activeContact.name,
              contact_title: activeContact.title ?? lead.contact_title,
              contact_email: activeContact.email ?? lead.contact_email,
              contact_phone: activeContact.phone ?? lead.contact_phone,
            }
          : lead
        const aiRes = await runAIIntelligence(provider, model, depth, aiLead)
        res = aiRes.result
        fallback = aiRes.fallback
        if (aiRes.notDeployed) {
          reason = 'not-deployed'
        } else if (aiRes.errorMessage) {
          reason = aiRes.errorMessage
        }
      }
      setResult(res)
      setUsedFallback(fallback)
      setFallbackReason(reason)
      setSelectedIcp(res.icp || res.icp_options[0]?.value || null)
      if (fallback) {
        showToast(
          reason === 'not-deployed'
            ? 'AI proxy is not deployed — returned local-rule results instead.'
            : `AI provider error — returned local-rule results instead: ${reason}`,
          'error'
        )
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI analysis failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const applyAll = async () => {
    if (!result) return
    await updateLead.mutateAsync({
      id: lead.id,
      icp: selectedIcp || result.icp,
      tier: result.tier,
      it_type: result.it_type,
      pain_points: result.pain_points,
    })
    showToast(`Intelligence applied to ${lead.company}`)
    onClose()
  }

  const applyPainPoints = async () => {
    if (!result) return
    await updateLead.mutateAsync({ id: lead.id, pain_points: result.pain_points })
    showToast('Pain points updated')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lead Intelligence"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Close</Button>
          {result && (
            <>
              <Button variant="secondary" onClick={applyPainPoints} loading={updateLead.isPending}>
                Apply Pain Points Only
              </Button>
              <Button variant="primary" onClick={applyAll} loading={updateLead.isPending}>
                Apply All to Lead
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ces-navy">
              {lead.company} — {lead.contact_name}
            </p>
            {lead.imported_by && (
              <p className="text-xs text-ces-muted">Imported by {lead.imported_by}</p>
            )}
          </div>
          <Badge variant="industry">{provider === 'local' ? 'Local Rules' : `${provider} AI`}</Badge>
        </div>

        <ContactsPanel leadId={lead.id} />

        {contacts.length > 0 && (
          <div>
            <label className="label">Analyze Contact</label>
            <select
              className="select"
              value={activeContact?.id ?? ''}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10)
                setSelectedContact(contacts.find((c) => c.id === id) || null)
              }}
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.title ? `(${c.title})` : ''} {c.is_primary ? '— Primary' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Provider</label>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="text-xs text-ces-orange hover:underline"
              >
                AI Settings
              </button>
            </div>
            <select
              className="select"
              value={provider}
              onChange={e => {
                const p = e.target.value as AIProvider
                setProvider(p)
                setModel(PROVIDERS.find(x => x.key === p)?.models[0] || '')
              }}
            >
              {PROVIDERS.map(p => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {provider !== 'local' && (
            <>
              <div>
                <label className="label">Model</label>
                <select className="select" value={model} onChange={e => setModel(e.target.value)}>
                  {PROVIDERS.find(p => p.key === provider)?.models.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Depth</label>
                <select className="select" value={depth} onChange={e => setDepth(e.target.value as 'quick' | 'deep')}>
                  <option value="quick">Quick</option>
                  <option value="deep">Deep</option>
                </select>
              </div>
            </>
          )}
        </div>

        {provider !== 'local' && !hasKey && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No {provider} API key configured.{' '}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="font-medium text-ces-orange hover:underline"
              >
                Add key in AI Settings
              </button>
            ) : (
              'Ask an admin to add it in Settings → AI Engine.'
            )}{' '}
            A server-side Supabase secret also works if available.
          </div>
        )}

        {provider === 'openrouter' && model.endsWith(':free') && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <p className="font-medium">Free OpenRouter models are often rate-limited</p>
            <p className="mt-1">
              If you see a rate-limit error, wait a few seconds and retry, add a small credit
              balance at{' '}
              <a
                href="https://openrouter.ai/settings"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                openrouter.ai/settings
              </a>
              , or switch to a non-free model.
            </p>
          </div>
        )}

        <Button variant="primary" onClick={run} loading={loading} className="w-full">
          {loading ? 'Analyzing...' : 'Run Intelligence'}
        </Button>

        {usedFallback && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {fallbackReason === 'not-deployed' ? (
              <>
                <p className="font-medium">AI proxy Edge Function is not deployed</p>
                <p className="mt-1">
                  Adding an API key is not enough — the <code>ai-proxy</code> function code must also
                  be deployed to your Supabase project. Results were generated with Local Rules instead.
                </p>
                <p className="mt-2 font-medium">Run these commands from the project folder:</p>
                <pre className="mt-2 overflow-x-auto rounded bg-amber-100 p-2 text-xs">
{`npx supabase login
npx supabase functions deploy ai-proxy`}
                </pre>
              </>
            ) : (
              <>
                <p className="font-medium">AI provider error</p>
                <p className="mt-1">
                  Results were generated with Local Rules instead. Error: {fallbackReason}
                </p>
              </>
            )}
            <p className="mt-2">
              Or switch to <strong>Local Rules</strong> to avoid this warning.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-4 pt-2">
            <div>
              <h4 className="text-sm font-semibold text-ces-navy">ICP Suggestions</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.icp_options.map((opt: IcpOption) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedIcp(opt.value)}
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

            <div className="grid grid-cols-4 gap-3">
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
        )}
      </div>
      <AISettingsModal key={settingsOpen ? 'open' : 'closed'} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Modal>
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

function InfoBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-lg border border-ces-border bg-ces-card p-3">
      <div className="text-sm font-semibold text-ces-navy">{title}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ces-text">{content}</div>
    </div>
  )
}
