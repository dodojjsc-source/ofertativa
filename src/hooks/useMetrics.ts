import { useMemo, useEffect, useState } from "react";
import { useLeads, Lead } from "@/contexts/LeadsContext";
import { useAssignments } from "@/contexts/AssignmentsContext";
import { useBitrixQueue } from "@/contexts/BitrixQueueContext";
import { useUsers } from "@/contexts/UsersContext";
import { Filters } from "@/contexts/FiltersContext";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface CorretorMetrics {
  corretorId: string;
  corretorName: string;
  gestorName: string;
  ligacoes: number;
  atendimentos: number;
  taxaSucesso: number;
  agendados: number;
  repassarBitrix: number;
  filaPendente: number;
  pacingHoje: number;
  percentualLote: number;
  atribuidosLote: number;
  concluidosLote: number;
}

export interface TimeSeriesData {
  date: string;
  [corretorId: string]: string | number;
}

export interface HeatmapData {
  day: string;
  hour: number;
  value: number;
}

export interface FeedbackMix {
  corretorId: string;
  interessado: number;
  agendado: number;
  recusou: number;
  optout: number;
}

export function useMetrics(filters: Filters) {
  const { leads } = useLeads();
  const { assignments } = useAssignments();
  const { queue } = useBitrixQueue();
  const { users } = useUsers();

  interface Optout {
    id: string;
    flaggedAt: string;
    corretorId: string | null;
    gestorId: string | null;
    campanhaId: string | null;
  }

  const [optouts, setOptouts] = useState<Optout[]>([]);

  useEffect(() => {
    const fetchOptouts = async () => {
      let query = supabase
        .from('optout_contacts')
        .select('id, flagged_at, corretor_id, gestor_id, campanha_id');

      if (filters.startDate) query = query.gte('flagged_at', filters.startDate);
      if (filters.endDate) query = query.lte('flagged_at', filters.endDate);

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar opt-outs:', error);
        setOptouts([]);
        return;
      }
      setOptouts((data || []).map((d: any) => ({
        id: d.id,
        flaggedAt: d.flagged_at,
        corretorId: d.corretor_id,
        gestorId: d.gestor_id,
        campanhaId: d.campanha_id,
      })));
    };

    fetchOptouts();
  }, [filters.startDate, filters.endDate]);

  return useMemo(() => {
    // Aplicar filtros aos leads
    let filteredLeads = leads;

    if (filters.gestorId) {
      filteredLeads = filteredLeads.filter(l => l.gestorId === filters.gestorId);
    }

    if (filters.corretorId) {
      filteredLeads = filteredLeads.filter(l => l.corretorId === filters.corretorId);
    }

    if (filters.campanha) {
      filteredLeads = filteredLeads.filter(l => l.campanha === filters.campanha);
    }

    if (filters.feedback) {
      filteredLeads = filteredLeads.filter(l => l.feedback === filters.feedback);
    }

    if (filters.startDate && filters.endDate) {
      const start = startOfDay(parseISO(filters.startDate));
      const end = endOfDay(parseISO(filters.endDate));
      filteredLeads = filteredLeads.filter(l => {
        if (!l.dataAtendimento) return false;
        const date = parseISO(l.dataAtendimento);
        return date >= start && date <= end;
      });
    }

    // Opt-outs filtrados conforme filtros aplicados
    let filteredOptouts = optouts;
    if (filters.gestorId) filteredOptouts = filteredOptouts.filter(o => o.gestorId === filters.gestorId);
    if (filters.corretorId) filteredOptouts = filteredOptouts.filter(o => o.corretorId === filters.corretorId);
    // Nota: filtro por campanha por nome não é aplicável aqui (dados têm apenas campanhaId)

    // KPIs gerais (contando opt-out como atendimento)
    const atendimentosBase = filteredLeads.filter(l => l.status === "atendido").length;
    const atendimentos = atendimentosBase + filteredOptouts.length;
    const naoAtendimentos = filteredLeads.filter(l => l.status === "nao_atendido").length;
    const ligacoes = atendimentos + naoAtendimentos;
    const taxaSucesso = ligacoes > 0 ? (atendimentos / ligacoes) * 100 : 0;
    const filaPendente = queue.filter(q => q.statusFila === "pendente").length;

    // Variação dia anterior
    const ontem = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const leadsOntem = filteredLeads.filter(l => 
      l.dataAtendimento?.startsWith(ontem)
    );
    const optoutsOntem = filteredOptouts.filter(o => o.flaggedAt?.startsWith(ontem)).length;
    const ligacoesOntem = leadsOntem.filter(l => 
      l.status === "atendido" || l.status === "nao_atendido"
    ).length + optoutsOntem;
    const variacaoDia = ligacoesOntem > 0 
      ? ((ligacoes - ligacoesOntem) / ligacoesOntem) * 100 
      : 0;

    // Variação 7 dias
    const seteDiasAtras = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const leads7Dias = filteredLeads.filter(l => {
      if (!l.dataAtendimento) return false;
      return l.dataAtendimento >= seteDiasAtras;
    });
    const optouts7Dias = filteredOptouts.filter(o => o.flaggedAt >= seteDiasAtras).length;
    const ligacoes7Dias = leads7Dias.filter(l => 
      l.status === "atendido" || l.status === "nao_atendido"
    ).length + optouts7Dias;
    const variacao7Dias = ligacoes7Dias > 0 
      ? ((ligacoes - (ligacoes7Dias / 7)) / (ligacoes7Dias / 7)) * 100 
      : 0;

    // Sparkline data (últimos 7 dias)
    const sparklineData = Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      const countLeads = filteredLeads.filter(l => 
        l.dataAtendimento?.startsWith(date) &&
        (l.status === "atendido" || l.status === "nao_atendido")
      ).length;
      const countOptouts = filteredOptouts.filter(o => o.flaggedAt?.startsWith(date)).length;
      return { date, value: countLeads + countOptouts };
    });

    // Métricas por corretor
    const corretores = users.filter(u => u.role === "corretor" && u.status === "ativo");
    const rankingCorretores: CorretorMetrics[] = corretores.map(corretor => {
      const corretorLeads = filteredLeads.filter(l => l.corretorId === corretor.id);
      const corretorAtendimentosLeads = corretorLeads.filter(l => l.status === "atendido").length;
      const corretorOptouts = filteredOptouts.filter(o => o.corretorId === corretor.id).length;
      const corretorAtendimentos = corretorAtendimentosLeads + corretorOptouts;
      const corretorNaoAtendimentos = corretorLeads.filter(l => l.status === "nao_atendido").length;
      const corretorLigacoes = corretorAtendimentos + corretorNaoAtendimentos;
      const corretorTaxaSucesso = corretorLigacoes > 0 
        ? (corretorAtendimentos / corretorLigacoes) * 100 
        : 0;

      const agendados = corretorLeads.filter(l => l.feedback === "agendado").length;
      const repassarBitrix = corretorLeads.filter(l => l.repassarBitrix).length;
      const filaPendenteCorretor = queue.filter(q => 
        q.statusFila === "pendente" && q.corretorId === corretor.id
      ).length;

      // Pacing hoje
      const hoje = format(new Date(), "yyyy-MM-dd");
      const ligacoesHojeLeads = corretorLeads.filter(l => 
        l.dataAtendimento?.startsWith(hoje) &&
        (l.status === "atendido" || l.status === "nao_atendido")
      ).length;
      const ligacoesHojeOptouts = filteredOptouts.filter(o => o.corretorId === corretor.id && o.flaggedAt?.startsWith(hoje)).length;
      const ligacoesHoje = ligacoesHojeLeads + ligacoesHojeOptouts;
      const metaDiaria = corretor.metaDiaria || 60;
      const pacingHoje = (ligacoesHoje / metaDiaria) * 100;

      // Percentual do lote (contando opt-out como concluído)
      const atribuidosLote = assignments.filter(a => 
        a.corretorId === corretor.id && a.statusDistribuicao === "pendente"
      ).length;
      const concluidosLote = corretorLeads.filter(l => 
        l.status === "atendido" || l.status === "nao_atendido"
      ).length + corretorOptouts;
      const percentualLote = atribuidosLote > 0 
        ? (concluidosLote / atribuidosLote) * 100 
        : 0;

      const gestor = users.find(u => u.id === corretor.gestorId);

      return {
        corretorId: corretor.id,
        corretorName: corretor.name,
        gestorName: gestor?.name || "Sem gestor",
        ligacoes: corretorLigacoes,
        atendimentos: corretorAtendimentos,
        taxaSucesso: corretorTaxaSucesso,
        agendados,
        repassarBitrix,
        filaPendente: filaPendenteCorretor,
        pacingHoje,
        percentualLote,
        atribuidosLote,
        concluidosLote,
      };
    });

    // Funil data
    const funnelData = rankingCorretores.map(c => ({
      corretor: c.corretorName,
      ligacoes: c.ligacoes,
      atendimentos: c.atendimentos,
      agendados: c.agendados,
      bitrix: c.repassarBitrix,
    }));

    // Time series data (últimos 7 dias)
    const timeSeriesData: TimeSeriesData[] = Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      const data: TimeSeriesData = { date };
      
      corretores.forEach(corretor => {
        const countLeads = filteredLeads.filter(l => 
          l.corretorId === corretor.id &&
          l.dataAtendimento?.startsWith(date) &&
          (l.status === "atendido" || l.status === "nao_atendido")
        ).length;
        const countOptouts = filteredOptouts.filter(o => o.corretorId === corretor.id && o.flaggedAt?.startsWith(date)).length;
        data[corretor.id] = countLeads + countOptouts;
      });

      return data;
    });

    // Heatmap data (matriz dia x hora)
    const heatmapData: HeatmapData[] = [];
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 8; hour < 19; hour++) {
        const valueLeads = filteredLeads.filter(l => {
          if (!l.dataAtendimento) return false;
          const date = parseISO(l.dataAtendimento);
          return date.getDay() === day && date.getHours() === hour;
        }).length;
        const valueOptouts = filteredOptouts.filter(o => {
          if (!o.flaggedAt) return false;
          const date = parseISO(o.flaggedAt);
          return date.getDay() === day && date.getHours() === hour;
        }).length;
        
        heatmapData.push({
          day: dias[day],
          hour,
          value: valueLeads + valueOptouts,
        });
      }
    }

    // Feedback mix
    const feedbackMix: FeedbackMix[] = rankingCorretores.map(c => {
      const corretorLeads = filteredLeads.filter(l => l.corretorId === c.corretorId);
      const corretorOptouts = filteredOptouts.filter(o => o.corretorId === c.corretorId).length;
      return {
        corretorId: c.corretorId,
        interessado: corretorLeads.filter(l => l.feedback === "interessado").length,
        agendado: corretorLeads.filter(l => l.feedback === "agendado").length,
        recusou: corretorLeads.filter(l => l.feedback === "recusou").length,
        optout: corretorLeads.filter(l => l.feedback === "optout").length + corretorOptouts,
      };
    });

    // Data quality
    const observacaoAusente = filteredLeads.filter(l => 
      l.status === "atendido" && !l.observacao
    ).length;
    const observacaoAusentePct = atendimentos > 0 
      ? (observacaoAusente / atendimentos) * 100 
      : 0;

    const telefones = filteredLeads.map(l => l.telefone);
    const duplicidades = telefones.length - new Set(telefones).size;

    const optoutsCount = filteredOptouts.length;

    return {
      // KPIs principais
      ligacoes,
      atendimentos,
      taxaSucesso,
      filaPendente,
      variacaoDia,
      variacao7Dias,
      sparklineData,

      // Rankings
      rankingCorretores,

      // Gráficos
      funnelData,
      timeSeriesData,
      heatmapData,
      feedbackMix,

      // Qualidade
      dataQuality: {
        observacaoAusente,
        observacaoAusentePct,
        duplicidades,
        optouts: optoutsCount,
      },

      // Tempo médio fila
      tempoMedioFila: queue.filter(q => q.statusFila === "pendente").length > 0
        ? queue
            .filter(q => q.statusFila === "pendente")
            .reduce((acc, q) => {
              const now = new Date();
              const created = parseISO(q.timestampCriacao);
              return acc + (now.getTime() - created.getTime()) / (1000 * 60 * 60);
            }, 0) / queue.filter(q => q.statusFila === "pendente").length
        : 0,
    };
  }, [leads, assignments, queue, users, filters, optouts]);
}
