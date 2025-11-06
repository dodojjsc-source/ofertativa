import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { normalizarTelefone } from "../_shared/phoneNormalization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[fix-phone-normalization] Iniciando correção de números...');

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem executar esta função' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse do body
    const body = await req.json();
    const { campanha_nome } = body;

    if (!campanha_nome) {
      return new Response(
        JSON.stringify({ error: 'Nome da campanha é obrigatório' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-phone-normalization] Buscando campanha: ${campanha_nome}`);

    // Buscar campanha
    const { data: campanhaData, error: campanhaError } = await supabase
      .from('campanhas')
      .select('id')
      .eq('nome', campanha_nome)
      .single();

    if (campanhaError || !campanhaData) {
      return new Response(
        JSON.stringify({ error: 'Campanha não encontrada' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const campanhaId = campanhaData.id;
    console.log(`[fix-phone-normalization] Campanha encontrada: ${campanhaId}`);

    // Buscar leads com E.164 errado (não começa com +55)
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('id, telefone, telefone_raw, e164')
      .eq('campanha_id', campanhaId)
      .not('e164', 'like', '+55%');

    if (leadsError) {
      console.error('[fix-phone-normalization] Erro ao buscar leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar leads' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-phone-normalization] Encontrados ${leadsData.length} leads com E.164 incorreto`);

    let fixed = 0;
    let failed = 0;
    const issues: string[] = [];

    // Processar cada lead
    for (const lead of leadsData) {
      try {
        // Tentar re-normalizar usando telefone_raw ou telefone atual
        const rawPhone = lead.telefone_raw || lead.telefone;
        const phoneResult = normalizarTelefone(rawPhone);

        if (phoneResult.validacao === "invalido") {
          failed++;
          issues.push(`Lead ${lead.id}: ${phoneResult.motivo_validacao}`);
          continue;
        }

        // Atualizar no banco
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            e164: phoneResult.e164,
            whatsapp_url: phoneResult.whatsapp_url,
            display_local: phoneResult.display_local,
            ddi: phoneResult.ddi,
            ddd: phoneResult.ddd,
            numero_core: phoneResult.numero_core,
            is_mobile: phoneResult.is_mobile,
            validacao: phoneResult.validacao,
            motivo_validacao: phoneResult.motivo_validacao,
            telefone: phoneResult.display_local,
            telefone_raw: rawPhone,
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        if (updateError) {
          failed++;
          issues.push(`Lead ${lead.id}: Erro ao atualizar - ${updateError.message}`);
          console.error(`[fix-phone-normalization] Erro ao atualizar lead ${lead.id}:`, updateError);
        } else {
          fixed++;
          console.log(`[fix-phone-normalization] Lead ${lead.id} corrigido: ${phoneResult.e164}`);
        }

      } catch (err) {
        failed++;
        issues.push(`Lead ${lead.id}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        console.error(`[fix-phone-normalization] Erro ao processar lead ${lead.id}:`, err);
      }
    }

    console.log(`[fix-phone-normalization] Finalizado: ${fixed} corrigidos, ${failed} falhas`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Correção finalizada para campanha "${campanha_nome}"`,
        statistics: {
          total_encontrados: leadsData.length,
          corrigidos: fixed,
          falhas: failed
        },
        issues: issues.slice(0, 10) // Limitar a 10 exemplos
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[fix-phone-normalization] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
