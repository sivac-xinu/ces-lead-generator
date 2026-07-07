import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { dbRowToLead, leadToDbRow } from '@/utils/lead'
import type { Contact, DbLead, Lead } from '@/types'

const LEADS_QUERY_KEY = 'leads'
const CONTACTS_QUERY_KEY = 'contacts'

export function useLeads() {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((row: DbLead) => dbRowToLead(row))
    },
  })
}

export type CreateLeadInput = Omit<Partial<Lead>, 'contacts'> & {
  contacts?: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'lead_id'>[]
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lead: CreateLeadInput) => {
      const { contacts, ...leadOnly } = lead
      const { data, error } = await supabase.from('leads').insert(leadToDbRow(leadOnly)).select().single()
      if (error) throw error
      const newLead = dbRowToLead(data as DbLead)

      const contactsToCreate =
        contacts && contacts.length > 0
          ? contacts
          : leadOnly.contact_name
            ? [
                {
                  lead_id: newLead.id,
                  name: leadOnly.contact_name,
                  title: leadOnly.contact_title,
                  email: leadOnly.contact_email,
                  phone: leadOnly.contact_phone,
                  is_primary: true,
                  source: leadOnly.imported_by ? String(leadOnly.imported_by) : 'Manual',
                },
              ]
            : []

      if (contactsToCreate.length > 0) {
        const { error: contactError } = await supabase
          .from('contacts')
          .insert(contactsToCreate.map(c => ({ ...c, lead_id: newLead.id })))
        if (contactError) throw contactError
      }

      return newLead
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] })
      qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, data.id] })
    },
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...lead }: Partial<Lead> & { id: number }) => {
      const { data, error } = await supabase.from('leads').update(leadToDbRow(lead)).eq('id', id).select().single()
      if (error) throw error
      return dbRowToLead(data as DbLead)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] })
      qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY, vars.id] })
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }),
  })
}
