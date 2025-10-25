import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "gestor" | "corretor";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gestorId?: string; // Para corretores, vincula ao gestor
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users
const mockUsers: User[] = [
  { id: "1", name: "Admin Master", email: "admin@sistema.com", role: "admin" },
  { id: "2", name: "Gestor Silva", email: "gestor@sistema.com", role: "gestor" },
  { id: "3", name: "Corretor João", email: "corretor@sistema.com", role: "corretor", gestorId: "2" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    // Mock login - aceita qualquer senha
    const foundUser = mockUsers.find((u) => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
