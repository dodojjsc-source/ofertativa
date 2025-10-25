import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeatmapData } from "@/hooks/useMetrics";

interface HeatmapChartProps {
  data: HeatmapData[];
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const horas = Array.from({ length: 11 }, (_, i) => i + 8); // 8h às 18h

  const getColor = (value: number) => {
    if (value === 0) return "bg-gray-100 dark:bg-gray-800";
    if (value <= 2) return "bg-green-200 dark:bg-green-900";
    if (value <= 5) return "bg-green-400 dark:bg-green-700";
    if (value <= 10) return "bg-green-600 dark:bg-green-500";
    return "bg-green-800 dark:bg-green-300";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heatmap de Horários - Atendimentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex">
              <div className="w-12"></div>
              {horas.map(hora => (
                <div key={hora} className="w-12 text-center text-xs text-muted-foreground">
                  {hora}h
                </div>
              ))}
            </div>
            {dias.map(dia => (
              <div key={dia} className="flex items-center">
                <div className="w-12 text-xs text-muted-foreground">{dia}</div>
                {horas.map(hora => {
                  const cell = data.find(d => d.day === dia && d.hour === hora);
                  const value = cell?.value || 0;
                  return (
                    <div
                      key={`${dia}-${hora}`}
                      className={`w-12 h-12 m-0.5 rounded ${getColor(value)} flex items-center justify-center text-xs font-medium`}
                      title={`${dia} ${hora}h: ${value} atendimentos`}
                    >
                      {value > 0 && value}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
