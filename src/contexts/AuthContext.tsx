import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole = "admin" | "gestor" | "corretor";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gestorId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userId: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "localStorage.session.currentUser";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const login = (userId: string): boolean => {
    const usersData = localStorage.getItem("users");
    if (!usersData) return false;

    const users = JSON.parse(usersData);
    const foundUser = users.find((u: any) => u.id === userId && u.status === "ativo");
    
    if (foundUser) {
      setUser({
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        gestorId: foundUser.gestorId,
      });
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
