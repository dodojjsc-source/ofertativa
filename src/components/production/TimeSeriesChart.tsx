import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Button } from "@/components/ui/button";
import { TimeSeriesData } from "@/hooks/useMetrics";

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  corretores: Array<{ id: string; name: string }>;
}

export function TimeSeriesChart({ data, corretores }: TimeSeriesChartProps) {
  const [window, setWindow] = useState<7 | 30>(7);
  const metaDiaria = 60;

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Série Temporal - Produção Diária</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={window === 7 ? "default" : "outline"}
              onClick={() => setWindow(7)}
            >
              7 dias
            </Button>
            <Button
              size="sm"
              variant={window === 30 ? "default" : "outline"}
              onClick={() => setWindow(30)}
            >
              30 dias
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine y={metaDiaria} stroke="red" strokeDasharray="3 3" label="Meta" />
            {corretores.map((corretor, index) => (
              <Line
                key={corretor.id}
                type="monotone"
                dataKey={corretor.id}
                name={corretor.name}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
