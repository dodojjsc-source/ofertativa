import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { FeedbackMix } from "@/hooks/useMetrics";

interface FeedbackDonutProps {
  data: FeedbackMix[];
  corretores: Array<{ id: string; name: string }>;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

export function FeedbackDonut({ data, corretores }: FeedbackDonutProps) {
  // Agregar todos os feedbacks
  const aggregated = data.reduce(
    (acc, curr) => ({
      interessado: acc.interessado + curr.interessado,
      agendado: acc.agendado + curr.agendado,
      recusou: acc.recusou + curr.recusou,
      optout: acc.optout + curr.optout,
    }),
    { interessado: 0, agendado: 0, recusou: 0, optout: 0 }
  );

  const chartData = [
    { name: "Interessado", value: aggregated.interessado },
    { name: "Agendado", value: aggregated.agendado },
    { name: "Recusou", value: aggregated.recusou },
    { name: "Opt-out", value: aggregated.optout },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mix de Feedbacks</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
