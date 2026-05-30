// Edge function: gera 5 copies de disparo via Gemini 2.5 Flash
// Input: { nome_oferta, pilares: string[], eflyer_url?, quantidade? }
// Output: { copies: string[] }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

const headers = {
  ...corsHeaders,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `Você é redator sênior de oferta ativa imobiliária para WhatsApp.

OBJETIVO: gerar copies para disparo ativo de uma oferta imobiliária a uma base previamente engajada.

REGRAS INVIOLÁVEIS:
1. NUNCA use travessão (— ou –). Use vírgula, ponto, dois pontos ou parênteses.
2. Toda copy deve começar com "Olá {{primeiro_nome}}," (a variável será substituída pelo primeiro nome do lead).
3. Toda copy deve terminar com a linha exata: "Se preferir não receber mais ofertas, responda SAIR."
4. Tom executivo Buzz: próximo mas profissional, sem clichês ("oportunidade única", "última chance", "imperdível"), sem emojis excessivos (no máximo 1 ou 2).
5. Não escrever em CAIXA ALTA inteira.
6. Sem promessa exagerada, sem termos como "garantido", "100%", "milhões".
7. Mencionar de forma sutil que a pessoa demonstrou interesse anterior em lançamentos da região (sem ser invasivo).
8. Cada copy entre 250 e 600 caracteres.
9. Cada uma das N copies deve ser ESTRUTURALMENTE DIFERENTE das outras (gancho diferente, ordem diferente, ângulo diferente). Não basta trocar palavras: mude a abordagem.
10. Inclua os pilares de valorização de formas diferentes em cada copy.
11. Sempre faça 1 pergunta clara como CTA (ex: "Posso te mandar o material completo?", "Quer ver os valores e plantas?", "Topa receber o e-flyer hoje?").

FORMATO DE SAÍDA:
Retorne APENAS um JSON válido com a chave "copies" contendo um array de strings:
{"copies": ["copy 1...", "copy 2...", ...]}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY missing in secrets" }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  const nome_oferta = String(body.nome_oferta || "").trim();
  const pilares: string[] = Array.isArray(body.pilares) ? body.pilares.filter((p: any) => typeof p === "string" && p.trim().length > 3) : [];
  const eflyer_url: string = body.eflyer_url || "";
  const quantidade: number = Math.min(Math.max(parseInt(body.quantidade || "5"), 3), 8);

  if (!nome_oferta) return json({ error: "nome_oferta obrigatório" }, 400);
  if (pilares.length < 2) return json({ error: "Precisa pelo menos 2 pilares" }, 400);

  const userPrompt = `Gere ${quantidade} copies de disparo WhatsApp para a oferta abaixo.

OFERTA: ${nome_oferta}

PILARES DE VALORIZAÇÃO:
${pilares.map((p, i) => `${i + 1}. ${p}`).join("\n")}

${eflyer_url ? `E-FLYER (anexo que vai junto): ${eflyer_url}\nMencione que está enviando o material.` : ""}

CONTEXTO DA BASE: pessoas que demonstraram interesse anterior em lançamentos imobiliários em Garopaba (SC) via campanhas Instagram. Você é da Buzz Imobiliária.

Retorne JSON com array "copies" contendo ${quantidade} variações estruturalmente diferentes.`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.85,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                copies: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["copies"],
            },
          },
        }),
      },
    );

    if (!resp.ok) {
      const err = await resp.text();
      return json({ error: "Gemini API erro", details: err }, 500);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { return json({ error: "Resposta Gemini sem JSON válido", raw: text }, 500); }

    let copies: string[] = Array.isArray(parsed.copies) ? parsed.copies : [];

    // Garantir variáveis e opt-out (correção pós Gemini)
    copies = copies.map((c: string) => {
      let t = c.trim();
      t = t.replace(/—/g, ",").replace(/–/g, ","); // strip travessões se Gemini escapou
      if (!/\{\{primeiro_nome\}\}|\{\{nome\}\}/i.test(t)) t = `Olá {{primeiro_nome}}, ` + t;
      if (!/sair|parar|descadastr/i.test(t)) t += "\n\nSe preferir não receber mais ofertas, responda SAIR.";
      return t;
    });

    return json({ copies, model: GEMINI_MODEL });
  } catch (e: any) {
    return json({ error: String(e.message || e) }, 500);
  }
});
