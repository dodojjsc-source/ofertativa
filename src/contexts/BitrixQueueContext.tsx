import { createContext, useContext, useState, ReactNode, useEffect } from "react";

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
  addToQueue: (item: Omit<BitrixQueueItem, "id" | "statusFila" | "timestampCriacao">) => boolean;
  updateStatus: (ids: string[], status: BitrixQueueStatus, processadoPor?: string) => void;
  getQueueByGestor: (gestorId: string) => BitrixQueueItem[];
  exportPendingCSV: (items: BitrixQueueItem[]) => void;
}

const BitrixQueueContext = createContext<BitrixQueueContextType | undefined>(undefined);

const STORAGE_KEY = "localStorage.bitrixQueue";

export function BitrixQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<BitrixQueueItem[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  const addToQueue = (item: Omit<BitrixQueueItem, "id" | "statusFila" | "timestampCriacao">): boolean => {
    // Verificar duplicidade por leadId com status pendente ou processado
    const isDuplicate = queue.some(
      (q) => q.leadId === item.leadId && (q.statusFila === "pendente" || q.statusFila === "processado")
    );

    if (isDuplicate) {
      return false;
    }

    const newItem: BitrixQueueItem = {
      ...item,
      id: `bitrix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      statusFila: "pendente",
      timestampCriacao: new Date().toISOString(),
    };

    setQueue((prev) => [...prev, newItem]);
    return true;
  };

  const updateStatus = (ids: string[], status: BitrixQueueStatus, processadoPor?: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        ids.includes(item.id)
          ? {
              ...item,
              statusFila: status,
              timestampProcessamento: status === "processado" ? new Date().toISOString() : item.timestampProcessamento,
              processadoPor: status === "processado" ? processadoPor : item.processadoPor,
            }
          : item
      )
    );
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
