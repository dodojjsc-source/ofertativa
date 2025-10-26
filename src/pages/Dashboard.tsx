import { Layout } from "@/components/Layout";
import { useFilters } from "@/contexts/FiltersContext";
import { useMetrics } from "@/hooks/useMetrics";
import { FiltersCard } from "@/components/FiltersCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, TrendingUp, Users } from "lucide-react";

export default function Dashboard() {
  const { filters } = useFilters();
  const metrics = useMetrics(filters);

  // Calcular totais de feedback (incluindo opt-outs)
  const totalFeedbacks = metrics.feedbackMix.reduce((sum, c) => 
    sum + c.interessado + c.agendado + c.recusou + c.optout, 0
  );
  
  const feedbackStats = {
    interessado: metrics.feedbackMix.reduce((sum, c) => sum + c.interessado, 0),
    agendado: metrics.feedbackMix.reduce((sum, c) => sum + c.agendado, 0),
    recusou: metrics.feedbackMix.reduce((sum, c) => sum + c.recusou, 0),
    optout: metrics.feedbackMix.reduce((sum, c) => sum + c.optout, 0),
  };

  // Calcular não atendidos (ligações - atendimentos)
  const naoAtendidos = metrics.ligacoes - metrics.atendimentos;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do desempenho</p>
        </div>

        <FiltersCard />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Ligações
              </CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.ligacoes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atendimentos (com Opt-out)
              </CardTitle>
              <Phone className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.atendimentos}</div>
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
              <div className="text-3xl font-bold">{metrics.taxaSucesso.toFixed(1)}%</div>
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
                        width: `${totalFeedbacks > 0 ? (feedbackStats.interessado / totalFeedbacks) * 100 : 0}%`,
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
                        width: `${totalFeedbacks > 0 ? (feedbackStats.agendado / totalFeedbacks) * 100 : 0}%`,
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
                        width: `${totalFeedbacks > 0 ? (feedbackStats.recusou / totalFeedbacks) * 100 : 0}%`,
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
                        width: `${totalFeedbacks > 0 ? (feedbackStats.optout / totalFeedbacks) * 100 : 0}%`,
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
                  <span>Atendidos (com Opt-out)</span>
                  <span className="font-semibold">{metrics.atendimentos}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${metrics.ligacoes > 0 ? (metrics.atendimentos / metrics.ligacoes) * 100 : 0}%` }}
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
                    style={{ width: `${metrics.ligacoes > 0 ? (naoAtendidos / metrics.ligacoes) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Opt-outs</span>
                  <span className="font-semibold">{metrics.dataQuality.optouts}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${metrics.ligacoes > 0 ? (metrics.dataQuality.optouts / metrics.ligacoes) * 100 : 0}%` }}
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
