import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Upload, 
  Phone, 
  History, 
  Users, 
  FolderOpen,
  Send,
  BarChart3,
  AlertCircle,
  UserX,
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gestor", "corretor"] },
    { path: "/producao", label: "Produção", icon: BarChart3, roles: ["admin", "gestor"] },
    { path: "/upload", label: "Upload", icon: Upload, roles: ["admin", "gestor"] },
    { path: "/atendimento", label: "Atendimento", icon: Phone, roles: ["corretor"] },
    { path: "/historico", label: "Histórico", icon: History, roles: ["admin", "gestor", "corretor"] },
    { path: "/fila-bitrix", label: "Fila Bitrix", icon: Send, roles: ["admin", "gestor"] },
    { path: "/usuarios", label: "Usuários", icon: Users, roles: ["admin"] },
    { path: "/campanhas", label: "Campanhas", icon: FolderOpen, roles: ["admin"] },
    { path: "/contatos-errados", label: "Contatos Errados", icon: AlertCircle, roles: ["admin"] },
    { path: "/optout-contacts", label: "Opt-out", icon: UserX, roles: ["admin"] },
  ];

  const filteredNavItems = navItems.filter((item) =>
    user && item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">Oferta Ativa</h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.name}</p>
          <p className="text-xs text-accent capitalize">{user?.role}</p>
        </div>
        
        <nav className="flex-1 px-3">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start mb-1",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
