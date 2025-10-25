import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UsersProvider } from "@/contexts/UsersContext";
import { LeadsProvider } from "@/contexts/LeadsContext";
import { FiltersProvider } from "@/contexts/FiltersContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Atendimento from "./pages/Atendimento";
import Historico from "./pages/Historico";
import Usuarios from "./pages/Usuarios";
import Campanhas from "./pages/Campanhas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UsersProvider>
      <AuthProvider>
        <LeadsProvider>
          <FiltersProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
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
                      <ProtectedRoute allowedRoles={["corretor"]}>
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
                    path="/usuarios"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <Usuarios />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/campanhas"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <Campanhas />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </FiltersProvider>
        </LeadsProvider>
      </AuthProvider>
    </UsersProvider>
  </QueryClientProvider>
);

export default App;
