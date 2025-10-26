import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "@/hooks/use-toast";

export type FeedbackType = "interessado" | "agendado" | "recusou" | "optout";

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
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

  useEffect(() => {
    if (user) {
      loadLeads();

      // Subscrever a mudanças em tempo real para sincronização automática
      const channel = supabase
        .channel('leads-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'leads'
          },
          () => {
            console.log('Leads alterados, recarregando...');
            loadLeads();
          }
        )
        .subscribe();

      // Cleanup na desmontagem
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          campanhas!campanha_id (nome)
        `)
        .not('campanha_id', 'is', null)
        .order("data_atendimento", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mappedLeads: Lead[] = (data || []).map((lead) => ({
        id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
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
    }
  };

  const addLeads = async (newLeads: Omit<Lead, "id">[]) => {
    try {
      // Verificar duplicatas por telefone + campanha antes de inserir
      const telefones = newLeads.map(l => l.telefone);
      const campanhaId = newLeads[0]?.campanhaId;
      
      if (campanhaId) {
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("telefone")
          .eq("campanha_id", campanhaId)
          .in("telefone", telefones);
        
        const existingPhones = new Set(existingLeads?.map(l => l.telefone) || []);
        const uniqueLeads = newLeads.filter(l => !existingPhones.has(l.telefone));
        
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

        const { error } = await supabase.from("leads").insert(dbLeads);

        if (error) throw error;

        await loadLeads();

        const duplicatesCount = newLeads.length - uniqueLeads.length;
        toast({
          title: "Leads adicionados",
          description: `${uniqueLeads.length} lead(s) adicionado(s)${
            duplicatesCount > 0 ? ` (${duplicatesCount} duplicatas ignoradas)` : ""
          }`,
        });
      } else {
        // Sem campanha, inserir todos
        const dbLeads = newLeads.map((lead) => ({
          nome: lead.nome,
          telefone: lead.telefone,
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

        const { error } = await supabase.from("leads").insert(dbLeads);

        if (error) throw error;

        await loadLeads();
        toast({
          title: "Sucesso",
          description: `${newLeads.length} lead(s) adicionado(s) com sucesso`,
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
