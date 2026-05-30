import { normalizarTelefone } from "./phoneNormalization";
import { supabase } from "@/integrations/supabase/client";

export interface ParsedLead {
  nome: string;
  telefone_raw: string;
  telefone_norm: string | null;
  email?: string;
  origem?: string;
  bitrix_lead_id?: string;
  motivo_descarte?: string;
}

export interface ParseResult {
  total_brutos: number;
  validos: ParsedLead[];
  descartados: ParsedLead[];
  duplicados_arquivo: number;
}

const reTelInvalido = /^(0+|9+|1+)$/;

export function parseCsvText(text: string): ParseResult {
  const linhas = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (linhas.length === 0) return { total_brutos: 0, validos: [], descartados: [], duplicados_arquivo: 0 };

  const sep = (linhas[0].match(/;/g)?.length || 0) > (linhas[0].match(/,/g)?.length || 0) ? ";" : ",";
  const headers = linhas[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""));

  const idxNome = headers.findIndex(h => /nome|name|cliente|contato/.test(h));
  const idxTel = headers.findIndex(h => /telefone|phone|celular|whats|tel|fone/.test(h));
  const idxEmail = headers.findIndex(h => /e?[\.\-_]?mail/.test(h));
  const idxOrigem = headers.findIndex(h => /origem|source|campanha|origin/.test(h));
  const idxBitrix = headers.findIndex(h => /bitrix|lead_?id|id_?lead/.test(h));

  if (idxNome < 0 || idxTel < 0) {
    // tenta as duas primeiras colunas
  }

  const validos: ParsedLead[] = [];
  const descartados: ParsedLead[] = [];
  const vistos = new Set<string>();
  let duplicados = 0;

  for (let i = 1; i < linhas.length; i++) {
    const cols = parseCsvLine(linhas[i], sep);
    const nome = (idxNome >= 0 ? cols[idxNome] : cols[0])?.trim() || "";
    const telRaw = (idxTel >= 0 ? cols[idxTel] : cols[1])?.trim() || "";
    const email = idxEmail >= 0 ? cols[idxEmail]?.trim() : undefined;
    const origem = idxOrigem >= 0 ? cols[idxOrigem]?.trim() : undefined;
    const bitrix = idxBitrix >= 0 ? cols[idxBitrix]?.trim() : undefined;

    if (!nome || nome.length < 2) {
      descartados.push({ nome, telefone_raw: telRaw, telefone_norm: null, email, origem, bitrix_lead_id: bitrix, motivo_descarte: "Sem nome" });
      continue;
    }
    if (!telRaw) {
      descartados.push({ nome, telefone_raw: telRaw, telefone_norm: null, email, origem, bitrix_lead_id: bitrix, motivo_descarte: "Sem telefone" });
      continue;
    }

    let norm: string | null = null;
    try {
      const r = normalizarTelefone(telRaw);
      if (r.validacao === "ok") norm = r.e164.replace(/\D/g, "");
    } catch { /* ignore */ }

    if (!norm || norm.length < 12 || norm.length > 13 || reTelInvalido.test(norm)) {
      descartados.push({ nome, telefone_raw: telRaw, telefone_norm: norm, email, origem, bitrix_lead_id: bitrix, motivo_descarte: "Telefone inválido" });
      continue;
    }

    if (vistos.has(norm)) {
      duplicados++;
      continue;
    }
    vistos.add(norm);

    validos.push({ nome: nome.split(" ").slice(0, 3).join(" "), telefone_raw: telRaw, telefone_norm: norm, email, origem, bitrix_lead_id: bitrix });
  }

  return { total_brutos: linhas.length - 1, validos, descartados, duplicados_arquivo: duplicados };
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === sep && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map(s => s.replace(/^"|"$/g, ""));
}

export async function checarOptoutGlobal(telefones_norm: string[]): Promise<Set<string>> {
  if (telefones_norm.length === 0) return new Set();
  const { data } = await (supabase as any)
    .from("optout_contacts")
    .select("telefone")
    .in("telefone", telefones_norm);
  return new Set((data || []).map((r: any) => r.telefone));
}

export function primeiroNome(s: string): string {
  return (s || "").split(/\s+/)[0] || "";
}

export function aplicarVarsCopy(template: string, lead: { nome: string }): string {
  return template
    .replace(/\{\{primeiro_nome\}\}/gi, primeiroNome(lead.nome))
    .replace(/\{\{nome\}\}/gi, lead.nome);
}

export const COPY_OPTOUT_LINE = "Se preferir não receber mais ofertas, responda SAIR.";

export function validarCopy(texto: string): { ok: boolean; erros: string[] } {
  const erros: string[] = [];
  if (texto.length < 80) erros.push("Curta demais (mínimo 80 chars)");
  if (texto.length > 700) erros.push("Longa demais (máximo 700 chars)");
  if (/[—–]/.test(texto)) erros.push("Contém travessão (proibido)");
  if (!/sair|parar|descadastr/i.test(texto)) erros.push("Falta linha de opt-out");
  if (!/\{\{primeiro_nome\}\}|\{\{nome\}\}/i.test(texto)) erros.push("Falta variável {{primeiro_nome}}");
  return { ok: erros.length === 0, erros };
}
