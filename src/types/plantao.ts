export type PlantaoStatus =
  | "rascunho"
  | "aprovado"
  | "ativo"
  | "pausado"
  | "concluido"
  | "cancelado";

export type DisparoFilaStatus =
  | "aguardando"
  | "enviado"
  | "falhou"
  | "optout_pre"
  | "cancelado";

export type DisparoLogEvento = "enviado" | "entregue" | "lido" | "falha";

export type RespostaClassificacao =
  | "interessado"
  | "frio"
  | "optout"
  | "outro"
  | "pendente";

export type HandoffStatus =
  | "aguardando"
  | "em_atendimento"
  | "concluido"
  | "descartado";

export interface PlantaoJanela {
  dia: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
  inicio: string;
  fim: string;
}

export interface Plantao {
  id: string;
  nome: string;
  descricao: string | null;
  status: PlantaoStatus;
  eflyer_url: string | null;
  video_url: string | null;
  pilares: string[];
  chip_instance: string;
  ritmo_min_seg: number;
  ritmo_max_seg: number;
  volume_max_dia: number;
  janelas: PlantaoJanela[];
  corretores_handoff: string[];
  modo_handoff: "pull" | "round_robin";
  bitrix_funil_id: string | null;
  total_leads: number;
  total_enviados: number;
  total_entregues: number;
  total_lidos: number;
  total_respostas: number;
  total_optout: number;
  total_falhas: number;
  iniciado_em: string | null;
  concluido_em: string | null;
  pausado_em: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantaoCopy {
  id: string;
  plantao_id: string;
  ordem: number;
  texto: string;
  ativa: boolean;
  inclui_eflyer: boolean;
  vezes_usada: number;
  taxa_resposta: number | null;
  taxa_optout: number | null;
  created_at: string;
}

export interface DisparoFila {
  id: string;
  plantao_id: string;
  nome: string;
  telefone: string;
  telefone_norm: string;
  email: string | null;
  origem: string | null;
  bitrix_lead_id: string | null;
  status: DisparoFilaStatus;
  copy_id: string | null;
  agendado_para: string | null;
  enviado_em: string | null;
  evolution_msg_id: string | null;
  motivo_falha: string | null;
  tentativas: number;
  created_at: string;
  updated_at: string;
}

export interface DisparoResposta {
  id: string;
  plantao_id: string;
  fila_id: string | null;
  telefone: string;
  telefone_norm: string;
  nome: string | null;
  mensagem: string;
  recebido_em: string;
  classificacao: RespostaClassificacao;
  classificacao_motivo: string | null;
  classificacao_score: number | null;
  classificacao_manual: boolean;
  handoff_status: HandoffStatus;
  pego_por: string | null;
  pego_em: string | null;
  travado_ate: string | null;
  bitrix_lead_id: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export function statusLabel(s: PlantaoStatus): { label: string; color: string } {
  const map: Record<PlantaoStatus, { label: string; color: string }> = {
    rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
    aprovado: { label: "Aprovado", color: "bg-blue-100 text-blue-700" },
    ativo: { label: "Disparando", color: "bg-green-100 text-green-700" },
    pausado: { label: "Pausado", color: "bg-amber-100 text-amber-700" },
    concluido: { label: "Concluído", color: "bg-slate-100 text-slate-700" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  };
  return map[s];
}

export function classifLabel(c: RespostaClassificacao): { label: string; color: string; icon: string } {
  const map: Record<RespostaClassificacao, { label: string; color: string; icon: string }> = {
    interessado: { label: "Interessado", color: "bg-green-100 text-green-700 border-green-200", icon: "🔥" },
    frio: { label: "Curioso frio", color: "bg-amber-100 text-amber-700 border-amber-200", icon: "🤔" },
    optout: { label: "Opt-out", color: "bg-slate-100 text-slate-600 border-slate-200", icon: "⛔" },
    outro: { label: "Outro", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "💬" },
    pendente: { label: "Pendente", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "⏳" },
  };
  return map[c];
}
