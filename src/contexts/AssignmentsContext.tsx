import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Assignment {
  id: string;
  campanhaId: string;
  leadId: string;
  corretorId: string;
  gestorId?: string;
  statusDistribuicao: "pendente" | "concluido";
  timestampAtribuicao: string;
}

interface AssignmentsContextType {
  assignments: Assignment[];
  loading: boolean;
  addAssignments: (newAssignments: Omit<Assignment, "id" | "timestampAtribuicao">[]) => Promise<void>;
  getAssignmentsByCorretor: (corretorId: string) => Assignment[];
  getAssignmentsByCampanha: (campanhaId: string) => Assignment[];
  getPendingCountByCorretor: (corretorId: string) => number;
  isLeadAssigned: (campanhaId: string, leadId: string) => boolean;
  updateAssignmentStatus: (id: string, status: Assignment["statusDistribuicao"]) => Promise<void>;
  undoLastDistribution: () => Promise<boolean>;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(undefined);

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDistributionIds, setLastDistributionIds] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .order("timestamp_atribuicao", { ascending: false });

      if (error) throw error;

      const mappedAssignments: Assignment[] = (data || []).map((assignment) => ({
        id: assignment.id,
        campanhaId: assignment.campanha_id || "",
        leadId: assignment.lead_id,
        corretorId: assignment.corretor_id,
        gestorId: assignment.gestor_id || undefined,
        statusDistribuicao: assignment.status_distribuicao as "pendente" | "concluido",
        timestampAtribuicao: assignment.timestamp_atribuicao,
      }));

      setAssignments(mappedAssignments);
    } catch (error: any) {
      console.error("Erro ao carregar atribuições:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as atribuições",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addAssignments = async (newAssignments: Omit<Assignment, "id" | "timestampAtribuicao">[]) => {
    try {
      const dbAssignments = newAssignments.map((assignment) => ({
        campanha_id: assignment.campanhaId,
        lead_id: assignment.leadId,
        corretor_id: assignment.corretorId,
        gestor_id: assignment.gestorId,
        status_distribuicao: assignment.statusDistribuicao,
      }));

      const { data, error } = await supabase
        .from("assignments")
        .insert(dbAssignments)
        .select();

      if (error) throw error;

      if (data) {
        setLastDistributionIds(data.map((a) => a.id));
      }

      await loadAssignments();
      toast({
        title: "Sucesso",
        description: `${newAssignments.length} atribuição(ões) criada(s) com sucesso`,
      });
    } catch (error: any) {
      console.error("Erro ao adicionar atribuições:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar as atribuições",
        variant: "destructive",
      });
    }
  };

  const getAssignmentsByCorretor = (corretorId: string) => {
    return assignments.filter((a) => a.corretorId === corretorId);
  };

  const getAssignmentsByCampanha = (campanhaId: string) => {
    return assignments.filter((a) => a.campanhaId === campanhaId);
  };

  const getPendingCountByCorretor = (corretorId: string) => {
    return assignments.filter(
      (a) => a.corretorId === corretorId && a.statusDistribuicao === "pendente"
    ).length;
  };

  const isLeadAssigned = (campanhaId: string, leadId: string) => {
    return assignments.some(
      (a) => a.campanhaId === campanhaId && a.leadId === leadId
    );
  };

  const updateAssignmentStatus = async (id: string, status: Assignment["statusDistribuicao"]) => {
    try {
      const { error } = await supabase
        .from("assignments")
        .update({ status_distribuicao: status })
        .eq("id", id);

      if (error) throw error;

      await loadAssignments();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const undoLastDistribution = async () => {
    if (lastDistributionIds.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há distribuição recente para desfazer",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("assignments")
        .delete()
        .in("id", lastDistributionIds);

      if (error) throw error;

      setLastDistributionIds([]);
      await loadAssignments();
      toast({
        title: "Sucesso",
        description: "Distribuição desfeita com sucesso",
      });
      return true;
    } catch (error: any) {
      console.error("Erro ao desfazer distribuição:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível desfazer a distribuição",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <AssignmentsContext.Provider
      value={{
        assignments,
        loading,
        addAssignments,
        getAssignmentsByCorretor,
        getAssignmentsByCampanha,
        getPendingCountByCorretor,
        isLeadAssigned,
        updateAssignmentStatus,
        undoLastDistribution,
      }}
    >
      {children}
    </AssignmentsContext.Provider>
  );
}

export function useAssignments() {
  const context = useContext(AssignmentsContext);
  if (!context) {
    throw new Error("useAssignments must be used within AssignmentsProvider");
  }
  return context;
}
