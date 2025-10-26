import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UsersProvider } from "@/contexts/UsersContext";
import { LeadsProvider } from "@/contexts/LeadsContext";
import { CampanhasProvider } from "@/contexts/CampanhasContext";
import { FiltersProvider } from "@/contexts/FiltersContext";
import { BitrixQueueProvider } from "@/contexts/BitrixQueueContext";
import { AssignmentsProvider } from "@/contexts/AssignmentsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Producao from "./pages/Producao";
import CorretorDetail from "./pages/CorretorDetail";
import Upload from "./pages/Upload";
import Atendimento from "./pages/Atendimento";
import Historico from "./pages/Historico";
import FilaBitrix from "./pages/FilaBitrix";
import Usuarios from "./pages/Usuarios";
import Campanhas from "./pages/Campanhas";
import CampanhaLeads from "./pages/CampanhaLeads";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UsersProvider>
        <LeadsProvider>
          <CampanhasProvider>
            <AssignmentsProvider>
              <BitrixQueueProvider>
                <FiltersProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/accept-invite" element={<AcceptInvite />} />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/producao"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "gestor"]}>
                            <Producao />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/producao/corretor/:id"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "gestor"]}>
                            <CorretorDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/upload"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "gestor"]}>
                            <Upload />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/atendimento"
                        element={
                          <ProtectedRoute>
                            <Atendimento />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/historico"
                        element={
                          <ProtectedRoute>
                            <Historico />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/fila-bitrix"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "gestor"]}>
                            <FilaBitrix />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/usuarios"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "gestor"]}>
                            <Usuarios />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/campanhas"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "gestor"]}>
                            <Campanhas />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/campanhas/:campanhaId/leads"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "gestor"]}>
                            <CampanhaLeads />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
                </FiltersProvider>
              </BitrixQueueProvider>
            </AssignmentsProvider>
          </CampanhasProvider>
        </LeadsProvider>
      </UsersProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
