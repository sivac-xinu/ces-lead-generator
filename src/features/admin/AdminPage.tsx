import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/types'

const PROFILES_QUERY_KEY = 'profiles'

export function AdminPage() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: [PROFILES_QUERY_KEY],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      return (data ?? []) as UserProfile[]
    },
    enabled: isAdmin,
  })

  const pending = useMemo(() => profiles.filter((p) => !p.approved), [profiles])
  const approvedUsers = useMemo(() => profiles.filter((p) => p.approved), [profiles])

  const handleApprove = async (id: string) => {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('id', id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    qc.setQueryData<UserProfile[]>(
      [PROFILES_QUERY_KEY],
      (prev) => prev?.map((p) => (p.id === id ? { ...p, approved: true } : p)) ?? []
    )
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject and remove this user?')) return
    const { error: deleteError } = await supabase.from('profiles').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    qc.setQueryData<UserProfile[]>(
      [PROFILES_QUERY_KEY],
      (prev) => prev?.filter((p) => p.id !== id) ?? []
    )
  }

  const handleRoleChange = async (id: string, role: UserRole) => {
    const { error: updateError } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    qc.setQueryData<UserProfile[]>(
      [PROFILES_QUERY_KEY],
      (prev) => prev?.map((p) => (p.id === id ? { ...p, role } : p)) ?? []
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
    const { error: deleteError } = await supabase.from('profiles').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    qc.setQueryData<UserProfile[]>(
      [PROFILES_QUERY_KEY],
      (prev) => prev?.filter((p) => p.id !== id) ?? []
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ces-orange border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-ces-muted">Manage users and roles.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pending Approval</h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ces-border bg-ces-card p-8 text-center">
            <p className="text-ces-muted">No pending users.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pending.map((profile) => (
              <UserRow
                key={profile.id}
                profile={profile}
                onApprove={handleApprove}
                onReject={handleReject}
                onRoleChange={handleRoleChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All Users</h2>
        {approvedUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ces-border bg-ces-card p-8 text-center">
            <p className="text-ces-muted">No approved users.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {approvedUsers.map((profile) => (
              <UserRow
                key={profile.id}
                profile={profile}
                onApprove={handleApprove}
                onReject={handleReject}
                onRoleChange={handleRoleChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface UserRowProps {
  profile: UserProfile
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onRoleChange: (id: string, role: UserRole) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function UserRow({ profile, onApprove, onReject, onRoleChange, onDelete }: UserRowProps) {
  return (
    <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{profile.email}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant={profile.role === 'admin' ? 'hybrid' : 'default'}>{profile.role}</Badge>
          {!profile.approved && <Badge variant="urgency">pending</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!profile.approved && (
          <>
            <Button size="sm" variant="primary" onClick={() => onApprove(profile.id)}>
              Approve
            </Button>
            <Button size="sm" variant="danger" onClick={() => onReject(profile.id)}>
              Reject
            </Button>
          </>
        )}
        <Select
          value={profile.role}
          onChange={(e) => onRoleChange(profile.id, e.target.value as UserRole)}
          className="w-auto min-w-[100px]"
          aria-label={`Change role for ${profile.email}`}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </Select>
        <Button size="sm" variant="danger" onClick={() => onDelete(profile.id)}>
          Delete
        </Button>
      </div>
    </div>
  )
}
