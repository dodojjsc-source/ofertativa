import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "@/hooks/use-toast";

export type UserRole = "admin" | "gestor" | "corretor";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  telefone?: string;
  role: UserRole;
  gestorId?: string;
  status: "ativo" | "inativo";
  metaDiaria?: number;
}

interface UsersContextType {
  users: AppUser[];
  loading: boolean;
  addUser: (user: Omit<AppUser, "id">) => Promise<void>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  deleteUser: (id: string) => Promise<boolean>;
  getUserById: (id: string) => AppUser | undefined;
  getGestores: () => AppUser[];
  getCorretoresByGestor: (gestorId: string) => AppUser[];
  canDeleteUser: (id: string) => Promise<{ canDelete: boolean; reason?: string }>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .order("name");

      if (profileError) throw profileError;

      // Buscar roles de todos os usuários
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles.map(r => [r.user_id, r.role]));

      const mappedUsers: AppUser[] = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        telefone: profile.telefone || undefined,
        role: rolesMap.get(profile.id) as UserRole || "corretor",
        gestorId: profile.gestor_id || undefined,
        status: profile.status as "ativo" | "inativo",
        metaDiaria: profile.meta_diaria || 60,
      }));

      setUsers(mappedUsers);
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (user: Omit<AppUser, "id">) => {
    // Para adicionar usuários, você precisa criar através do signup do Supabase Auth
    // Esta função não deve ser usada diretamente
    toast({
      title: "Aviso",
      description: "Use o sistema de autenticação para criar novos usuários",
      variant: "destructive",
    });
  };

  const updateUser = async (id: string, updates: Partial<AppUser>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.telefone !== undefined) dbUpdates.telefone = updates.telefone;
      if (updates.gestorId !== undefined) dbUpdates.gestor_id = updates.gestorId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.metaDiaria !== undefined) dbUpdates.meta_diaria = updates.metaDiaria;

      // Atualizar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", id);

      if (profileError) throw profileError;

      // Atualizar role se fornecido
      if (updates.role !== undefined) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: updates.role })
          .eq("user_id", id);

        if (roleError) throw roleError;
      }

      await loadUsers();
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o usuário",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    const { canDelete, reason } = await canDeleteUser(id);
    if (!canDelete) {
      toast({
        title: "Erro",
        description: reason,
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);

      if (error) throw error;

      await loadUsers();
      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
      });
      return true;
    } catch (error: any) {
      console.error("Erro ao remover usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o usuário",
        variant: "destructive",
      });
      return false;
    }
  };

  const getUserById = (id: string) => {
    return users.find((user) => user.id === id);
  };

  const getGestores = () => {
    return users.filter((user) => user.role === "gestor" && user.status === "ativo");
  };

  const getCorretoresByGestor = (gestorId: string) => {
    return users.filter((user) => user.role === "corretor" && user.gestorId === gestorId);
  };

  const canDeleteUser = async (id: string): Promise<{ canDelete: boolean; reason?: string }> => {
    const user = getUserById(id);
    if (!user) return { canDelete: false, reason: "Usuário não encontrado" };

    if (user.role === "gestor") {
      const corretores = getCorretoresByGestor(id);
      if (corretores.length > 0) {
        return { canDelete: false, reason: "Não é possível excluir gestor com corretores vinculados" };
      }
    }

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("status", "pendente")
        .or(`corretor_id.eq.${id},gestor_id.eq.${id}`)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        return { canDelete: false, reason: "Não é possível excluir usuário com lote em aberto" };
      }
    } catch (error) {
      console.error("Erro ao verificar leads:", error);
    }

    return { canDelete: true };
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        loading,
        addUser,
        updateUser,
        deleteUser,
        getUserById,
        getGestores,
        getCorretoresByGestor,
        canDeleteUser,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error("useUsers must be used within UsersProvider");
  }
  return context;
}
