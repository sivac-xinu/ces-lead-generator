import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contact, DbContact } from '@/types'

const CONTACTS_QUERY_KEY = 'contacts'

function dbRowToContact(row: DbContact): Contact {
  return {
    ...row,
  }
}

export function useContacts(leadId: number | undefined) {
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, leadId],
    queryFn: async () => {
      if (!leadId) return []
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('lead_id', leadId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []).map((row: DbContact) => dbRowToContact(row))
    },
    enabled: !!leadId,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('contacts').insert(contact).select().single()
      if (error) throw error
      return dbRowToContact(data as DbContact)
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
      const { data, error } = await supabase
        .from('contacts')
        .update(contact)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return dbRowToContact(data as DbContact)
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
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw error
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
      await supabase.from('contacts').update({ is_primary: false }).eq('lead_id', lead_id)
      const { data, error } = await supabase
        .from('contacts')
        .update({ is_primary: true })
        .eq('id', contact_id)
        .select()
        .single()
      if (error) throw error
      return dbRowToContact(data as DbContact)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, vars.lead_id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
