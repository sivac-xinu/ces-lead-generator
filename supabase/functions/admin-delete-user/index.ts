import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

interface DeleteRequest {
  userId: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  let body: DeleteRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  if (!body.userId) return errorResponse('Missing userId')

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return errorResponse('Unauthorized', 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // Verify the caller is an admin.
  const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (callerError || !caller.user) return errorResponse('Unauthorized', 401)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.user.id)
    .single()
  if (profile?.role !== 'admin') return errorResponse('Forbidden', 403)

  // Delete the auth user (profiles row cascades if FK is set, otherwise clean up manually).
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(body.userId)
  if (authError) {
    return errorResponse(`Failed to delete auth user: ${authError.message}`, 500)
  }

  // Ensure the profile row is removed even without cascading FK.
  await supabaseAdmin.from('profiles').delete().eq('id', body.userId)

  return jsonResponse({ success: true })
})
