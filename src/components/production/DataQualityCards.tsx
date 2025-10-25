import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Copy, Ban } from "lucide-react";

interface DataQualityCardsProps {
  observacaoAusente: number;
  observacaoAusentePct: number;
  duplicidades: number;
  optouts: number;
}

export function DataQualityCards({
  observacaoAusente,
  observacaoAusentePct,
  duplicidades,
  optouts,
}: DataQualityCardsProps) {
  const qualityMetrics = [
    {
      title: "Observação Ausente",
      value: `${observacaoAusentePct.toFixed(1)}%`,
      subtitle: `${observacaoAusente} atendimentos`,
      icon: AlertCircle,
      color: observacaoAusentePct === 0 ? "text-green-500" : "text-red-500",
    },
    {
      title: "Duplicidades",
      value: duplicidades,
      subtitle: "Telefones duplicados",
      icon: Copy,
      color: duplicidades === 0 ? "text-green-500" : "text-yellow-500",
    },
    {
      title: "Opt-outs Registrados",
      value: optouts,
      subtitle: "Total de opt-outs",
      icon: Ban,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {qualityMetrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{metric.title}</p>
                <p className="text-3xl font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
