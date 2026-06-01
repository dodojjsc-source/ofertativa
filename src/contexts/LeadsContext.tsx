import { createContext, useContext, useState, useRef, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "@/hooks/use-toast";
import { normalizarTelefone } from "@/lib/phoneNormalization";

export type FeedbackType = "interessado" | "agendado" | "recusou" | "optout" | "numero_errado" | "nao_atendeu";

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  telefone_raw?: string;
  ddi?: string;
  ddd?: string | null;
  numero_core?: string;
  is_mobile?: boolean;
  e164?: string;
  display_local?: string;
  whatsapp_url?: string;
  validacao?: "ok" | "incompleto" | "invalido";
  motivo_validacao?: string | null;
  email?: string;
  campanha: string;
  campanhaId?: string;
  corretorId?: string | null;
  gestorId?: string | null;
  status: "pendente" | "atendido" | "nao_atendido";
  feedback?: FeedbackType;
  observacao?: string;
  repassarBitrix?: boolean;
  dataAtendimento?: string;
  tentativasContato?: number;
}

interface LeadsContextType {
  leads: Lead[];
  loading: boolean;
  addLeads: (newLeads: Omit<Lead, "id">[]) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  getLeadsByCorretor: (corretorId: string) => Lead[];
  getLeadsByGestor: (gestorId: string) => Lead[];
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Refs para debounce e mutex
  const reloadTimer = useRef<number | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (user) {
      loadLeads();

      // Função de reload com debounce
      const scheduleReload = () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = window.setTimeout(async () => {
          if (isLoadingRef.current) return; // Mutex: ignora se já está carregando
          await loadLeads();
        }, 800); // Debounce de 800ms
      };

