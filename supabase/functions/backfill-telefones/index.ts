import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { normalizarTelefone } from "../_shared/phoneNormalization.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Token inválido");
    }

    // Verificar role admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      throw new Error("Apenas admins podem executar backfill");
    }

    const { table = "leads", batchSize = 1000, cursor = null } = await req.json();

    console.log(`Iniciando backfill da tabela ${table}, batch ${batchSize}, cursor ${cursor}`);

    // Buscar registros sem normalização (e164 null ou vazio)
    let query = supabase
      .from(table)
      .select("*")
      .or("e164.is.null,e164.eq.")
      .limit(batchSize);

    if (cursor) {
      query = query.gt("id", cursor);
    }

    const { data: records, error: fetchError } = await query;

    if (fetchError) {
      console.error("Erro ao buscar registros:", fetchError);
      throw fetchError;
    }

    let ok = 0, incompleto = 0, invalido = 0;
    const issues: any[] = [];

    console.log(`Processando ${records?.length || 0} registros...`);

    // Normalizar e atualizar
    for (const record of records || []) {
      const telefoneParaNormalizar = record.telefone_raw || record.telefone;
      
      if (!telefoneParaNormalizar) {
        invalido++;
        issues.push({ id: record.id, motivo: "Telefone vazio" });
        continue;
      }

      const result = normalizarTelefone(telefoneParaNormalizar);

      const { error: updateError } = await supabase
        .from(table)
        .update({
          telefone_raw: telefoneParaNormalizar,
          ddi: result.ddi,
          ddd: result.ddd,
          numero_core: result.numero_core,
          is_mobile: result.is_mobile,
          e164: result.e164,
          display_local: result.display_local,
          whatsapp_url: result.whatsapp_url,
          validacao: result.validacao,
          motivo_validacao: result.motivo_validacao,
        })
        .eq("id", record.id);

      if (updateError) {
        console.error(`Erro ao atualizar ${record.id}:`, updateError);
        invalido++;
        if (issues.length < 50) {
          issues.push({ id: record.id, motivo: updateError.message });
        }
        continue;
      }

      if (result.validacao === "ok") ok++;
      else if (result.validacao === "incompleto") {
        incompleto++;
        if (issues.length < 50) {
          issues.push({ id: record.id, motivo: result.motivo_validacao });
        }
      } else {
        invalido++;
        if (issues.length < 50) {
          issues.push({ id: record.id, motivo: result.motivo_validacao });
        }
      }
    }

    const nextCursor = records && records.length === batchSize 
      ? records[records.length - 1].id 
      : null;

    console.log(`Lote concluído: ${ok} OK, ${incompleto} incompletos, ${invalido} inválidos`);

    return new Response(
      JSON.stringify({
        processed: records?.length || 0,
        ok,
        incompleto,
        invalido,
        nextCursor,
        issues,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro no backfill:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
