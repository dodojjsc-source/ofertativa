import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_API_TOKEN")!;
const GEMINI_KEYS = [
  Deno.env.get("GEMINI_API_KEY") || "",
  Deno.env.get("GEMINI_API_KEY_1") || "",
  Deno.env.get("GEMINI_API_KEY_2") || "",
  Deno.env.get("GEMINI_API_KEY_3") || "",
].filter(k => k.length > 0);
const GEMINI_API_KEY = GEMINI_KEYS[0] || "";
const GEMINI_MODELS = [
  Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
];
const GEMINI_MODEL = GEMINI_MODELS[0];

// ===== Helpers Plantão =====
function normTel(t: string): string {
  let d = String(t || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length === 12) d = d.slice(0, 4) + "9" + d.slice(4);
  return d;
}

function dentroJanela(janelas: any[], now: Date): boolean {
  // Edge function roda em UTC. Converte pra America/Sao_Paulo (BRT, UTC-3).
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wdRaw = (parts.find(p => p.type === "weekday")?.value || "").toLowerCase().slice(0, 3);
  const map: Record<string, string> = { "dom": "dom", "seg": "seg", "ter": "ter", "qua": "qua", "qui": "qui", "sex": "sex", "sáb": "sab", "sab": "sab" };
  const dia = map[wdRaw] || wdRaw;
  const hh = parts.find(p => p.type === "hour")?.value || "00";
  const mm = parts.find(p => p.type === "minute")?.value || "00";
  const hhmm = `${hh}:${mm}`;
  for (const j of janelas || []) {
    if (j.dia === dia && hhmm >= j.inicio && hhmm <= j.fim) return true;
  }
  return false;
}

const GEMINI_COPY_SYS = `Você é redator sênior de oferta ativa imobiliária para WhatsApp.

REGRAS INVIOLÁVEIS:
1. NUNCA use travessão (— ou –). Use vírgula, ponto, dois pontos ou parênteses.
2. Toda copy deve começar com "Olá {{primeiro_nome}},"
3. Toda copy deve terminar com a linha exata: "Se preferir não receber mais ofertas, responda SAIR."
4. Tom executivo Buzz: próximo mas profissional, sem clichês ("oportunidade única", "última chance", "imperdível"), no máximo 1 ou 2 emojis.
5. Não escrever em CAIXA ALTA inteira.
6. Sem promessa exagerada ("garantido", "100%", "milhões").
7. Mencionar de forma sutil que a pessoa demonstrou interesse anterior em lançamentos da região.
8. Cada copy entre 250 e 600 caracteres.
9. Cada copy ESTRUTURALMENTE DIFERENTE (gancho, ordem, ângulo diferentes).
10. Inclua os pilares de formas diferentes em cada copy.
11. Sempre 1 pergunta clara como CTA.

Retorne JSON: {"copies": ["copy 1...", "copy 2...", ...]}`;

const GEMINI_CLASSIFY_SYS = `Você classifica respostas WhatsApp a uma oferta imobiliária.

Classes:
- interessado: pediu info, valor, planta, condição, interesse claro, perguntou sobre o produto
- frio: educado mas sem ação ("obrigado", "depois vejo", "talvez")
- optout: pediu pra parar/sair/descadastrar, reclamou, hostil
- outro: bate-papo, "quem é vc", "como conseguiu meu número", ambíguo

Retorne JSON: {"classificacao": "<classe>", "motivo": "<frase curta>", "score": <0 a 1>}`;