      // Subscrever a mudanças em tempo real
      const channel = supabase
        .channel('leads-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leads'
          },
          () => {
            console.log('Leads alterados, agendando reload...');
            scheduleReload();
          }
        )
        .subscribe();

      // Cleanup na desmontagem
      return () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadLeads = async () => {
    if (isLoadingRef.current) return; // Mutex: evita paralelo
    isLoadingRef.current = true;
    
    try {
      // Buscar todos os leads com paginação (limite padrão do Supabase é 1000)
      let allLeads: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("leads")
          .select(`
            *,
            campanhas:campanha_id (nome)
          `)
          .not('campanha_id', 'is', null)
          .order("data_atendimento", { ascending: true, nullsFirst: true })
          .order("created_at", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allLeads = [...allLeads, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const mappedLeads: Lead[] = allLeads.map((lead) => ({
        id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        telefone_raw: lead.telefone_raw,
        ddi: lead.ddi,
        ddd: lead.ddd,
        numero_core: lead.numero_core,
        is_mobile: lead.is_mobile,
        e164: lead.e164,
        display_local: lead.display_local,
        whatsapp_url: lead.whatsapp_url,
        validacao: lead.validacao,
        motivo_validacao: lead.motivo_validacao,
        email: lead.email || undefined,
        campanha: lead.campanhas?.nome || "Sem campanha",
        campanhaId: lead.campanha_id || undefined,
        corretorId: lead.corretor_id ?? null,
        gestorId: lead.gestor_id ?? null,
        status: lead.status as "pendente" | "atendido" | "nao_atendido",
        feedback: lead.feedback as FeedbackType | undefined,
        observacao: lead.observacao || undefined,
        repassarBitrix: lead.repassar_bitrix || false,
        dataAtendimento: lead.data_atendimento || undefined,
        tentativasContato: lead.tentativas_contato || 0,
      }));

      setLeads(mappedLeads);
    } catch (error: any) {
      console.error("Erro ao carregar leads:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar os leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      isLoadingRef.current = false; // Libera mutex
    }
  };

  const addLeads = async (newLeads: Omit<Lead, "id">[]) => {
    try {
      // Normalizar telefones + nomes primeiro
      const normalizedLeads = newLeads.map(lead => {
        const result = normalizarTelefone(lead.telefone);
        // Limpa nome: WA:, sufixos [NIA] Recepção, Gestão ADM, Canal Aberto, prefixo telefone, CAIXA ALTA, tabs
        let nomeClean = (lead.nome || "")
          .replace(/[\t\r\n]+/g, " ")
          .trim()
          .replace(/^WA:?\s+/i, "")
          .replace(/\s*[-–—]?\s*\[NIA\]\s*Recepção\s*$/i, "")
          .replace(/\s*[-–—]?\s*Recepção\s*$/i, "")
          .replace(/\s*[-–—]?\s*Gestão\s*ADM\s*$/i, "")
          .replace(/\s*[-–—]\s*Canal Aberto.*$/i, "")
          .replace(/^\+?5?\d{8,}\s*[-–—]?\s*/, "")
          .replace(/\s+/g, " ")
          .trim();
        // CAIXA ALTA inteira (>4 chars) → Title Case
        if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]{4,}$/.test(nomeClean)) {
          nomeClean = nomeClean.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        }
        const isInvalido = nomeClean.length < 2 || /^\d+$/.test(nomeClean) || /^[âãÃÂºº·\s]+$/.test(nomeClean);
        return {
          ...lead,
          nome: isInvalido ? "" : nomeClean,
          telefone_raw: lead.telefone,
          telefone: result.display_local || lead.telefone,
          ddi: result.ddi,
          ddd: result.ddd,
          numero_core: result.numero_core,
          is_mobile: result.is_mobile,
          e164: result.e164,
          display_local: result.display_local,
          whatsapp_url: result.whatsapp_url,
          validacao: result.validacao,
          motivo_validacao: result.motivo_validacao,
        };
      });

      // Remover duplicatas internas no batch usando E.164 (manter primeira ocorrência)
      const e164Set = new Set<string>();
      const internallyUniqueLeads = normalizedLeads.filter(lead => {
        if (!lead.e164 || e164Set.has(lead.e164)) {
          return false;
        }
        e164Set.add(lead.e164);
        return true;
      });

      const internalDuplicates = newLeads.length - internallyUniqueLeads.length;

      // Verificar duplicatas por E.164 + campanha antes de inserir
      const e164s = internallyUniqueLeads.map(l => l.e164).filter(Boolean);
      const campanhaId = internallyUniqueLeads[0]?.campanhaId;
      
      if (campanhaId && e164s.length > 0) {
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("e164")
          .eq("campanha_id", campanhaId)
          .in("e164", e164s);
        
        const existingE164s = new Set(existingLeads?.map(l => l.e164) || []);
        const uniqueLeads = internallyUniqueLeads.filter(l => !existingE164s.has(l.e164));
        
        if (uniqueLeads.length === 0) {
          toast({
            title: "Aviso",
            description: "Todos os leads já existem nesta campanha",
            variant: "destructive",
          });
          return;
        }

        const dbLeads = uniqueLeads.map((lead) => ({
          nome: lead.nome,
          telefone: lead.telefone,
          telefone_raw: lead.telefone_raw,
          ddi: lead.ddi,
          ddd: lead.ddd,
          numero_core: lead.numero_core,
          is_mobile: lead.is_mobile,
          e164: lead.e164,
          display_local: lead.display_local,
          whatsapp_url: lead.whatsapp_url,
          validacao: lead.validacao,
          motivo_validacao: lead.motivo_validacao,
          email: lead.email,
          campanha_id: lead.campanhaId,
          corretor_id: lead.corretorId,
          gestor_id: lead.gestorId,
          status: lead.status,
          feedback: lead.feedback,
          observacao: lead.observacao,
          repassar_bitrix: lead.repassarBitrix,
          data_atendimento: lead.dataAtendimento,
        }));

        // Inserir em lotes de 200 para evitar timeouts/limites do PostgREST
        const BATCH_SIZE = 200;
        let insertedCount = 0;
        const batchErrors: string[] = [];
        for (let i = 0; i < dbLeads.length; i += BATCH_SIZE) {
          const batch = dbLeads.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          console.log(`[addLeads] Inserindo lote ${batchNum} (${batch.length} leads)...`);
          const { error: batchError } = await supabase.from("leads").insert(batch);
          if (batchError) {
            console.error(`[addLeads] Lote ${batchNum} falhou:`, batchError);
            batchErrors.push(`Lote ${batchNum}: ${batchError.message}`);
          } else {
            insertedCount += batch.length;
            console.log(`[addLeads] Lote ${batchNum} OK. Total inserido: ${insertedCount}/${dbLeads.length}`);
          }
        }

        if (insertedCount === 0 && batchErrors.length > 0) {
          throw new Error(batchErrors[0]);
        }

        const duplicatesCount = newLeads.length - uniqueLeads.length;
        const descriptionParts: string[] = [`${insertedCount} de ${dbLeads.length} lead(s) inseridos`];

        if (internalDuplicates > 0) {
          descriptionParts.push(`${internalDuplicates} duplicatas internas removidas`);
        }

        if (duplicatesCount - internalDuplicates > 0) {
          descriptionParts.push(`${duplicatesCount - internalDuplicates} já existiam no banco`);
        }

        if (batchErrors.length > 0) {
          descriptionParts.push(`${batchErrors.length} lote(s) falharam — veja o console`);
        }

        toast({
          title: insertedCount < dbLeads.length ? "Inserção parcial" : "Leads adicionados",
          description: descriptionParts.join(', '),
          variant: insertedCount < dbLeads.length ? "destructive" : "default",
        });
      } else {
        // Sem campanha, inserir todos (usar internallyUniqueLeads)
        const dbLeads = internallyUniqueLeads.map((lead) => ({
          nome: lead.nome,
          telefone: lead.telefone,
          telefone_raw: lead.telefone_raw,
          ddi: lead.ddi,
          ddd: lead.ddd,
          numero_core: lead.numero_core,
          is_mobile: lead.is_mobile,
          e164: lead.e164,
          display_local: lead.display_local,
          whatsapp_url: lead.whatsapp_url,
          validacao: lead.validacao,
          motivo_validacao: lead.motivo_validacao,
          email: lead.email,
          campanha_id: lead.campanhaId,
          corretor_id: lead.corretorId,
          gestor_id: lead.gestorId,
          status: lead.status,
          feedback: lead.feedback,
          observacao: lead.observacao,
          repassar_bitrix: lead.repassarBitrix,
          data_atendimento: lead.dataAtendimento,
        }));

        // Inserir em lotes de 200
        const BATCH_SIZE = 200;
        let insertedCount = 0;
        const batchErrors: string[] = [];
        for (let i = 0; i < dbLeads.length; i += BATCH_SIZE) {
          const batch = dbLeads.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          console.log(`[addLeads/no-campaign] Inserindo lote ${batchNum} (${batch.length} leads)...`);
          const { error: batchError } = await supabase.from("leads").insert(batch);
          if (batchError) {
            console.error(`[addLeads/no-campaign] Lote ${batchNum} falhou:`, batchError);
            batchErrors.push(`Lote ${batchNum}: ${batchError.message}`);
          } else {
            insertedCount += batch.length;
          }
        }

        if (insertedCount === 0 && batchErrors.length > 0) {
          throw new Error(batchErrors[0]);
        }

        const descriptionParts: string[] = [`${insertedCount} de ${dbLeads.length} lead(s) inseridos`];
        if (internalDuplicates > 0) {
          descriptionParts.push(`${internalDuplicates} duplicatas internas removidas`);
        }
        if (batchErrors.length > 0) {
          descriptionParts.push(`${batchErrors.length} lote(s) falharam`);
        }

        toast({
          title: insertedCount < dbLeads.length ? "Inserção parcial" : "Sucesso",
          description: descriptionParts.join(', '),
          variant: insertedCount < dbLeads.length ? "destructive" : "default",
        });
      }
    } catch (error: any) {
      console.error("Erro ao adicionar leads:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar os leads",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    // Atualização otimista: aplica no estado local imediatamente
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    );

    try {
      const dbUpdates: any = {};
      if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
      if (updates.telefone !== undefined) dbUpdates.telefone = updates.telefone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.campanhaId !== undefined) dbUpdates.campanha_id = updates.campanhaId;
      if (updates.corretorId !== undefined) dbUpdates.corretor_id = updates.corretorId;
      if (updates.gestorId !== undefined) dbUpdates.gestor_id = updates.gestorId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.feedback !== undefined) dbUpdates.feedback = updates.feedback;
      if (updates.observacao !== undefined) dbUpdates.observacao = updates.observacao;
      if (updates.repassarBitrix !== undefined) dbUpdates.repassar_bitrix = updates.repassarBitrix;
      if (updates.dataAtendimento !== undefined) dbUpdates.data_atendimento = updates.dataAtendimento;
      if (updates.tentativasContato !== undefined) dbUpdates.tentativas_contato = updates.tentativasContato;

      const { error } = await supabase
        .from("leads")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
      // Refresh em segundo plano (opcional)
      // void loadLeads();
    } catch (error: any) {
      // Reverte se falhar
      await loadLeads();
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o lead",
        variant: "destructive",
      });
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);

      if (error) throw error;

      await loadLeads();
      toast({
        title: "Sucesso",
        description: "Lead removido com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o lead",
        variant: "destructive",
      });
    }
  };

  const getLeadsByCorretor = (corretorId: string) => {
    return leads.filter((lead) => lead.corretorId === corretorId);
  };

  const getLeadsByGestor = (gestorId: string) => {
    return leads.filter((lead) => lead.gestorId === gestorId);
  };

  return (
    <LeadsContext.Provider
      value={{
        leads,
        loading,
        addLeads,
        updateLead,
        deleteLead,
        getLeadsByCorretor,
        getLeadsByGestor,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (!context) {
    throw new Error("useLeads must be used within LeadsProvider");
  }
  return context;
}
