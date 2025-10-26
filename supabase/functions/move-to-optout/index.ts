import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing opt-out request...')

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      throw new Error('Unauthorized')
    }

    console.log('User authenticated:', user.id)

    // Get request body
    const { leadId, observacao, keepInLeads = false } = await req.json()
    
    if (!leadId) {
      throw new Error('leadId is required')
    }

    console.log('Moving lead to opt-out:', leadId)

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      console.error('Lead not found:', leadError)
      throw new Error('Lead not found')
    }

    console.log('Lead found:', lead.nome)

    // Check user permissions (admin, gestor of lead, or corretor owner)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = userRole?.role === 'admin'
    const isGestor = userRole?.role === 'gestor' && lead.gestor_id === user.id
    const isCorretor = userRole?.role === 'corretor' && lead.corretor_id === user.id

    if (!isAdmin && !isGestor && !isCorretor) {
      console.error('Insufficient permissions for user:', user.id)
      throw new Error('You do not have permission to move this lead')
    }

    console.log('Permission granted. Moving lead...')

    // Insert into optout_contacts
    const { error: insertError } = await supabase
      .from('optout_contacts')
      .insert({
        original_lead_id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        campanha_id: lead.campanha_id,
        gestor_id: lead.gestor_id,
        corretor_id: lead.corretor_id,
        observacao: observacao || lead.observacao || 'Opt-out',
        flagged_by: user.id,
        flagged_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to save opt-out:', insertError)
      throw new Error('Failed to save opt-out contact')
    }

    console.log('Opt-out contact saved.')

    // APENAS deletar se keepInLeads for false (comportamento padrão mantido)
    if (!keepInLeads) {
      console.log('Deleting lead from leads table...')
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (deleteError) {
        console.error('Failed to delete lead:', deleteError)
        throw new Error('Failed to delete lead')
      }
      console.log('Lead deleted successfully')
    } else {
      console.log('Lead kept in leads table (keepInLeads=true)')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead moved to opt-out successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in move-to-optout:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})