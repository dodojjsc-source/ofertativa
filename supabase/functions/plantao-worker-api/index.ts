// Edge function: API do worker de disparo (chamada pelo Python no VPS)
// Auth: header x-admin-token
//
// Endpoints (POST):
//   /plantao-worker-api/next         { plantao_id } -> { lead, copy } | { lead: null }
//   /plantao-worker-api/mark-sent    { fila_id, evolution_msg_id, copy_id }
//   /plantao-worker-api/mark-failed  { fila_id, motivo }
//   /plantao-worker-api/log-event    { plantao_id, fila_id, evento, evolution_msg_id, payload }
//   /plantao-worker-api/save-resposta { plantao_id, telefone, mensagem, payload } -> { id, classificacao }
//   /plantao-worker-api/list-active  -> { plantoes: [...] }
//   /plantao-worker-api/recalc-stats { plantao_id }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_API_TOKEN")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

const headers = {
  ...corsHeaders,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function normTelefone(t: string): string {
  let d = String(t).replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length === 12) d = d.slice(0, 4) + "9" + d.slice(4);
  return d;
}

const CLASSIFY_SYSTEM = `Você classifica respostas WhatsApp a uma oferta imobiliária.

Classes:
- interessado: pediu informação, valor, planta, condição, demonstrou interesse claro, perguntou sobre o produto
- frio: respondeu de forma educada mas sem ação ("obrigado", "depois vejo", "talvez", "mais tarde")
- optout: pediu pra parar/sair/descadastrar, reclamou de receber a mensagem, hostil
- outro: bate-papo sem intenção clara, perguntou "quem é vc", "como conseguiu meu número", mensagem ambígua

Retorne JSON: {"classificacao": "<classe>", "motivo": "<frase curta>", "score": <0 a 1>}`;

async function classifyMessage(mensagem: string): Promise<{ classificacao: string; motivo: string; score: number }> {
  if (!GEMINI_API_KEY) return { classificacao: "pendente", motivo: "sem GEMINI_API_KEY", score: 0 };
  const m = mensagem.trim();
  // Heurística rápida pra opt-out (não gasta Gemini)
  if (/^(sair|parar|stop|descadastrar?|nao|não|chega)$/i.test(m)) {
    return { classificacao: "optout", motivo: "match exato termo opt-out", score: 1 };
  }
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: CLASSIFY_SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: `Mensagem do cliente:\n"${m}"` }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                classificacao: { type: "STRING", enum: ["interessado", "frio", "optout", "outro"] },
                motivo: { type: "STRING" },
                score: { type: "NUMBER" },
              },
              required: ["classificacao", "motivo", "score"],
            },
          },
        }),
      },
    );
    if (!resp.ok) return { classificacao: "pendente", motivo: "gemini erro " + resp.status, score: 0 };
    const data = await resp.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const p = JSON.parse(txt);
    return {
      classificacao: ["interessado", "frio", "optout", "outro"].includes(p.classificacao) ? p.classificacao : "outro",
      motivo: String(p.motivo || ""),
      score: typeof p.score === "number" ? p.score : 0.5,
    };
  } catch (e) {
    return { classificacao: "pendente", motivo: "exception", score: 0 };
  }
}

