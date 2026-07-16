import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDB } from '@/lib/db'
import type { Contact, Lead } from '@/types'

const LEADS_QUERY_KEY = 'leads'
const CONTACTS_QUERY_KEY = 'contacts'

export function useLeads() {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await getDB().leads.findAll()
      if (error) throw new Error(error)
      return data ?? []
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
      const { data: newLead, error } = await getDB().leads.create(leadOnly)
      if (error) throw new Error(error)

      const contactsToCreate =
        contacts && contacts.length > 0
          ? contacts
          : leadOnly.contact_name
            ? [
                {
                  lead_id: newLead!.id,
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
        for (const c of contactsToCreate) {
          await getDB().contacts.create({ ...c, lead_id: newLead!.id })
        }
      }

      return newLead!
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
      const { data, error } = await getDB().leads.update(id, lead)
      if (error) throw new Error(error)
      return data!
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
      const { error } = await getDB().leads.delete(id)
      if (error) throw new Error(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }),
  })
}
