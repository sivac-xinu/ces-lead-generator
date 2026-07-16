import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthProvider'
import { getAuth } from '@/lib/auth'
import { displayName } from '@/utils/user'
import type { UserProfile, UserRole } from '@/types'

const PROFILES_QUERY_KEY = 'profiles'

export function AdminPage() {
  const { isAdmin, user } = useAuth()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: [PROFILES_QUERY_KEY],
    queryFn: async () => {
      return await getAuth().listProfiles()
    },
    enabled: isAdmin,
  })

  const pending = useMemo(() => profiles.filter((p) => !p.approved), [profiles])
  const approvedUsers = useMemo(() => profiles.filter((p) => p.approved), [profiles])

  const handleApprove = async (id: string) => {
    const { error: updateError } = await getAuth().updateProfile(id, { approved: true })
    if (updateError) {
      setError(updateError.message)
      return
    }
    qc.setQueryData<UserProfile[]>(
      [PROFILES_QUERY_KEY],
      (prev) => prev?.map((p) => (p.id === id ? { ...p, approved: true } : p)) ?? []
    )
  }

  const deleteUserCompletely = async (id: string) => {
    const { error } = await getAuth().deleteUser(id)
    if (error) throw new Error(error.message)
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject and remove this user?')) return
    try {
      await deleteUserCompletely(id)
      qc.setQueryData<UserProfile[]>(
        [PROFILES_QUERY_KEY],
        (prev) => prev?.filter((p) => p.id !== id) ?? []
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user')
    }
  }

  const handleRoleChange = async (id: string, role: UserRole) => {
    const { error: updateError } = await getAuth().updateProfile(id, { role })
    if (updateError) {
      setError(updateError.message)
      return
    }
    qc.setQueryData<UserProfile[]>(
      [PROFILES_QUERY_KEY],
      (prev) => prev?.map((p) => (p.id === id ? { ...p, role } : p)) ?? []
    )
  }

  const handleNameChange = async (id: string, firstName: string, lastName: string) => {
    const { error: updateError } = await getAuth().updateProfile(id, {
      first_name: firstName,
      last_name: lastName,
    })
    if (updateError) {
      setError(updateError.message)
      return
    }
    qc.setQueryData<UserProfile[]>(
      [PROFILES_QUERY_KEY],
      (prev) =>
        prev?.map((p) => (p.id === id ? { ...p, first_name: firstName, last_name: lastName } : p)) ??
        []
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
    try {
      await deleteUserCompletely(id)
      qc.setQueryData<UserProfile[]>(
        [PROFILES_QUERY_KEY],
        (prev) => prev?.filter((p) => p.id !== id) ?? []
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
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
                currentUserId={user?.id}
                onApprove={handleApprove}
                onReject={handleReject}
                onRoleChange={handleRoleChange}
                onNameChange={handleNameChange}
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
                currentUserId={user?.id}
                onApprove={handleApprove}
                onReject={handleReject}
                onRoleChange={handleRoleChange}
                onNameChange={handleNameChange}
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
  currentUserId?: string
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onRoleChange: (id: string, role: UserRole) => Promise<void>
  onNameChange: (id: string, firstName: string, lastName: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function UserRow({
  profile,
  currentUserId,
  onApprove,
  onReject,
  onRoleChange,
  onNameChange,
  onDelete,
}: UserRowProps) {
  const isSelf = profile.id === currentUserId
  const [firstName, setFirstName] = useState(profile.first_name ?? '')
  const [lastName, setLastName] = useState(profile.last_name ?? '')
  const nameDirty = firstName !== (profile.first_name ?? '') || lastName !== (profile.last_name ?? '')

  return (
    <div className="card flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1 space-y-2">
        <p className="font-medium">{displayName(profile)}</p>
        {displayName(profile) !== profile.email && (
          <p className="text-sm text-ces-muted">{profile.email}</p>
        )}
        <div className="flex items-center gap-2">
          <Badge variant={profile.role === 'admin' ? 'hybrid' : 'default'}>{profile.role}</Badge>
          {!profile.approved && <Badge variant="urgency">pending</Badge>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-label={`First name for ${profile.email}`}
          />
          <Input
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            aria-label={`Last name for ${profile.email}`}
          />
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
        <Button
          size="sm"
          onClick={() => onNameChange(profile.id, firstName, lastName)}
          disabled={!nameDirty}
        >
          Save Name
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onDelete(profile.id)}
          disabled={isSelf}
          title={isSelf ? 'You cannot delete your own account' : undefined}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
