import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface FunnelChartProps {
  data: Array<{
    corretor: string;
    ligacoes: number;
    atendimentos: number;
    agendados: number;
    bitrix: number;
  }>;
}

export function FunnelChart({ data }: FunnelChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil por Corretor</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="corretor" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ligacoes" stackId="a" fill="hsl(var(--chart-1))" name="Ligações" />
            <Bar dataKey="atendimentos" stackId="a" fill="hsl(var(--chart-2))" name="Atendimentos" />
            <Bar dataKey="agendados" stackId="a" fill="hsl(var(--chart-3))" name="Agendados" />
            <Bar dataKey="bitrix" stackId="a" fill="hsl(var(--chart-4))" name="Bitrix" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
