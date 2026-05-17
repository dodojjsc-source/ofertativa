import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Upload, Phone, History, Users, FolderOpen, Send, BarChart3, AlertCircle, UserX, PhoneOff, LogOut, Database } from "lucide-react";
import { cn } from "@/lib/utils";
export function Layout({
  children
}: {
  children: ReactNode;
}) {
  const {
    user,
    logout
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/");
  };
  const navItems = [{
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "gestor", "corretor"]
  }, {
    path: "/producao",
    label: "Produção",
    icon: BarChart3,
    roles: ["admin", "gestor"]
  }, {
    path: "/upload",
    label: "Upload",
    icon: Upload,
    roles: ["admin", "gestor"]
  }, {
    path: "/atendimento",
    label: "Atendimento",
    icon: Phone,
    roles: ["corretor"]
  }, {
    path: "/historico",
    label: "Histórico",
    icon: History,
    roles: ["admin", "gestor", "corretor"]
  }, {
    path: "/fila-bitrix",
    label: "Fila Bitrix",
    icon: Send,
    roles: ["admin", "gestor"]
  }, {
    path: "/usuarios",
    label: "Usuários",
    icon: Users,
    roles: ["admin"]
  }, {
    path: "/campanhas",
    label: "Campanhas",
    icon: FolderOpen,
    roles: ["admin"]
  }, {
    path: "/contatos-errados",
    label: "Contatos Errados",
    icon: AlertCircle,
    roles: ["admin"]
  }, {
    path: "/optout-contacts",
    label: "Opt-out",
    icon: UserX,
    roles: ["admin"]
  }, {
    path: "/nao-atendidos",
    label: "Não Atendidos",
    icon: PhoneOff,
    roles: ["admin"]
  }, {
    path: "/backfill-telefones",
    label: "Normalizar Telefones",
    icon: Database,
    roles: ["admin"]
  }];
  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));
  return <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <img
              src="https://hub.intelbuzz.com.br/static/logo-buzz.png"
              alt="Buzz Imobiliária"
              className="h-9 w-9 object-contain"
            />
            <h1 className="text-2xl font-bold text-primary">OfertAtiva</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-3">{user?.name}</p>
          <p className="text-xs text-accent capitalize">{user?.role}</p>
        </div>
        
        <nav className="flex-1 px-3">
          {filteredNavItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return <Link key={item.path} to={item.path}>
                <Button variant={isActive ? "default" : "ghost"} className={cn("w-full justify-start mb-1", isActive && "bg-primary text-primary-foreground")}>
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>;
        })}
        </nav>

        <div className="p-3 flex flex-col gap-3">
          <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-3 h-4 w-4" />
            Sair
          </Button>
          <div className="flex justify-center pt-2 border-t border-border">
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white border border-border shadow-sm">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[#fff4dc] to-[#ffd69a]">
                <img
                  src="https://hub.intelbuzz.com.br/static/logo-buzz.png"
                  alt=""
                  className="w-5 h-5 object-contain"
                />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[8px] tracking-[2px] uppercase text-muted-foreground">Powered by</span>
                <span className="text-[11px] font-bold text-foreground mt-0.5">
                  Intel<span className="text-[#ff7a1a]">Buzz</span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>;
}