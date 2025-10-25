import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Campanha {
  id: string;
  nome: string;
  totalLeads: number;
  gestorId?: string;
  dataUpload: string;
  createdAt: string;
}

interface CampanhasContextType {
  campanhas: Campanha[];
  loading: boolean;
  createCampanha: (nome: string, totalLeads: number) => Promise<string | null>;
  getCampanhas: () => Promise<void>;
  updateCampanha: (id: string, updates: Partial<Campanha>) => Promise<void>;
}

const CampanhasContext = createContext<CampanhasContextType | undefined>(undefined);

export function CampanhasProvider({ children }: { children: ReactNode }) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      getCampanhas();
    }
  }, [user]);

  const getCampanhas = async () => {
    try {
      const { data, error } = await supabase
        .from("campanhas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedCampanhas: Campanha[] = (data || []).map((c) => ({
        id: c.id,
        nome: c.nome,
        totalLeads: c.total_leads,
        gestorId: c.gestor_id || undefined,
        dataUpload: c.data_upload,
        createdAt: c.created_at,
      }));

      setCampanhas(mappedCampanhas);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as campanhas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampanha = async (nome: string, totalLeads: number): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("campanhas")
        .insert({
          nome,
          total_leads: totalLeads,
          gestor_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await getCampanhas();
      return data.id;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a campanha",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCampanha = async (id: string, updates: Partial<Campanha>) => {
    try {
      const dbUpdates: any = {};
      if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
      if (updates.totalLeads !== undefined) dbUpdates.total_leads = updates.totalLeads;

      const { error } = await supabase
        .from("campanhas")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;

      await getCampanhas();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a campanha",
        variant: "destructive",
      });
    }
  };

  return (
    <CampanhasContext.Provider
      value={{
        campanhas,
        loading,
        createCampanha,
        getCampanhas,
        updateCampanha,
      }}
    >
      {children}
    </CampanhasContext.Provider>
  );
}

export function useCampanhas() {
  const context = useContext(CampanhasContext);
  if (!context) {
    throw new Error("useCampanhas must be used within CampanhasProvider");
  }
  return context;
}
