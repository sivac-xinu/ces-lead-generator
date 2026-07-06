import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useCallLogs, useCreateCallLog, useDeleteCallLog } from '@/hooks/useCallLogs'
import { useLeads } from '@/hooks/useLeads'
import { useUIStore } from '@/store/uiStore'
import type { CallOutcome } from '@/types'
import { Trash2 } from 'lucide-react'

const outcomes: CallOutcome[] = ['Prospect', 'Contacted', 'Voicemail', 'Follow-up Scheduled', 'Qualified', 'Not Interested', 'Closed Won']

const statusClasses: Record<CallOutcome, string> = {
  Prospect: 'bg-slate-100 text-ces-text',
  Contacted: 'bg-blue-50 text-blue-700',
  Voicemail: 'bg-amber-50 text-amber-700',
  'Follow-up Scheduled': 'bg-purple-50 text-purple-700',
  Qualified: 'bg-green-50 text-green-700',
  'Not Interested': 'bg-red-50 text-red-700',
  'Closed Won': 'bg-ces-orange-light text-ces-navy',
}

export function CallTrackerPage() {
  const { data: leads = [] } = useLeads()
  const { data: logs = [] } = useCallLogs()
  const createLog = useCreateCallLog()
  const deleteLog = useDeleteCallLog()
  const { trackerLeadId, setTrackerLeadId, showToast } = useUIStore()

  const [leadId, setLeadId] = useState<number | ''>('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [outcome, setOutcome] = useState<CallOutcome>('Prospect')
  const [followUp, setFollowUp] = useState('')
  const [notes, setNotes] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (trackerLeadId) {
      // Sync the lead chosen via the lead card "Log a Call" action into local state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLeadId(trackerLeadId)
      setTrackerLeadId(null)
    }
  }, [trackerLeadId, setTrackerLeadId])

  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const o of outcomes) counts[o] = 0
    for (const log of logs) counts[log.outcome] = (counts[log.outcome] || 0) + 1
    return counts
  }, [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (outcomeFilter && log.outcome !== outcomeFilter) return false
      if (search && !log.company?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [logs, outcomeFilter, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadId) return
    const lead = leads.find(l => l.id === Number(leadId))
    if (!lead) return

    try {
      await createLog.mutateAsync({
        lead_id: Number(leadId),
        rep: 'CES',
        date,
        outcome,
        notes,
        next_action_date: followUp || undefined,
        follow_up: followUp || undefined,
        company: lead.company,
        contact_name: lead.contact_name,
        contact_title: lead.contact_title,
      })
      showToast('Call logged')
      setNotes('')
      setFollowUp('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to log call', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this call log?')) return
    try {
      await deleteLog.mutateAsync(id)
      showToast('Call log deleted')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Call Tracker</h1>
        <p className="text-ces-muted">Log calls, set follow-ups, and track your pipeline.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
        {outcomes.map(o => (
          <div key={o} className="card p-3 text-center">
            <div className="text-2xl font-bold text-ces-navy">{pipeline[o] || 0}</div>
            <div className="text-xs text-ces-muted">{o}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Log a Call</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Lead</label>
            <Select value={leadId} onChange={e => setLeadId(Number(e.target.value) || '')}>
              <option value="">Select lead…</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.company} — {l.contact_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Call Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Outcome</label>
            <Select value={outcome} onChange={e => setOutcome(e.target.value as CallOutcome)}>
              {outcomes.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Follow-up Date (optional)</label>
            <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What was discussed? Key objections? Next steps?"
              className="input min-h-[100px]"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" loading={createLog.isPending}>
              Save Call Log
            </Button>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}>
          <option value="">All Outcomes</option>
          {outcomes.map(o => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Search company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-ces-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Outcome</th>
              <th className="px-4 py-3 font-medium">Follow-up</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className="border-t border-ces-border">
                <td className="px-4 py-3">{log.date}</td>
                <td className="px-4 py-3 font-medium">{log.company}</td>
                <td className="px-4 py-3">{log.contact_name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[log.outcome]}`}>
                    {log.outcome}
                  </span>
                </td>
                <td className="px-4 py-3">{log.follow_up || '—'}</td>
                <td className="max-w-xs px-4 py-3">{log.notes || '—'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(log.id)}
                    className="text-red-600 hover:text-red-700"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ces-muted">
                  No calls logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
