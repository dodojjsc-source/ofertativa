import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, PackageOpen } from "lucide-react";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useNavigate } from "react-router-dom";

export default function Campanhas() {
  const { campanhas, loading } = useCampanhas();
  const { leads } = useLeads();
  const navigate = useNavigate();

  const getCampanhaStats = (campanhaId: string) => {
    const campanhaLeads = leads.filter(l => l.campanhaId === campanhaId);
    const totalLeads = campanhaLeads.length;
    const atendidos = campanhaLeads.filter(l => l.status === "atendido").length;
    const disponiveis = campanhaLeads.filter(l => !l.corretorId).length;
    const progresso = totalLeads > 0 ? ((atendidos / totalLeads) * 100).toFixed(0) : "0";
    
    return { totalLeads, atendidos, disponiveis, progresso };
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campanhas</h1>
            <p className="text-muted-foreground">Gerenciar campanhas de leads</p>
          </div>
          <Button onClick={() => navigate("/upload")}>
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
                  <TableHead>Disponíveis</TableHead>
                  <TableHead>Atendidos</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando campanhas...
                    </TableCell>
                  </TableRow>
                ) : campanhas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <PackageOpen className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhuma campanha cadastrada</p>
                        <Button variant="outline" size="sm" onClick={() => navigate("/upload")}>
                          <Plus className="mr-2 h-4 w-4" />
                          Criar primeira campanha
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  campanhas.map((campanha) => {
                    const stats = getCampanhaStats(campanha.id);
                    return (
                      <TableRow key={campanha.id}>
                        <TableCell className="font-medium">{campanha.nome}</TableCell>
                        <TableCell>{stats.totalLeads}</TableCell>
                        <TableCell>
                          {stats.disponiveis > 0 ? (
                            <Badge variant="outline" className="bg-accent/10">
                              {stats.disponiveis} disponíveis
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>{stats.atendidos}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${stats.progresso}%` }}
                              />
                            </div>
                            <span className="text-sm">{stats.progresso}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={stats.disponiveis === 0}
                          >
                            Distribuir Lote
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
