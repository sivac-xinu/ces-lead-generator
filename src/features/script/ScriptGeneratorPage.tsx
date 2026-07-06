import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useLeads } from '@/hooks/useLeads'
import { useSolutions } from '@/hooks/useSolutions'
import { useUIStore } from '@/store/uiStore'
import { TONES } from '@/data/tones'
import { matchSolutions } from '@/data/solutions'
import { OBJECTIONS } from '@/data/objections'
import { buildScript, downloadScript, getTalkingPoints } from '@/utils/script'
import type { ToneKey } from '@/types'
import { Copy, Download, Phone } from 'lucide-react'

export function ScriptGeneratorPage() {
  const navigate = useNavigate()
  const { data: leads = [] } = useLeads()
  useSolutions()
  const { scriptLeadId, setScriptLeadId, showToast } = useUIStore()
  const [selectedLeadId, setSelectedLeadId] = useState<number | ''>('')
  const [activeTone, setActiveTone] = useState<ToneKey>('consultative')
  const [showObjections, setShowObjections] = useState(false)

  useEffect(() => {
    if (scriptLeadId) {
      // Sync the lead chosen via the lead card "Script" action into local state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedLeadId(scriptLeadId)
      setScriptLeadId(null)
    }
  }, [scriptLeadId, setScriptLeadId])

  const lead = useMemo(() => leads.find(l => l.id === Number(selectedLeadId)), [leads, selectedLeadId])
  const matchedSolutions = useMemo(() => (lead ? lead.pain_points.flatMap(p => matchSolutions(p)) : []), [lead])
  const uniqueSolutions = useMemo(
    () => matchedSolutions.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i),
    [matchedSolutions]
  )
  const script = useMemo(() => (lead ? buildScript(lead, TONES[activeTone], uniqueSolutions) : []), [lead, activeTone, uniqueSolutions])
  const talkingPoints = useMemo(() => (lead ? getTalkingPoints(lead, uniqueSolutions) : []), [lead, uniqueSolutions])

  const copyToClipboard = async () => {
    const text = script.map(s => `${s.section}\n${s.text}`).join('\n\n')
    await navigator.clipboard.writeText(text)
    showToast('Script copied to clipboard')
  }

  if (!leads.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Script Generator</h1>
        <p className="text-ces-muted">No leads available. Add or import leads first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Script Generator</h1>
        <p className="text-ces-muted">Select a lead and tone to generate a tailored cold call script.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="card space-y-4">
            <div>
              <label className="label">Select Lead</label>
              <Select value={selectedLeadId} onChange={e => setSelectedLeadId(Number(e.target.value) || '')}>
                <option value="">Choose a lead…</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.company} — {l.contact_name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="label">Call Tone</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(Object.keys(TONES) as ToneKey[]).map(key => {
                  const tone = TONES[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTone(key)}
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                        activeTone === key
                          ? 'border-ces-orange bg-ces-orange-light'
                          : 'border-ces-border bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium">{tone.label}</div>
                      <div className="text-xs text-ces-muted">{tone.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {lead && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => downloadScript(lead, TONES[activeTone].label, script)}>
                  <Download className="h-4 w-4" /> Download Script
                </Button>
                <Button onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" /> Copy to Clipboard
                </Button>
                <Button onClick={() => navigate('/tracker')}>
                  <Phone className="h-4 w-4" /> Log a Call
                </Button>
              </div>

              <div className="space-y-4">
                {script.map((section, i) => (
                  <div key={i} className="card">
                    <h3 className="text-sm font-semibold text-ces-navy">{section.section}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{section.text}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowObjections(!showObjections)}
                className="w-full rounded-lg border border-ces-border bg-white px-4 py-3 text-left text-sm font-medium hover:bg-slate-50"
              >
                {showObjections ? 'Hide' : 'Show'} Common Objections
              </button>

              {showObjections && (
                <div className="space-y-3">
                  {OBJECTIONS.map((obj, i) => (
                    <div key={i} className="card">
                      <h4 className="text-sm font-semibold">{obj.q}</h4>
                      <p className="mt-1 text-sm text-ces-muted">
                        {obj.responses[activeTone]}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {lead && (
          <div className="space-y-6">
            <div className="card sticky top-6">
              <h3 className="text-sm font-semibold text-ces-navy">Pain Points → CES Solutions</h3>
              <div className="mt-3 space-y-3">
                {uniqueSolutions.slice(0, 4).map(sol => (
                  <div key={sol.id} className="rounded-lg border border-ces-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{sol.service}</span>
                      <Badge variant="urgency">{sol.urgency}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ces-muted">{sol.pitch}</p>
                  </div>
                ))}
                {uniqueSolutions.length === 0 && <p className="text-sm text-ces-muted">No specific solutions matched.</p>}
              </div>

              <h3 className="mt-6 text-sm font-semibold text-ces-navy">Key Talking Points</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ces-muted">
                {talkingPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
