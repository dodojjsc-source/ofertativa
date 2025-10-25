import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "@/hooks/use-toast";

export type BitrixQueueStatus = "pendente" | "processado" | "erro" | "descartado";

export interface BitrixQueueItem {
  id: string;
  leadId: string;
  campanhaId: string;
  campanhaNome: string;
  nome: string;
  telefone: string;
  email?: string;
  corretorId: string;
  corretorNome: string;
  gestorId: string;
  gestorNome: string;
  feedback: string;
  observacao: string;
  statusFila: BitrixQueueStatus;
  timestampCriacao: string;
  timestampProcessamento?: string;
  processadoPor?: string;
}

interface BitrixQueueContextType {
  queue: BitrixQueueItem[];
  loading: boolean;
  addToQueue: (item: Omit<BitrixQueueItem, "id" | "statusFila" | "timestampCriacao">) => Promise<boolean>;
  updateStatus: (ids: string[], status: BitrixQueueStatus, processadoPor?: string) => Promise<void>;
  getQueueByGestor: (gestorId: string) => BitrixQueueItem[];
  exportPendingCSV: (items: BitrixQueueItem[]) => void;
}

const BitrixQueueContext = createContext<BitrixQueueContextType | undefined>(undefined);

export function BitrixQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<BitrixQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadQueue();
    }
  }, [user]);

  const loadQueue = async () => {
    try {
      const { data, error } = await supabase
        .from("bitrix_queue")
        .select("*")
        .order("timestamp_criacao", { ascending: false });

      if (error) throw error;

      const mappedQueue: BitrixQueueItem[] = (data || []).map((item) => ({
        id: item.id,
        leadId: item.lead_id,
        campanhaId: item.campanha_id || "",
        campanhaNome: "",
        nome: item.nome,
        telefone: item.telefone,
        email: undefined,
        corretorId: item.corretor_id || "",
        corretorNome: "",
        gestorId: item.gestor_id || "",
        gestorNome: "",
        feedback: item.feedback || "",
        observacao: item.observacao || "",
        statusFila: item.status_fila as BitrixQueueStatus,
        timestampCriacao: item.timestamp_criacao,
        timestampProcessamento: item.timestamp_processamento || undefined,
        processadoPor: item.processado_por || undefined,
      }));

      setQueue(mappedQueue);
    } catch (error: any) {
      console.error("Erro ao carregar fila Bitrix:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a fila do Bitrix",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToQueue = async (item: Omit<BitrixQueueItem, "id" | "statusFila" | "timestampCriacao">): Promise<boolean> => {
    try {
      const { data: existing, error: checkError } = await supabase
        .from("bitrix_queue")
        .select("id")
        .eq("lead_id", item.leadId)
        .in("status_fila", ["pendente", "processado"])
        .limit(1);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        toast({
          title: "Aviso",
          description: "Este lead já está na fila do Bitrix",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase.from("bitrix_queue").insert({
        lead_id: item.leadId,
        campanha_id: item.campanhaId || null,
        nome: item.nome,
        telefone: item.telefone,
        corretor_id: item.corretorId || null,
        gestor_id: item.gestorId || null,
        feedback: item.feedback as any,
        observacao: item.observacao,
        status_fila: "pendente",
      });

      if (error) throw error;

      await loadQueue();
      toast({
        title: "Sucesso",
        description: "Lead adicionado à fila do Bitrix",
      });
      return true;
    } catch (error: any) {
      console.error("Erro ao adicionar à fila:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar à fila do Bitrix",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateStatus = async (ids: string[], status: BitrixQueueStatus, processadoPor?: string) => {
    try {
      const updates: any = { status_fila: status };
      if (status === "processado") {
        updates.processado_por = processadoPor;
      }

      const { error } = await supabase
        .from("bitrix_queue")
        .update(updates)
        .in("id", ids);

      if (error) throw error;

      await loadQueue();
      toast({
        title: "Sucesso",
        description: `Status atualizado para ${ids.length} item(ns)`,
      });
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const getQueueByGestor = (gestorId: string) => {
    return queue.filter((item) => item.gestorId === gestorId);
  };

  const exportPendingCSV = (items: BitrixQueueItem[]) => {
    const pendingItems = items.filter((item) => item.statusFila === "pendente");
    
    const headers = [
      "queueId",
      "leadId",
      "campanhaId",
      "nome",
      "telefone",
      "corretor",
      "gestor",
      "feedback",
      "observacao",
      "timestampCriacao",
    ];

    const rows = pendingItems.map((item) => [
      item.id,
      item.leadId,
      item.campanhaId,
      item.nome,
      item.telefone,
      item.corretorNome,
      item.gestorNome,
      item.feedback,
      item.observacao,
      item.timestampCriacao,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bitrix_pendentes_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BitrixQueueContext.Provider
      value={{
        queue,
        loading,
        addToQueue,
        updateStatus,
        getQueueByGestor,
        exportPendingCSV,
      }}
    >
      {children}
    </BitrixQueueContext.Provider>
  );
}

export function useBitrixQueue() {
  const context = useContext(BitrixQueueContext);
  if (!context) {
    throw new Error("useBitrixQueue must be used within BitrixQueueProvider");
  }
  return context;
}
