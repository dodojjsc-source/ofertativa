import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/contexts/LeadsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, TrendingUp, Users } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { leads, getLeadsByCorretor, getLeadsByGestor } = useLeads();

  const getFilteredLeads = () => {
    if (user?.role === "admin") return leads;
    if (user?.role === "gestor") return getLeadsByGestor(user.id);
    if (user?.role === "corretor") return getLeadsByCorretor(user.id);
    return [];
  };

  const filteredLeads = getFilteredLeads();
  const totalLeads = filteredLeads.length;
  const atendidos = filteredLeads.filter((l) => l.status === "atendido").length;
  const naoAtendidos = filteredLeads.filter((l) => l.status === "nao_atendido").length;
  const pendentes = filteredLeads.filter((l) => l.status === "pendente").length;
  const taxaSucesso = totalLeads > 0 ? ((atendidos / totalLeads) * 100).toFixed(1) : "0";

  const feedbackStats = {
    interessado: filteredLeads.filter((l) => l.feedback === "interessado").length,
    agendado: filteredLeads.filter((l) => l.feedback === "agendado").length,
    recusou: filteredLeads.filter((l) => l.feedback === "recusou").length,
    optout: filteredLeads.filter((l) => l.feedback === "optout").length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do desempenho</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Ligações
              </CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atendimentos
              </CardTitle>
              <Phone className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{atendidos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Não Atendidos
              </CardTitle>
              <PhoneOff className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{naoAtendidos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Sucesso
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{taxaSucesso}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Interessado</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${atendidos > 0 ? (feedbackStats.interessado / atendidos) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{feedbackStats.interessado}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Agendado</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${atendidos > 0 ? (feedbackStats.agendado / atendidos) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{feedbackStats.agendado}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Recusou</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${atendidos > 0 ? (feedbackStats.recusou / atendidos) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{feedbackStats.recusou}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Opt-out</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${atendidos > 0 ? (feedbackStats.optout / atendidos) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{feedbackStats.optout}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status dos Leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pendentes</span>
                  <span className="font-semibold">{pendentes}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${totalLeads > 0 ? (pendentes / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Atendidos</span>
                  <span className="font-semibold">{atendidos}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${totalLeads > 0 ? (atendidos / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Não Atendidos</span>
                  <span className="font-semibold">{naoAtendidos}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${totalLeads > 0 ? (naoAtendidos / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
