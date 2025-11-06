// Normalização de telefones brasileiros com suporte a DDI/DDD/core

export interface PhoneNormalizationResult {
  ddi: string;
  ddd: string | null;
  numero_core: string;
  is_mobile: boolean;
  e164: string;
  display_local: string;
  whatsapp_url: string;
  validacao: "ok" | "incompleto" | "invalido";
  motivo_validacao: string | null;
}

export interface NormalizationOptions {
  forcar_fixos_sem_nono?: boolean;
}

function onlyDigits(s: string): string {
  return (s || "").replace(/\D+/g, "");
}

function splitDDI_DDD_Core(d: string) {
  // Remove zeros à esquerda
  if (d.startsWith("00")) d = d.replace(/^0+/, "");
  
  let ddi = "55";
  
  // Detectar DDI
  if (d.length > 0 && d.startsWith("55")) {
    ddi = "55";
    d = d.slice(2);
  } else if (d.length <= 11) {
    // 8-11 dígitos: tratar como Brasil (não extrair DDI da frente)
    ddi = "55";
  } else if (d.length > 11 && !d.startsWith("0")) {
    // 12+ dígitos: possível DDI explícito diferente de 55
    const maybeDDI = d.slice(0, 2);
    if (/^\d{1,3}$/.test(maybeDDI)) {
      ddi = maybeDDI;
      d = d.slice(maybeDDI.length);
    }
  }

  // Extrair DDD (2 dígitos)
  let ddd: string | null = null;
  if (d.length >= 10) {
    ddd = d.slice(0, 2);
    d = d.slice(2);
  } else if (d.length === 9 || d.length === 8) {
    ddd = null;
  } else if (d.length > 2 && d.length < 8) {
    // Tamanho estranho, sem DDD
  } else if (d.length === 2) {
    ddd = d;
    d = "";
  }

  const core = d;
  return { ddi, ddd, core };
}

function formatLocal(ddd: string | null, core: string): string {
  if (core.length === 9) {
    const left = core.slice(0, 5);
    const right = core.slice(5);
    return ddd ? `(${ddd}) ${left} ${right}` : `${left} ${right}`;
  }
  if (core.length === 8) {
    const left = core.slice(0, 4);
    const right = core.slice(4);
    return ddd ? `(${ddd}) ${left} ${right}` : `${left} ${right}`;
  }
  return ddd ? `(${ddd}) ${core}` : core;
}

export function normalizarTelefone(
  telefone_raw: string, 
  opts: NormalizationOptions = {}
): PhoneNormalizationResult {
  const { forcar_fixos_sem_nono = false } = opts;
  let motivo = "";
  let validacao: "ok" | "incompleto" | "invalido" = "ok";

  const digits = onlyDigits(telefone_raw);
  if (!digits) {
    return {
      ddi: "55",
      ddd: null,
      numero_core: "",
      is_mobile: false,
      e164: "",
      display_local: "",
      whatsapp_url: "",
      validacao: "incompleto",
      motivo_validacao: "Sem dígitos"
    };
  }

  let { ddi, ddd, core } = splitDDI_DDD_Core(digits);

  const isBR = ddi === "55";
  
  // Validação: core muito curto
  if (core.length < 8) {
    validacao = "incompleto";
    motivo = "Menos de 8 dígitos no número";
  }

  // Adicionar nono dígito se aplicável (Brasil, DDD presente, 8 dígitos)
  if (isBR && ddd && core.length === 8 && !forcar_fixos_sem_nono) {
    core = "9" + core;
  }

  const is_mobile = core.length === 9;

  // Validação: excesso de dígitos
  if (core.length > 9) {
    validacao = "invalido";
    motivo = "Número com dígitos em excesso";
  }

  // Validação: DDD deve ter 2 dígitos
  if (ddd && !/^\d{2}$/.test(ddd)) {
    validacao = "invalido";
    motivo = "DDD inválido";
  }

  const e164 = ddd ? `+${ddi}${ddd}${core}` : `+${ddi}${core}`;
  const whatsapp_url = `https://wa.me/${ddi}${ddd ?? ""}${core}`;
  const display_local = formatLocal(ddd, core);

  return {
    ddi,
    ddd,
    numero_core: core,
    is_mobile,
    e164,
    display_local,
    whatsapp_url,
    validacao,
    motivo_validacao: motivo || null
  };
}
