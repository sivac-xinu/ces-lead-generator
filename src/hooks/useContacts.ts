import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDB } from '@/lib/db'
import type { Contact } from '@/types'

const CONTACTS_QUERY_KEY = 'contacts'

export function useContacts(leadId: number | undefined) {
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, leadId],
    queryFn: async () => {
      if (!leadId) return []
      const { data, error } = await getDB().contacts.findByLeadId(leadId)
      if (error) throw new Error(error)
      return data ?? []
    },
    enabled: !!leadId,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await getDB().contacts.create(contact)
      if (error) throw new Error(error)
      return data!
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, vars.lead_id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, lead_id: _lead_id, ...contact }: Partial<Contact> & { id: number; lead_id: number }) => {
      const { data, error } = await getDB().contacts.update(id, contact)
      if (error) throw new Error(error)
      return data!
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, vars.lead_id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, lead_id: _lead_id }: { id: number; lead_id: number }) => {
      const { error } = await getDB().contacts.delete(id)
      if (error) throw new Error(error)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, vars.lead_id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useSetPrimaryContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lead_id, contact_id }: { lead_id: number; contact_id: number }) => {
      const { error } = await getDB().contacts.setPrimary(lead_id, contact_id)
      if (error) throw new Error(error)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, vars.lead_id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
