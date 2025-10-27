import { Layout } from "@/components/Layout";
import { useFilters } from "@/contexts/FiltersContext";
import { useMetrics } from "@/hooks/useMetrics";
import { useUsers } from "@/contexts/UsersContext";
import { ProductionFilters } from "@/components/production/ProductionFilters";
import { KPICards } from "@/components/production/KPICards";
import { RankingTable } from "@/components/production/RankingTable";
import { FunnelChart } from "@/components/production/FunnelChart";
import { TimeSeriesChart } from "@/components/production/TimeSeriesChart";
import { HeatmapChart } from "@/components/production/HeatmapChart";
import { FeedbackDonut } from "@/components/production/FeedbackDonut";
import { BatchProgress } from "@/components/production/BatchProgress";
import { BitrixQueueTable } from "@/components/production/BitrixQueueTable";
import { DataQualityCards } from "@/components/production/DataQualityCards";

export default function Producao() {
  const { filters } = useFilters();
  const { users } = useUsers();
  const metrics = useMetrics(filters);

  const corretores = users
    .filter(u => u.role === "corretor" && u.status === "ativo")
    .map(u => ({ id: u.id, name: u.name }));

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Painel de Produção</h1>
          <p className="text-muted-foreground">
            Análise completa de performance por corretor
          </p>
        </div>

        {/* Filtros */}
        <ProductionFilters />

        {/* KPIs Principais */}
        <KPICards
          ligacoes={metrics.ligacoes}
          atendimentos={metrics.atendimentos}
          taxaSucesso={metrics.taxaSucesso}
          filaPendente={metrics.filaPendente}
          variacaoDia={metrics.variacaoDia}
          variacao7Dias={metrics.variacao7Dias}
          sparklineData={metrics.sparklineData}
        />

        {/* Ranking */}
        <RankingTable ranking={metrics.rankingCorretores} />

        {/* Gráficos de Análise */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FunnelChart data={metrics.funnelData} />
          <TimeSeriesChart data={metrics.timeSeriesData} corretores={corretores} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HeatmapChart data={metrics.heatmapData} />
          <FeedbackDonut data={metrics.feedbackMix} corretores={corretores} />
        </div>

        {/* Lotes & Fila Bitrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BatchProgress ranking={metrics.rankingCorretores} />
          <BitrixQueueTable />
        </div>

        {/* Qualidade de Dados */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Qualidade de Dados</h2>
          <DataQualityCards
            observacaoAusente={metrics.dataQuality.observacaoAusente}
            observacaoAusentePct={metrics.dataQuality.observacaoAusentePct}
            duplicidades={metrics.dataQuality.duplicidades}
            optouts={metrics.dataQuality.optouts}
          />
        </div>
      </div>
    </Layout>
  );
}
