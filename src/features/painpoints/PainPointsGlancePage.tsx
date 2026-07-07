import { useMemo, useState } from 'react'
import { useLeads } from '@/hooks/useLeads'
import {
  usePainPointCatalog,
  useCreatePainPoint,
  useUpdatePainPoint,
  useDeletePainPoint,
  type PainPointCatalogItem,
} from '@/hooks/usePainPointCatalog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { detectTheme } from '@/data/inference'
import { Lightbulb, Building2, Tag, Plus, Pencil, Trash2, AlertCircle, User } from 'lucide-react'

type GroupMode = 'company' | 'theme'
type SourceFilter = 'all' | 'leads' | 'manual'

const THEMES = ['Cloud', 'Security', 'Data', 'Infrastructure', 'AI', 'Operations', 'Talent', 'General']

interface UnifiedPainPoint {
  text: string
  source: 'lead' | 'manual'
  company?: string
  theme: string
  tags: string[]
  catalogItem?: PainPointCatalogItem
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function PainPointsGlancePage() {
  const { data: leads = [], isLoading: leadsLoading } = useLeads()
  const {
    data: catalog = [],
    isLoading: catalogLoading,
    error: catalogError,
  } = usePainPointCatalog()
  const createItem = useCreatePainPoint()
  const updateItem = useUpdatePainPoint()
  const deleteItem = useDeletePainPoint()

  const [groupBy, setGroupBy] = useState<GroupMode>('company')
  const [source, setSource] = useState<SourceFilter>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PainPointCatalogItem | null>(null)
  const [form, setForm] = useState({ text: '', theme: 'General', tags: '' })

  const isLoading = leadsLoading || catalogLoading

  const allItems = useMemo<UnifiedPainPoint[]>(() => {
    const items: UnifiedPainPoint[] = []

    if (source !== 'manual') {
      leads.forEach((lead) => {
        lead.pain_points?.forEach((point) => {
          items.push({
            text: point,
            source: 'lead',
            company: lead.company,
            theme: detectTheme(point),
            tags: [],
          })
        })
      })
    }

    if (source !== 'leads') {
      catalog.forEach((item) => {
        items.push({
          text: item.text,
          source: 'manual',
          theme: item.theme || 'General',
          tags: item.tags || [],
          catalogItem: item,
        })
      })
    }

    return items
  }, [leads, catalog, source])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allItems
    return allItems.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        (item.company && item.company.toLowerCase().includes(q)) ||
        item.theme.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [allItems, search])

  const grouped = useMemo(() => {
    const map = new Map<string, { items: UnifiedPainPoint[]; leadCount: number; manualCount: number }>()

    filtered.forEach((item) => {
      const keys =
        groupBy === 'company'
          ? [item.source === 'manual' ? 'Manual Library' : (item.company || 'Unknown Company')]
          : [item.theme || 'General']

      keys.forEach((key) => {
        const entry = map.get(key) || { items: [], leadCount: 0, manualCount: 0 }
        entry.items.push(item)
        if (item.source === 'lead') entry.leadCount += 1
        else entry.manualCount += 1
        map.set(key, entry)
      })
    })

    return Array.from(map.entries()).sort((a, b) => b[1].items.length - a[1].items.length)
  }, [filtered, groupBy])

  const openCreate = () => {
    setEditing(null)
    setForm({ text: '', theme: 'General', tags: '' })
    setModalOpen(true)
  }

  const openEdit = (item: PainPointCatalogItem) => {
    setEditing(item)
    setForm({ text: item.text, theme: item.theme || 'General', tags: item.tags?.join(', ') ?? '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      text: form.text.trim(),
      theme: form.theme,
      tags: parseTags(form.tags),
      active: true,
    }
    if (!payload.text) return

    if (editing) {
      await updateItem.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createItem.mutateAsync(payload)
    }
    setModalOpen(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this pain point?')) return
    await deleteItem.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ces-orange border-t-transparent" />
      </div>
    )
  }

  const tableMissing = catalogError instanceof Error && catalogError.message?.includes('does not exist')
  const totalLeadPoints = allItems.filter((i) => i.source === 'lead').length
  const totalManualPoints = allItems.filter((i) => i.source === 'manual').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pain Points Glance</h1>
          <p className="text-ces-muted">
            All inferred and manual pain points across your pipeline. Add or edit manual entries on the fly.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Pain Point
        </Button>
      </div>

      {tableMissing && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Manual pain point table not found</p>
            <p className="mt-1">Run this SQL in the Supabase SQL Editor to enable manual entries:</p>
            <pre className="mt-2 overflow-x-auto rounded bg-amber-100 p-2 text-xs">
{`create table if not exists public.pain_point_catalog (
  id bigint generated by default as identity primary key,
  text text not null,
  theme text not null default 'General',
  tags text[] default array[]::text[],
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table public.pain_point_catalog enable row level security;

create policy "Allow all" on public.pain_point_catalog
  for all using (true) with check (true);`}
            </pre>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ces-border bg-ces-card p-4">
        <div className="min-w-[220px] flex-1">
          <label className="label">Search</label>
          <Input
            placeholder="Filter by pain point, company, theme, or tag…"
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
        <div>
          <label className="label">Source</label>
          <div className="flex rounded-lg border border-ces-border bg-white p-1">
            {(['all', 'leads', 'manual'] as SourceFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSource(key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  source === key ? 'bg-ces-navy text-white' : 'text-ces-text hover:bg-slate-50'
                )}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-ces-muted">
        {grouped.length} group{grouped.length !== 1 ? 's' : ''} · {filtered.length} pain point
        {filtered.length !== 1 ? 's' : ''} ({totalLeadPoints} from leads, {totalManualPoints} manual)
      </p>

      <div className="grid gap-4">
        {grouped.map(([key, group]) => (
          <div key={key} className="rounded-xl border border-ces-border bg-ces-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ces-navy">{key}</h3>
              <div className="flex items-center gap-2 text-xs text-ces-muted">
                <Lightbulb className="h-3.5 w-3.5" />
                {group.items.length} point{group.items.length !== 1 ? 's' : ''}
                {group.leadCount > 0 && group.manualCount > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {group.leadCount} lead · {group.manualCount} manual
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {group.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-ces-border bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{item.text}</span>
                      {item.source === 'manual' ? (
                        <Badge variant="default" className="shrink-0">
                          <User className="mr-1 h-3 w-3" /> Manual
                        </Badge>
                      ) : (
                        <Badge variant="industry" className="shrink-0">
                          Lead
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {groupBy === 'theme' && item.source === 'lead' && item.company && (
                        <Badge variant="industry">{item.company}</Badge>
                      )}
                      <Badge variant="default">{item.theme}</Badge>
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="default">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {item.source === 'manual' && item.catalogItem && (
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(item.catalogItem!)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(item.catalogItem!.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-xl border border-dashed border-ces-border bg-ces-card p-12 text-center">
            <p className="text-ces-muted">
              No pain points found. Run Intelligence on leads or add manual entries.
            </p>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Pain Point' : 'Add Pain Point'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={createItem.isPending || updateItem.isPending}
              disabled={!form.text.trim()}
            >
              {editing ? 'Save Changes' : 'Add to Library'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Pain Point Text</label>
            <Input
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="e.g. Legacy systems block modern API-first integrations"
            />
          </div>
          <div>
            <label className="label">Theme</label>
            <select
              className="select"
              value={form.theme}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
            >
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. legacy, api, integration"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