async function geminiJson(systemPrompt: string, userPrompt: string, schema: any, temperature = 0.7) {
  if (GEMINI_KEYS.length === 0) throw new Error("GEMINI_API_KEY missing");
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });
  let lastErr = "no attempts";
  for (const model of GEMINI_MODELS) {
    for (const key of GEMINI_KEYS) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body },
        );
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          return JSON.parse(text);
        }
        const errText = (await resp.text()).slice(0, 300);
        lastErr = `${model}/${key.slice(-6)} HTTP ${resp.status}: ${errText}`;
        // 429 (rate limit) ou 503 (overload): tenta próxima chave/modelo
        if (resp.status === 429 || resp.status === 503) continue;
        // 400 etc: erro determinístico, não adianta trocar
        throw new Error(lastErr);
      } catch (e: any) {
        lastErr = `${model}/${key.slice(-6)} EXC: ${e.message || e}`;
        continue;
      }
    }
  }
  throw new Error("Gemini todas tentativas falharam: " + lastErr);
}

async function classifyMsg(mensagem: string): Promise<{ classificacao: string; motivo: string; score: number }> {
  const m = mensagem.trim();
  if (/^(sair|parar|stop|descadastrar?|nao|não|chega)$/i.test(m)) {
    return { classificacao: "optout", motivo: "match exato termo opt-out", score: 1 };
  }
  if (!GEMINI_API_KEY) return { classificacao: "pendente", motivo: "sem GEMINI_API_KEY", score: 0 };
  try {
    const p = await geminiJson(
      GEMINI_CLASSIFY_SYS,
      `Mensagem do cliente:\n"${m}"`,
      {
        type: "OBJECT",
        properties: {
          classificacao: { type: "STRING", enum: ["interessado", "frio", "optout", "outro"] },
          motivo: { type: "STRING" },
          score: { type: "NUMBER" },
        },
        required: ["classificacao", "motivo", "score"],
      },
      0.1,
    );
    return {
      classificacao: ["interessado", "frio", "optout", "outro"].includes(p.classificacao) ? p.classificacao : "outro",
      motivo: String(p.motivo || ""),
      score: typeof p.score === "number" ? p.score : 0.5,
    };
  } catch (_e) {
    return { classificacao: "pendente", motivo: "exception gemini", score: 0 };
  }
}

const extraHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...extraHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: extraHeaders });

  const token = req.headers.get("x-admin-token");
  if (!token || !ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(req.url);
  // path looks like /admin-users/<action>
  const action = url.pathname.split("/").filter(Boolean).pop();

  let body: any = {};
  if (req.method !== "GET") {
    try { body = await req.json(); } catch { body = {}; }
  }

  try {
    switch (action) {
      case "list": {
        const page = body.page ?? 1;
        const perPage = body.perPage ?? 1000;
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        return json(data);
      }
      case "get": {
        const { email } = body;
        if (!email) return json({ error: "email required" }, 400);
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;
        const user = data.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
        return json({ user: user ?? null });
      }
      case "create": {
        const { email, password, user_metadata, email_confirm = true } = body;
        if (!email || !password) return json({ error: "email and password required" }, 400);
        const { data, error } = await admin.auth.admin.createUser({
          email, password, email_confirm, user_metadata,
        });
        if (error) throw error;
        return json(data);
      }
      case "reset-password": {
        const { user_id, password } = body;
        if (!user_id || !password) return json({ error: "user_id and password required" }, 400);
        const { data, error } = await admin.auth.admin.updateUserById(user_id, { password });
        if (error) throw error;
        return json(data);
      }
      case "confirm-email": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        const { data, error } = await admin.auth.admin.updateUserById(user_id, { email_confirm: true });
        if (error) throw error;
        return json(data);
      }
      case "delete": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        const { data, error } = await admin.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return json(data);
      }
      case "profiles-list": {
        const { data, error } = await admin
          .from("profiles")
          .select("id, email, name, gestor_id, status, telefone, meta_diaria");
        if (error) throw error;
        return json({ profiles: data });
      }
      case "profile-update": {
        const { id, gestor_id, status, name } = body;
        if (!id) return json({ error: "id required" }, 400);
        const patch: Record<string, unknown> = {};
        if (gestor_id !== undefined) patch.gestor_id = gestor_id;
        if (status !== undefined) patch.status = status;
        if (name !== undefined) patch.name = name;
        if (!Object.keys(patch).length) return json({ error: "nothing to update" }, 400);
        const { data, error } = await admin
          .from("profiles")
          .update(patch)
          .eq("id", id)
          .select();
        if (error) throw error;
        return json({ profile: data?.[0] ?? null });
      }
      // ===== Plantão =====
      case "plantao-generate-copies": {
        const nome_oferta = String(body.nome_oferta || "").trim();
        const pilares: string[] = Array.isArray(body.pilares) ? body.pilares.filter((p: any) => typeof p === "string" && p.trim().length > 3) : [];
        const eflyer_url: string = body.eflyer_url || "";
        const quantidade: number = Math.min(Math.max(parseInt(body.quantidade || "5"), 3), 8);
        if (!nome_oferta) return json({ error: "nome_oferta required" }, 400);
        if (pilares.length < 2) return json({ error: "minimo 2 pilares" }, 400);

        const userPrompt = `Gere ${quantidade} copies de disparo WhatsApp.

OFERTA: ${nome_oferta}

PILARES:
${pilares.map((p, i) => `${i + 1}. ${p}`).join("\n")}

${eflyer_url ? `E-FLYER (anexo): ${eflyer_url}\nMencione que está enviando o material.` : ""}

CONTEXTO: pessoas que demonstraram interesse anterior em lançamentos imobiliários em Garopaba (SC) via Instagram. Você é da Buzz Imobiliária.

Retorne JSON com array "copies" (${quantidade} variações estruturalmente diferentes).`;

        try {
          const p = await geminiJson(GEMINI_COPY_SYS, userPrompt, {
            type: "OBJECT",
            properties: { copies: { type: "ARRAY", items: { type: "STRING" } } },
            required: ["copies"],
          }, 0.85);
          let copies: string[] = Array.isArray(p.copies) ? p.copies : [];
          copies = copies.map((c: string) => {
            let t = c.trim().replace(/—/g, ",").replace(/–/g, ",");
            if (!/\{\{primeiro_nome\}\}|\{\{nome\}\}/i.test(t)) t = "Olá {{primeiro_nome}}, " + t;
            if (!/sair|parar|descadastr/i.test(t)) t += "\n\nSe preferir não receber mais ofertas, responda SAIR.";
            return t;
          });
          return json({ copies, model: GEMINI_MODEL });
        } catch (e: any) {
          return json({ error: String(e.message || e) }, 500);
        }
      }

      case "plantao-list-active": {
        const { data, error } = await admin.from("disparo_plantoes").select("*").eq("status", "ativo");
        if (error) throw error;
        return json({ plantoes: data });
      }

      case "plantao-next": {
        const { plantao_id } = body;
        if (!plantao_id) return json({ error: "plantao_id required" }, 400);
        const { data: p, error: ep } = await admin.from("disparo_plantoes").select("*").eq("id", plantao_id).single();
        if (ep) throw ep;
        if (p.status !== "ativo") return json({ lead: null, motivo: "plantao_nao_ativo" });
        if (!dentroJanela(p.janelas as any[], new Date())) return json({ lead: null, motivo: "fora_janela" });

        const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
        const { count: enviadosHoje } = await admin
          .from("disparo_fila").select("*", { count: "exact", head: true })
          .eq("plantao_id", plantao_id).eq("status", "enviado")
          .gte("enviado_em", hoje0.toISOString());
        if ((enviadosHoje || 0) >= p.volume_max_dia) return json({ lead: null, motivo: "volume_max_dia" });

        const { data: filas, error: ef } = await admin
          .from("disparo_fila").select("*")
          .eq("plantao_id", plantao_id).eq("status", "aguardando")
          .order("created_at", { ascending: true }).limit(1);
        if (ef) throw ef;
        if (!filas || filas.length === 0) return json({ lead: null, motivo: "fila_vazia" });
        const lead = filas[0];

        const { data: opt } = await admin
          .from("optout_contacts").select("id").eq("telefone", lead.telefone_norm).limit(1);
        if (opt && opt.length > 0) {
          await admin.from("disparo_fila").update({ status: "optout_pre", motivo_falha: "optout global" }).eq("id", lead.id);
          return json({ lead: null, motivo: "lead_optout_global" });
        }

        const { data: copies } = await admin
          .from("disparo_copies").select("*")
          .eq("plantao_id", plantao_id).eq("ativa", true);
        if (!copies || copies.length === 0) return json({ lead: null, motivo: "sem_copy_ativa" });
        const copy = copies[Math.floor(Math.random() * copies.length)];

        return json({
          lead, copy,
          plantao: {
            eflyer_url: p.eflyer_url,
            chip_instance: p.chip_instance,
            ritmo_min_seg: p.ritmo_min_seg,
            ritmo_max_seg: p.ritmo_max_seg,
          },
        });
      }

      case "plantao-mark-sent": {
        const { fila_id, evolution_msg_id, copy_id } = body;
        if (!fila_id) return json({ error: "fila_id required" }, 400);
        const { error } = await admin.from("disparo_fila").update({
          status: "enviado",
          enviado_em: new Date().toISOString(),
          evolution_msg_id: evolution_msg_id || null,
          copy_id: copy_id || null,
        }).eq("id", fila_id);
        if (error) throw error;
        if (copy_id) {
          const { data: cur } = await admin.from("disparo_copies").select("vezes_usada").eq("id", copy_id).single();
          await admin.from("disparo_copies").update({ vezes_usada: (cur?.vezes_usada || 0) + 1 }).eq("id", copy_id);
        }
        return json({ ok: true });
      }

      case "plantao-mark-failed": {
        const { fila_id, motivo } = body;
        if (!fila_id) return json({ error: "fila_id required" }, 400);
        const { data: cur } = await admin.from("disparo_fila").select("tentativas").eq("id", fila_id).single();
        const tent = (cur?.tentativas || 0) + 1;
        const status = tent >= 3 ? "falhou" : "aguardando";
        const { error } = await admin.from("disparo_fila").update({
          status, tentativas: tent, motivo_falha: String(motivo || "").slice(0, 500),
        }).eq("id", fila_id);
        if (error) throw error;
        return json({ ok: true, retry: status === "aguardando" });
      }

      case "plantao-log-event": {
        const { plantao_id, fila_id, evento, evolution_msg_id, payload } = body;
        const { error } = await admin.from("disparo_logs").insert({
          plantao_id, fila_id, evento, evolution_msg_id: evolution_msg_id || null, raw_payload: payload || null,
        });
        if (error) throw error;
        return json({ ok: true });
      }

      case "plantao-save-resposta": {
        const { telefone, mensagem, nome, payload } = body;
        let plantao_id = body.plantao_id;
        if (!telefone || !mensagem) return json({ error: "telefone e mensagem required" }, 400);
        const telnorm = normTel(telefone);

        let filaMatch: any = null;
        if (!plantao_id) {
          const { data } = await admin.from("disparo_fila").select("*")
            .eq("telefone_norm", telnorm).eq("status", "enviado")
            .order("enviado_em", { ascending: false }).limit(1);
          if (data && data.length > 0) {
            filaMatch = data[0];
            plantao_id = filaMatch.plantao_id;
          }
        }
        if (!plantao_id) return json({ error: "telefone fora de plantão" }, 404);

        const cl = await classifyMsg(mensagem);
        const { data: novo, error } = await admin.from("disparo_respostas").insert({
          plantao_id, fila_id: filaMatch?.id || null,
          telefone, telefone_norm: telnorm,
          nome: nome || filaMatch?.nome || null,
          mensagem,
          classificacao: cl.classificacao,
          classificacao_motivo: cl.motivo,
          classificacao_score: cl.score,
          raw_payload: payload || null,
        }).select().single();
        if (error) throw error;

        if (cl.classificacao === "optout") {
          await admin.from("optout_contacts").insert({
            original_lead_id: novo.id,
            nome: nome || filaMatch?.nome || telefone,
            telefone: telnorm,
            observacao: "Auto opt-out via plantão " + plantao_id,
          }).then(() => {}, () => {});
        }
        return json({ id: novo.id, classificacao: cl.classificacao, motivo: cl.motivo, score: cl.score });
      }

      case "plantao-bootstrap": {
        // Cria plantão completo a partir de campanha existente do Ofertativa
        // Input: { nome_plantao, descricao?, campanha_nome | campanha_id, pilares[], eflyer_url?, chip_instance?, status? }
        const { nome_plantao, descricao, campanha_nome, campanha_id, pilares, eflyer_url, chip_instance, status } = body;
        if (!nome_plantao) return json({ error: "nome_plantao required" }, 400);
        if (!Array.isArray(pilares) || pilares.length < 2) return json({ error: "minimo 2 pilares" }, 400);

        // 1. Achar campanha
        let camp: any = null;
        if (campanha_id) {
          const { data } = await admin.from("campanhas").select("*").eq("id", campanha_id).single();
          camp = data;
        } else if (campanha_nome) {
          const { data } = await admin.from("campanhas").select("*").ilike("nome", `%${campanha_nome}%`).limit(1);
          camp = data?.[0];
        }
        if (!camp) return json({ error: "campanha não encontrada" }, 404);

        // 2. Puxar leads da campanha
        const { data: leadsRaw, error: eL } = await admin
          .from("leads").select("id, nome, telefone, email")
          .eq("campanha_id", camp.id);
        if (eL) throw eL;

        // 3. Normalizar telefones + dedup + cruzar optout
        const validos: any[] = [];
        const vistos = new Set<string>();
        for (const l of leadsRaw || []) {
          let d = String(l.telefone || "").replace(/\D/g, "");
          if (d.length === 10 || d.length === 11) d = "55" + d;
          if (d.length === 12) d = d.slice(0, 4) + "9" + d.slice(4);
          if (d.length < 12 || d.length > 13 || /^(0+|9+|1+)$/.test(d)) continue;
          if (vistos.has(d)) continue;
          vistos.add(d);
          validos.push({
            nome: String(l.nome || "").split(" ").slice(0, 3).join(" "),
            telefone: l.telefone,
            telefone_norm: d,
            email: l.email || null,
            origem: "ofertativa:" + camp.nome,
          });
        }

        // Cruzar com optout_contacts
        if (validos.length > 0) {
          const { data: optoutData } = await admin
            .from("optout_contacts").select("telefone")
            .in("telefone", validos.map(v => v.telefone_norm));
          const optSet = new Set((optoutData || []).map((o: any) => o.telefone));
          for (let i = validos.length - 1; i >= 0; i--) {
            if (optSet.has(validos[i].telefone_norm)) validos.splice(i, 1);
          }
        }

        if (validos.length === 0) return json({ error: "nenhum lead válido após filtros" }, 400);

        // 4. Gerar copies via Gemini
        let copies: string[] = [];
        try {
          const userPrompt = `Gere 5 copies de disparo WhatsApp.

OFERTA: ${nome_plantao}

PILARES:
${(pilares as string[]).map((p, i) => `${i + 1}. ${p}`).join("\n")}

${eflyer_url ? `E-FLYER (anexo): ${eflyer_url}\nMencione que está enviando o material.` : ""}

CONTEXTO: pessoas que demonstraram interesse anterior em lançamentos imobiliários em Garopaba (SC) via Instagram. Você é da Buzz Imobiliária.

Retorne JSON com array "copies" (5 variações estruturalmente diferentes).`;

          const p = await geminiJson(GEMINI_COPY_SYS, userPrompt, {
            type: "OBJECT",
            properties: { copies: { type: "ARRAY", items: { type: "STRING" } } },
            required: ["copies"],
          }, 0.85);
          copies = Array.isArray(p.copies) ? p.copies : [];
          copies = copies.map((c: string) => {
            let t = c.trim().replace(/—/g, ",").replace(/–/g, ",");
            if (!/\{\{primeiro_nome\}\}|\{\{nome\}\}/i.test(t)) t = "Olá {{primeiro_nome}}, " + t;
            if (!/sair|parar|descadastr/i.test(t)) t += "\n\nSe preferir não receber mais ofertas, responda SAIR.";
            return t;
          });
        } catch (e: any) {
          return json({ error: "Gemini falhou: " + (e.message || e) }, 500);
        }

        if (copies.length < 3) return json({ error: "Gemini gerou menos de 3 copies" }, 500);

        // 5. Criar plantão
        const { data: plantao, error: eP } = await admin.from("disparo_plantoes").insert({
          nome: nome_plantao,
          descricao: descricao || `Auto-criado de campanha "${camp.nome}"`,
          status: status || "rascunho",
          eflyer_url: eflyer_url || null,
          pilares,
          chip_instance: chip_instance || "buzz-alertas",
          total_leads: validos.length,
        }).select().single();
        if (eP) throw eP;

        // 6. Inserir copies
        const { error: eC } = await admin.from("disparo_copies").insert(
          copies.map((t, i) => ({
            plantao_id: plantao.id, ordem: i + 1, texto: t, ativa: true, inclui_eflyer: !!eflyer_url,
          })),
        );
        if (eC) throw eC;

        // 7. Inserir fila em batches
        const batchSize = 200;
        for (let i = 0; i < validos.length; i += batchSize) {
          const batch = validos.slice(i, i + batchSize);
          const { error: eF } = await admin.from("disparo_fila").insert(
            batch.map(v => ({
              plantao_id: plantao.id,
              nome: v.nome, telefone: v.telefone, telefone_norm: v.telefone_norm,
              email: v.email, origem: v.origem,
              status: "aguardando",
            })),
          );
          if (eF) throw eF;
        }

        return json({
          ok: true,
          plantao_id: plantao.id,
          campanha_nome: camp.nome,
          leads_inseridos: validos.length,
          leads_brutos: (leadsRaw || []).length,
          copies_geradas: copies.length,
          copies_preview: copies.map(c => c.slice(0, 80) + "..."),
        });
      }

      case "plantao-add-teste": {
        // Adiciona telefones de teste como primeiros da fila do plantão
        const { plantao_id, telefones } = body;
        if (!plantao_id || !Array.isArray(telefones) || telefones.length === 0) {
          return json({ error: "plantao_id + telefones[] required" }, 400);
        }
        const inserts = telefones.map((t: any) => {
          const tel = String(t.telefone || t).replace(/\D/g, "");
          let d = tel;
          if (d.length === 10 || d.length === 11) d = "55" + d;
          if (d.length === 12) d = d.slice(0, 4) + "9" + d.slice(4);
          return {
            plantao_id,
            nome: t.nome || "TESTE",
            telefone: t.telefone || t,
            telefone_norm: d,
            origem: "teste",
            status: "aguardando",
            created_at: new Date(0).toISOString(), // garante que vem primeiro
          };
        });
        const { data, error } = await admin.from("disparo_fila").insert(inserts).select();
        if (error) throw error;
        return json({ ok: true, inseridos: data?.length });
      }

      case "plantao-analisa-campanha": {
        // Analisa qualidade dos nomes/telefones de uma campanha Ofertativa
        // Input: { campanha_nome | campanha_id }
        const { campanha_nome, campanha_id } = body;
        let camp: any = null;
        if (campanha_id) {
          const { data } = await admin.from("campanhas").select("*").eq("id", campanha_id).single();
          camp = data;
        } else if (campanha_nome) {
          const { data } = await admin.from("campanhas").select("*").ilike("nome", `%${campanha_nome}%`).limit(1);
          camp = data?.[0];
        }
        if (!camp) return json({ error: "campanha não encontrada" }, 404);

        const { data: leads } = await admin.from("leads").select("id, nome, telefone").eq("campanha_id", camp.id);
        const total = leads?.length || 0;

        // Padrões problemáticos
        const padroes = [
          { nome: "Prefixo WA", regex: /^\s*(WA|wa|Wa|W\.A\.?)\s+/i, exemplos: [] as string[] },
          { nome: "Sufixo Canal Aberto", regex: /\b(canal\s*aberto|c\.?a\.?)\s*$/i, exemplos: [] as string[] },
          { nome: "Prefixo Equipe", regex: /^\s*(equipe|time)\s+/i, exemplos: [] as string[] },
          { nome: "Prefixo Lead", regex: /^\s*(lead|leads)\s+/i, exemplos: [] as string[] },
          { nome: "Hashtag #", regex: /#\w+/, exemplos: [] as string[] },
          { nome: "Contém Bot/Auto", regex: /\b(bot|auto|automa)/i, exemplos: [] as string[] },
          { nome: "Email no nome", regex: /@\w+\./, exemplos: [] as string[] },
          { nome: "URL no nome", regex: /https?:\/\//, exemplos: [] as string[] },
          { nome: "Telefone no nome", regex: /\d{8,}/, exemplos: [] as string[] },
          { nome: "Só números", regex: /^\d+$/, exemplos: [] as string[] },
          { nome: "1 palavra só", regex: /^\S+$/, exemplos: [] as string[] },
          { nome: "CAIXA ALTA inteira", regex: /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+$/, exemplos: [] as string[] },
          { nome: "Tamanho < 3", regex: /^.{1,2}$/, exemplos: [] as string[] },
          { nome: "Tamanho > 50", regex: /^.{51,}$/, exemplos: [] as string[] },
          { nome: "Caractere especial", regex: /[\(\)\[\]\{\}<>\\\|]/, exemplos: [] as string[] },
        ];

        let semNome = 0;
        let semTelefone = 0;
        let telefoneInvalido = 0;
        const telefonesUnicos = new Set<string>();
        let duplicados = 0;

        for (const l of leads || []) {
          const nome = String(l.nome || "").trim();
          const tel = String(l.telefone || "").trim();

          if (!nome) { semNome++; continue; }
          if (!tel) { semTelefone++; continue; }

          // Telefone normalizado
          let d = tel.replace(/\D/g, "");
          if (d.length === 10 || d.length === 11) d = "55" + d;
          if (d.length === 12) d = d.slice(0, 4) + "9" + d.slice(4);
          if (d.length < 12 || d.length > 13) telefoneInvalido++;
          else {
            if (telefonesUnicos.has(d)) duplicados++;
            else telefonesUnicos.add(d);
          }

          for (const p of padroes) {
            if (p.regex.test(nome) && p.exemplos.length < 5) p.exemplos.push(nome);
          }
        }

        return json({
          campanha: { id: camp.id, nome: camp.nome },
          total_leads: total,
          sem_nome: semNome,
          sem_telefone: semTelefone,
          telefone_invalido: telefoneInvalido,
          duplicados,
          unicos_validos: telefonesUnicos.size,
          padroes_problematicos: padroes.filter(p => p.exemplos.length > 0).map(p => ({
            tipo: p.nome,
            qtd: p.exemplos.length,
            exemplos: p.exemplos,
          })),
        });
      }

      case "plantao-recalc-stats": {
        const { plantao_id } = body;
        if (!plantao_id) return json({ error: "plantao_id required" }, 400);
        const { error } = await admin.rpc("recalc_plantao_stats", { _plantao_id: plantao_id });
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: "unknown action", action }, 404);
    }
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
