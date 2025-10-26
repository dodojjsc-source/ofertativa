import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter token de autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Criar cliente Supabase com credenciais de serviço
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar usuário autenticado
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Parse body
    const { leadId, observacao } = await req.json();
    
    if (!leadId) {
      throw new Error('leadId is required');
    }

    console.log('Moving lead to wrong contacts:', leadId);

    // Buscar o lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      throw new Error('Lead not found');
    }

    console.log('Lead found:', lead.nome);

    // Verificar permissão: admin, gestor do lead, ou corretor dono
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = userRole?.role === 'admin';
    const isGestor = userRole?.role === 'gestor' && lead.gestor_id === user.id;
    const isCorretor = userRole?.role === 'corretor' && lead.corretor_id === user.id;

    if (!isAdmin && !isGestor && !isCorretor) {
      throw new Error('Insufficient permissions');
    }

    console.log('Permission granted. Moving lead...');

    // Inserir na tabela contatos_errados
    const { error: insertError } = await supabase
      .from('contatos_errados')
      .insert({
        original_lead_id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        campanha_id: lead.campanha_id,
        gestor_id: lead.gestor_id,
        corretor_id: lead.corretor_id,
        reason: 'numero_errado',
        observacao: observacao || lead.observacao || 'Número errado',
        flagged_by: user.id,
        flagged_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error inserting wrong contact:', insertError);
      throw new Error('Failed to save wrong contact');
    }

    console.log('Wrong contact saved. Deleting lead...');

    // Deletar o lead da tabela leads (CASCADE cuidará dos assignments)
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (deleteError) {
      console.error('Error deleting lead:', deleteError);
      throw new Error('Failed to delete lead');
    }

    console.log('Lead deleted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead moved to wrong contacts successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in move-wrong-contact:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
