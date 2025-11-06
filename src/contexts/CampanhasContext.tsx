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
      // Validação de autenticação
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      // Determinar gestor_id com base na role
      const insertData: any = {
        nome,
        total_leads: totalLeads,
      };

      // Apenas gestores devem ter gestor_id = self
      // Admins criam campanhas sem gestor_id (null)
      if (user.role === 'gestor') {
        insertData.gestor_id = user.id;
      }

      const { data, error } = await supabase
        .from("campanhas")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar campanha (primeira tentativa):", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        // Retry para erros de RLS/FK: tentar sem gestor_id
        if (
          error.code === '23503' || // FK violation
          error.message?.toLowerCase().includes('row-level security') ||
          error.message?.toLowerCase().includes('permission denied')
        ) {
          console.log("Tentando retry sem gestor_id...");
          
          const { data: retryData, error: retryError } = await supabase
            .from("campanhas")
            .insert({ nome, total_leads: totalLeads })
            .select()
            .single();

          if (retryError) {
            console.error("Erro no retry:", {
              code: retryError.code,
              message: retryError.message,
              details: retryError.details,
            });
            throw retryError;
          }

          await getCampanhas();
          return retryData.id;
        }

        throw error;
      }

      await getCampanhas();
      return data.id;
    } catch (error: any) {
      console.error("Erro final na criação de campanha:", {
        code: error.code,
        message: error.message,
        details: error.details,
        name: error.name,
      });
      
      // Mensagens de erro mais específicas com código
      let errorMessage = error.message || "Não foi possível criar a campanha";
      
      if (error.code === "42501") {
        errorMessage = "Permissão negada. Verifique suas credenciais.";
      } else if (error.code === "23503") {
        errorMessage = "Erro de referência no banco. Entre em contato com o suporte.";
      } else if (error.message?.includes("violates row-level security policy")) {
        errorMessage = "Você não tem permissão para criar campanhas.";
      } else if (error.message === "Usuário não autenticado") {
        errorMessage = "Sessão expirada. Por favor, faça login novamente.";
      }
      
      // Incluir código do erro para diagnóstico
      const displayMessage = error.code 
        ? `${errorMessage} (${error.code})`
        : errorMessage;
      
      toast({
        title: "Erro ao criar campanha",
        description: displayMessage,
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
