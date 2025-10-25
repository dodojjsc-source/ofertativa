import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CorretorMetrics } from "@/hooks/useMetrics";

interface BatchProgressProps {
  ranking: CorretorMetrics[];
}

export function BatchProgress({ ranking }: BatchProgressProps) {
  const getStatusColor = (percent: number) => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lotes & Progresso</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ranking.map((corretor) => (
            <div key={corretor.corretorId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{corretor.corretorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {corretor.concluidosLote} de {corretor.atribuidosLote} leads
                  </p>
                </div>
                <Badge className={getStatusColor(corretor.percentualLote)}>
                  {corretor.percentualLote.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={corretor.percentualLote} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
