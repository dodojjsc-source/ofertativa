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
  corretorId?: string;
  gestorId?: string;
  status: "pendente" | "atendido" | "nao_atendido";
  feedback?: FeedbackType;
  observacao?: string;
  repassarBitrix?: boolean;
  dataAtendimento?: string;
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
    }
  }, [user]);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          campanhas:campanha_id (nome)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedLeads: Lead[] = (data || []).map((lead) => ({
        id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email || undefined,
        campanha: lead.campanhas?.nome || "Sem campanha",
        campanhaId: lead.campanha_id || undefined,
        corretorId: lead.corretor_id || undefined,
        gestorId: lead.gestor_id || undefined,
        status: lead.status as "pendente" | "atendido" | "nao_atendido",
        feedback: lead.feedback as FeedbackType | undefined,
        observacao: lead.observacao || undefined,
        repassarBitrix: lead.repassar_bitrix || false,
        dataAtendimento: lead.data_atendimento || undefined,
      }));

      setLeads(mappedLeads);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLeads = async (newLeads: Omit<Lead, "id">[]) => {
    try {
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar os leads",
        variant: "destructive",
      });
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
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

      const { error } = await supabase
        .from("leads")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;

      await loadLeads();
    } catch (error: any) {
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
