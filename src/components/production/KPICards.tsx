import { Card, CardContent } from "@/components/ui/card";
import { Phone, CheckCircle, TrendingUp, Send } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface KPICardsProps {
  ligacoes: number;
  atendimentos: number;
  taxaSucesso: number;
  filaPendente: number;
  variacaoDia: number;
  variacao7Dias: number;
  sparklineData: Array<{ date: string; value: number }>;
}

export function KPICards({
  ligacoes,
  atendimentos,
  taxaSucesso,
  filaPendente,
  variacaoDia,
  variacao7Dias,
  sparklineData,
}: KPICardsProps) {
  const kpis = [
    {
      title: "Ligações",
      value: ligacoes,
      icon: Phone,
      variacao: variacaoDia,
      color: "text-blue-500",
    },
    {
      title: "Atendimentos",
      value: atendimentos,
      icon: CheckCircle,
      variacao: variacaoDia,
      color: "text-green-500",
    },
    {
      title: "Taxa de Sucesso",
      value: `${taxaSucesso.toFixed(1)}%`,
      icon: TrendingUp,
      variacao: variacao7Dias,
      color: "text-purple-500",
    },
    {
      title: "Fila Bitrix Pendente",
      value: filaPendente,
      icon: Send,
      variacao: 0,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <p className="text-3xl font-bold">{kpi.value}</p>
                <div className="flex items-center gap-1 text-xs">
                  {kpi.variacao !== 0 && (
                    <span className={kpi.variacao > 0 ? "text-green-500" : "text-red-500"}>
                      {kpi.variacao > 0 ? "+" : ""}{kpi.variacao.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-muted-foreground">vs 7d</span>
                </div>
              </div>
              <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
            </div>

            {/* Sparkline */}
            <div className="mt-4 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
