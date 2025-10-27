import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    const { leadId, keepInLeads = true } = await req.json();

    console.log('Processando lead não atendido:', leadId);

    // 1. Buscar dados completos do lead
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select(`
        *,
        campanhas:campanha_id (nome)
      `)
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error('Erro ao buscar lead:', leadError);
      throw leadError;
    }
    if (!lead) throw new Error('Lead não encontrado');

    console.log('Lead encontrado:', lead.nome);

    // 2. Check user permissions (admin, gestor of lead, or corretor owner)
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = userRole?.role === 'admin';
    const isGestor = userRole?.role === 'gestor' && lead.gestor_id === user.id;
    const isCorretor = userRole?.role === 'corretor' && lead.corretor_id === user.id;

    if (!isAdmin && !isGestor && !isCorretor) {
      console.error('Insufficient permissions for user:', user.id);
      throw new Error('You do not have permission to move this lead');
    }

    console.log('Permission granted. Moving lead...');

    // 3. Copiar para tabela nao_atendidos
    const { error: insertError } = await supabaseClient
      .from('nao_atendidos')
      .insert({
        original_lead_id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        observacao: `Não atendeu após ${lead.tentativas_contato} tentativas`,
        tentativas_contato: lead.tentativas_contato,
        flagged_by: lead.corretor_id,
        corretor_id: lead.corretor_id,
        gestor_id: lead.gestor_id,
        campanha_id: lead.campanha_id,
        campanha_nome: lead.campanhas?.nome || 'Sem campanha',
      });

    if (insertError) {
      console.error('Erro ao inserir não atendido:', insertError);
      throw insertError;
    }

    console.log('Lead copiado para nao_atendidos');

    // 4. APENAS deletar se keepInLeads for false (mantém na campanha por padrão)
    if (!keepInLeads) {
      const { error: deleteError } = await supabaseClient
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (deleteError) {
        console.error('Erro ao deletar lead:', deleteError);
        throw deleteError;
      }
      console.log('Lead deletado da tabela leads');
    } else {
      console.log('Lead mantido na tabela leads para análise da campanha');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Lead copiado para não atendidos ${keepInLeads ? 'e mantido na campanha' : ''}` 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erro ao processar não atendido:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

