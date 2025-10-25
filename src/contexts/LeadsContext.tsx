import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type FeedbackType = "interessado" | "agendado" | "recusou" | "optout";

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  campanha: string;
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
  addLeads: (newLeads: Lead[]) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  getLeadsByCorretor: (corretorId: string) => Lead[];
  getLeadsByGestor: (gestorId: string) => Lead[];
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

// Mock leads
const mockLeads: Lead[] = [
  {
    id: "1",
    nome: "Maria Silva",
    telefone: "(11) 98765-4321",
    email: "maria@email.com",
    campanha: "Campanha Janeiro 2025",
    corretorId: "3",
    gestorId: "2",
    status: "pendente",
  },
  {
    id: "2",
    nome: "João Santos",
    telefone: "(11) 97654-3210",
    email: "joao@email.com",
    campanha: "Campanha Janeiro 2025",
    corretorId: "3",
    gestorId: "2",
    status: "atendido",
    feedback: "interessado",
    observacao: "Cliente demonstrou interesse em imóvel na zona sul",
    repassarBitrix: true,
    dataAtendimento: "2025-01-15T10:30:00",
  },
  {
    id: "3",
    nome: "Ana Costa",
    telefone: "(11) 96543-2109",
    email: "ana@email.com",
    campanha: "Campanha Janeiro 2025",
    corretorId: "3",
    gestorId: "2",
    status: "nao_atendido",
  },
];

const STORAGE_KEY = "localStorage.leads";

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : mockLeads;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  const addLeads = (newLeads: Lead[]) => {
    setLeads((prev) => [...prev, ...newLeads]);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
    );
  };

  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
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
