import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  useCreateSolution,
  useDeleteSolution,
  useSolutions,
  useUpdateSolution,
} from '@/hooks/useSolutions'
import type { Solution } from '@/types'

const URGENCY_OPTIONS: Solution['urgency'][] = ['critical', 'high', 'medium']

const emptyForm: Omit<Solution, 'id' | 'created_at'> = {
  service: '',
  urgency: 'medium',
  icon: '',
  keywords: [],
  trend: '',
  buySignal: '',
  pitch: '',
  stat: '',
}

export function SolutionsPage() {
  const { isAdmin } = useAuth()
  const { data: solutions = [], isLoading } = useSolutions()
  const createSolution = useCreateSolution()
  const updateSolution = useUpdateSolution()
  const deleteSolution = useDeleteSolution()

  const [search, setSearch] = useState('')
  const [urgency, setUrgency] = useState<Solution['urgency'] | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Solution | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return solutions.filter((s) => {
      if (urgency && s.urgency !== urgency) return false
      if (q) {
        const match =
          s.service.toLowerCase().includes(q) ||
          s.trend.toLowerCase().includes(q) ||
          s.buySignal.toLowerCase().includes(q) ||
          s.pitch.toLowerCase().includes(q) ||
          s.stat.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [solutions, search, urgency])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (solution: Solution) => {
    setEditing(solution)
    setForm({
      service: solution.service,
      urgency: solution.urgency,
      icon: solution.icon,
      keywords: solution.keywords,
      trend: solution.trend,
      buySignal: solution.buySignal,
      pitch: solution.pitch,
      stat: solution.stat,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await updateSolution.mutateAsync({ id: editing.id, ...form })
      } else {
        await createSolution.mutateAsync(form)
      }
      closeModal()
    } catch (err) {
      console.error('Failed to save solution', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this solution?')) return
    try {
      await deleteSolution.mutateAsync(id)
    } catch (err) {
      console.error('Failed to delete solution', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ces-orange border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solutions Catalog</h1>
          <p className="text-ces-muted">Browse CES service offerings and positioning.</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={openCreate}>
            Add Solution
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ces-border bg-ces-card p-4">
        <div className="min-w-[200px] flex-1">
          <label className="label">Search</label>
          <Input
            placeholder="Service, keyword, or trend…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="urgency-filter" className="label">
            Urgency
          </label>
          <Select
            id="urgency-filter"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as Solution['urgency'] | '')}
          >
            <option value="">All urgency</option>
            {URGENCY_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch('')
            setUrgency('')
          }}
        >
          Clear
        </Button>
      </div>

      <p className="text-sm text-ces-muted">
        {filtered.length} solution{filtered.length !== 1 ? 's' : ''} found
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((solution) => (
          <SolutionCard
            key={solution.id}
            solution={solution}
            isAdmin={isAdmin}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-ces-border bg-ces-card p-12 text-center">
            <p className="text-ces-muted">No solutions match your filters.</p>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Solution' : 'Add Solution'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={createSolution.isPending || updateSolution.isPending}
            >
              {editing ? 'Save Changes' : 'Create Solution'}
            </Button>
          </div>
        }
      >
        <form id="solution-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="service-name" className="label">
              Service Name
            </label>
            <Input
              id="service-name"
              value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Urgency</label>
            <Select
              value={form.urgency}
              onChange={(e) =>
                setForm((f) => ({ ...f, urgency: e.target.value as Solution['urgency'] }))
              }
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Icon (emoji)</label>
            <Input
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="e.g. 🚀"
            />
          </div>
          <div>
            <label className="label">Keywords</label>
            <Input
              value={form.keywords.join(', ')}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  keywords: e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="cloud, cost, ai"
            />
          </div>
          <div>
            <label className="label">Trend</label>
            <Input
              value={form.trend}
              onChange={(e) => setForm((f) => ({ ...f, trend: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Buy Signal</label>
            <Input
              value={form.buySignal}
              onChange={(e) => setForm((f) => ({ ...f, buySignal: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Pitch</label>
            <textarea
              value={form.pitch}
              onChange={(e) => setForm((f) => ({ ...f, pitch: e.target.value }))}
              className="input min-h-[100px] resize-y"
            />
          </div>
          <div>
            <label className="label">Stat</label>
            <Input
              value={form.stat}
              onChange={(e) => setForm((f) => ({ ...f, stat: e.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}

interface SolutionCardProps {
  solution: Solution
  isAdmin: boolean
  onEdit: (solution: Solution) => void
  onDelete: (id: string) => void
}

function SolutionCard({ solution, isAdmin, onEdit, onDelete }: SolutionCardProps) {
  const urgencyColor: Record<Solution['urgency'], string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="card flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {solution.icon && <span className="text-2xl">{solution.icon}</span>}
          <h3 className="text-base font-semibold leading-tight">{solution.service}</h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${urgencyColor[solution.urgency]}`}
        >
          {solution.urgency}
        </span>
      </div>

      <div className="mt-3 space-y-3 text-sm">
        <p>
          <span className="font-medium text-ces-navy">Trend:</span>{' '}
          <span className="text-ces-muted">{solution.trend}</span>
        </p>
        <p>
          <span className="font-medium text-ces-navy">Buy signal:</span>{' '}
          <span className="text-ces-muted">{solution.buySignal}</span>
        </p>
        <p>
          <span className="font-medium text-ces-navy">Pitch:</span>{' '}
          <span className="text-ces-muted">{solution.pitch}</span>
        </p>
        <p>
          <span className="font-medium text-ces-navy">Stat:</span>{' '}
          <span className="text-ces-muted">{solution.stat}</span>
        </p>
      </div>

      {isAdmin && (
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Button size="sm" onClick={() => onEdit(solution)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(solution.id)}>
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}