function dentroJanela(janelas: any[], now: Date): boolean {
  const diaMap = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const dia = diaMap[now.getDay()];
  const hhmm = now.toTimeString().slice(0, 5);
  for (const j of janelas || []) {
    if (j.dia === dia && hhmm >= j.inicio && hhmm <= j.fim) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });

  const token = req.headers.get("x-admin-token");
  if (!token || !ADMIN_TOKEN || token !== ADMIN_TOKEN) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const action = url.pathname.split("/").filter(Boolean).pop();

  let body: any = {};
  if (req.method !== "GET") {
    try { body = await req.json(); } catch { /* */ }
  }

  try {
    switch (action) {
      case "list-active": {
        const { data, error } = await admin.from("disparo_plantoes").select("*").eq("status", "ativo");
        if (error) throw error;
        return json({ plantoes: data });
      }

      case "next": {
        const { plantao_id } = body;
        if (!plantao_id) return json({ error: "plantao_id required" }, 400);

        const { data: p, error: ep } = await admin.from("disparo_plantoes").select("*").eq("id", plantao_id).single();
        if (ep) throw ep;
        if (p.status !== "ativo") return json({ lead: null, motivo: "plantao_nao_ativo" });

        // Checar janela
        if (!dentroJanela(p.janelas as any[], new Date())) {
          return json({ lead: null, motivo: "fora_janela" });
        }

        // Volume diário
        const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
        const { count: enviadosHoje } = await admin
          .from("disparo_fila")
          .select("*", { count: "exact", head: true })
          .eq("plantao_id", plantao_id)
          .eq("status", "enviado")
          .gte("enviado_em", hoje0.toISOString());
        if ((enviadosHoje || 0) >= p.volume_max_dia) {
          return json({ lead: null, motivo: "volume_max_dia" });
        }

        // Próximo lead aguardando
        const { data: filas, error: ef } = await admin
          .from("disparo_fila")
          .select("*")
          .eq("plantao_id", plantao_id)
          .eq("status", "aguardando")
          .order("created_at", { ascending: true })
          .limit(1);
        if (ef) throw ef;
        if (!filas || filas.length === 0) return json({ lead: null, motivo: "fila_vazia" });
        const lead = filas[0];

        // Checar opt-out global (telefone na optout_contacts)
        const { data: opt } = await admin
          .from("optout_contacts")
          .select("id")
          .eq("telefone", lead.telefone_norm)
          .limit(1);
        if (opt && opt.length > 0) {
          await admin.from("disparo_fila").update({ status: "optout_pre", motivo_falha: "optout global" }).eq("id", lead.id);
          return json({ lead: null, motivo: "lead_optout_global" });
        }

        // Escolher copy aleatória ativa
        const { data: copies } = await admin
          .from("disparo_copies")
          .select("*")
          .eq("plantao_id", plantao_id)
          .eq("ativa", true);
        if (!copies || copies.length === 0) return json({ lead: null, motivo: "sem_copy_ativa" });
        const copy = copies[Math.floor(Math.random() * copies.length)];

        return json({ lead, copy, plantao: { eflyer_url: p.eflyer_url, chip_instance: p.chip_instance, ritmo_min_seg: p.ritmo_min_seg, ritmo_max_seg: p.ritmo_max_seg } });
      }

      case "mark-sent": {
        const { fila_id, evolution_msg_id, copy_id } = body;
        if (!fila_id) return json({ error: "fila_id required" }, 400);
        const { error } = await admin.from("disparo_fila").update({
          status: "enviado",
          enviado_em: new Date().toISOString(),
          evolution_msg_id: evolution_msg_id || null,
          copy_id: copy_id || null,
        }).eq("id", fila_id);
        if (error) throw error;
        // Incrementa vezes_usada da copy
        if (copy_id) {
          await admin.rpc("exec_sql", { sql: "" }).then(() => {}); // no-op fallback
          await admin.from("disparo_copies").update({ vezes_usada: (await admin.from("disparo_copies").select("vezes_usada").eq("id", copy_id).single()).data?.vezes_usada + 1 || 1 }).eq("id", copy_id);
        }
        return json({ ok: true });
      }

      case "mark-failed": {
        const { fila_id, motivo } = body;
        if (!fila_id) return json({ error: "fila_id required" }, 400);
        const { data: cur } = await admin.from("disparo_fila").select("tentativas").eq("id", fila_id).single();
        const tent = (cur?.tentativas || 0) + 1;
        const status = tent >= 3 ? "falhou" : "aguardando";
        const { error } = await admin.from("disparo_fila").update({
          status,
          tentativas: tent,
          motivo_falha: String(motivo || "").slice(0, 500),
        }).eq("id", fila_id);
        if (error) throw error;
        return json({ ok: true, retry: status === "aguardando" });
      }

      case "log-event": {
        const { plantao_id, fila_id, evento, evolution_msg_id, payload } = body;
        const { error } = await admin.from("disparo_logs").insert({
          plantao_id, fila_id, evento, evolution_msg_id: evolution_msg_id || null, raw_payload: payload || null,
        });
        if (error) throw error;
        return json({ ok: true });
      }

      case "save-resposta": {
        const { plantao_id, telefone, mensagem, nome, payload } = body;
        if (!telefone || !mensagem) return json({ error: "telefone e mensagem required" }, 400);

        const telnorm = normTelefone(telefone);
        let pid = plantao_id;

        // Se não veio plantao_id, achar por fila_id da última msg enviada pra esse telefone
        let filaMatch: any = null;
        if (!pid) {
          const { data } = await admin
            .from("disparo_fila")
            .select("*")
            .eq("telefone_norm", telnorm)
            .eq("status", "enviado")
            .order("enviado_em", { ascending: false })
            .limit(1);
          if (data && data.length > 0) {
            filaMatch = data[0];
            pid = filaMatch.plantao_id;
          }
        }

        if (!pid) return json({ error: "plantao_id não resolvido (telefone fora de qualquer plantão)" }, 404);

        const cl = await classifyMessage(mensagem);

        const insertData: any = {
          plantao_id: pid,
          fila_id: filaMatch?.id || null,
          telefone,
          telefone_norm: telnorm,
          nome: nome || filaMatch?.nome || null,
          mensagem,
          classificacao: cl.classificacao,
          classificacao_motivo: cl.motivo,
          classificacao_score: cl.score,
          raw_payload: payload || null,
        };
        const { data: novo, error } = await admin.from("disparo_respostas").insert(insertData).select().single();
        if (error) throw error;

        // Se optout, cria registro global em optout_contacts (se ainda não existe)
        if (cl.classificacao === "optout") {
          await admin.from("optout_contacts").insert({
            original_lead_id: novo.id,
            nome: nome || filaMatch?.nome || telefone,
            telefone: telnorm,
            observacao: "Auto opt-out via plantão " + pid,
          }).then(() => {}, () => {});
        }

        return json({ id: novo.id, classificacao: cl.classificacao, motivo: cl.motivo, score: cl.score });
      }

      case "recalc-stats": {
        const { plantao_id } = body;
        if (!plantao_id) return json({ error: "plantao_id required" }, 400);
        const { error } = await admin.rpc("recalc_plantao_stats", { _plantao_id: plantao_id });
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: "action desconhecida", got: action }, 404);
    }
  } catch (e: any) {
    return json({ error: String(e.message || e) }, 500);
  }
});
