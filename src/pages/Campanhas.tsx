import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default function Campanhas() {
  const mockCampanhas = [
    { id: "1", nome: "Campanha Janeiro 2025", leads: 45, atendidos: 23, status: "ativa" },
    { id: "2", nome: "Campanha Dezembro 2024", leads: 80, atendidos: 80, status: "concluída" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campanhas</h1>
            <p className="text-muted-foreground">Gerenciar campanhas de leads</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Campanha
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Total de Leads</TableHead>
                  <TableHead>Atendidos</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCampanhas.map((campanha) => {
                  const progresso = ((campanha.atendidos / campanha.leads) * 100).toFixed(0);
                  return (
                    <TableRow key={campanha.id}>
                      <TableCell className="font-medium">{campanha.nome}</TableCell>
                      <TableCell>{campanha.leads}</TableCell>
                      <TableCell>{campanha.atendidos}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${progresso}%` }}
                            />
                          </div>
                          <span className="text-sm">{progresso}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={campanha.status === "ativa" ? "default" : "secondary"}>
                          {campanha.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
