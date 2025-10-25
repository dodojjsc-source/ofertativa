import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole = "admin" | "gestor" | "corretor";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  telefone?: string;
  role: UserRole;
  gestorId?: string;
  status: "ativo" | "inativo";
  metaDiaria?: number; // Meta de ligações diárias (default: 60)
}

interface UsersContextType {
  users: AppUser[];
  addUser: (user: Omit<AppUser, "id">) => void;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => boolean;
  getUserById: (id: string) => AppUser | undefined;
  getGestores: () => AppUser[];
  getCorretoresByGestor: (gestorId: string) => AppUser[];
  canDeleteUser: (id: string) => { canDelete: boolean; reason?: string };
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

const STORAGE_KEY = "users";

const initialUsers: AppUser[] = [
  { id: "1", name: "Admin Master", email: "admin@sistema.com", role: "admin", status: "ativo" },
  { id: "2", name: "Gestor Silva", email: "gestor@sistema.com", role: "gestor", status: "ativo" },
  { id: "3", name: "Corretor João", email: "corretor@sistema.com", telefone: "(11) 98765-4321", role: "corretor", gestorId: "2", status: "ativo" },
];

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const oldStored = localStorage.getItem("localStorage.users"); // Recuperar da chave antiga
    
    if (stored) {
      return JSON.parse(stored);
    } else if (oldStored) {
      // Migrar da chave antiga para a nova
      const oldUsers = JSON.parse(oldStored);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(oldUsers));
      localStorage.removeItem("localStorage.users");
      return oldUsers;
    }
    return initialUsers;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const addUser = (user: Omit<AppUser, "id">) => {
    const newUser: AppUser = {
      ...user,
      id: Date.now().toString(),
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, updates: Partial<AppUser>) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, ...updates } : user))
    );
  };

  const deleteUser = (id: string): boolean => {
    const { canDelete, reason } = canDeleteUser(id);
    if (!canDelete) {
      console.error(reason);
      return false;
    }
    setUsers((prev) => prev.filter((user) => user.id !== id));
    return true;
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

  const canDeleteUser = (id: string): { canDelete: boolean; reason?: string } => {
    const user = getUserById(id);
    if (!user) return { canDelete: false, reason: "Usuário não encontrado" };

    // Não permitir excluir Gestor com Corretores vinculados
    if (user.role === "gestor") {
      const corretores = getCorretoresByGestor(id);
      if (corretores.length > 0) {
        return { canDelete: false, reason: "Não é possível excluir gestor com corretores vinculados" };
      }
    }

    // Verificar se tem lote em aberto (leads pendentes)
    const leadsData = localStorage.getItem("leads");
    if (leadsData) {
      const leads = JSON.parse(leadsData);
      const hasOpenLote = leads.some(
        (lead: any) => 
          lead.status === "pendente" && 
          (lead.corretorId === id || lead.gestorId === id)
      );
      if (hasOpenLote) {
        return { canDelete: false, reason: "Não é possível excluir usuário com lote em aberto" };
      }
    }

    return { canDelete: true };
  };

  return (
    <UsersContext.Provider
      value={{
        users,
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
