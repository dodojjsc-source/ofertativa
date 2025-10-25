import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Assignment {
  id: string;
  campanhaId: string;
  leadId: string;
  corretorId: string;
  statusDistribuicao: "pendente" | "atendido" | "nao_atendido";
  timestampAtribuicao: string;
}

interface AssignmentsContextType {
  assignments: Assignment[];
  addAssignments: (newAssignments: Omit<Assignment, "id" | "timestampAtribuicao">[]) => void;
  getAssignmentsByCorretor: (corretorId: string) => Assignment[];
  getAssignmentsByCampanha: (campanhaId: string) => Assignment[];
  getPendingCountByCorretor: (corretorId: string) => number;
  isLeadAssigned: (campanhaId: string, leadId: string) => boolean;
  updateAssignmentStatus: (id: string, status: Assignment["statusDistribuicao"]) => void;
  undoLastDistribution: () => boolean;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(undefined);

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const stored = localStorage.getItem("assignments");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("assignments", JSON.stringify(assignments));
  }, [assignments]);

  const addAssignments = (newAssignments: Omit<Assignment, "id" | "timestampAtribuicao">[]) => {
    const timestamp = new Date().toISOString();
    const assignmentsWithId = newAssignments.map((a) => ({
      ...a,
      id: `assignment-${Date.now()}-${Math.random()}`,
      timestampAtribuicao: timestamp,
    }));

    // Salvar snapshot para undo
    localStorage.setItem("tmp.lastDistribution", JSON.stringify(assignmentsWithId));

    setAssignments((prev) => [...prev, ...assignmentsWithId]);
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

  const updateAssignmentStatus = (id: string, status: Assignment["statusDistribuicao"]) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, statusDistribuicao: status } : a))
    );
  };

  const undoLastDistribution = () => {
    const lastDistribution = localStorage.getItem("tmp.lastDistribution");
    if (!lastDistribution) return false;

    const lastAssignments: Assignment[] = JSON.parse(lastDistribution);
    const lastIds = new Set(lastAssignments.map((a) => a.id));

    setAssignments((prev) => prev.filter((a) => !lastIds.has(a.id)));
    localStorage.removeItem("tmp.lastDistribution");
    return true;
  };

  return (
    <AssignmentsContext.Provider
      value={{
        assignments,
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
