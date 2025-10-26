import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, PackageOpen, Edit, Trash2, Eye, MoreVertical } from "lucide-react";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { DistribuirLoteDialog } from "@/components/campanhas/DistribuirLoteDialog";
import { EditarCampanhaDialog } from "@/components/campanhas/EditarCampanhaDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Campanhas() {
  const { campanhas, loading, getCampanhas } = useCampanhas();
  const { leads } = useLeads();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modalAberto, setModalAberto] = useState(false);
  const [campanhaParaDistribuir, setCampanhaParaDistribuir] = useState<{
    id: string;
    nome: string;
    disponiveis: number;
  } | null>(null);
  const [campanhaParaEditar, setCampanhaParaEditar] = useState<{ id: string; nome: string } | null>(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [campanhaParaDeletar, setCampanhaParaDeletar] = useState<string | null>(null);

  const getCampanhaStats = (campanhaId: string) => {
    const campanhaLeads = leads.filter(l => l.campanhaId === campanhaId);
    const totalLeads = campanhaLeads.length;
    const atendidos = campanhaLeads.filter(l => l.status === "atendido").length;
    // Disponíveis: sem corretor E que não sejam optout
    const disponiveis = campanhaLeads.filter(l => !l.corretorId && l.feedback !== "optout").length;
    const progresso = totalLeads > 0 ? ((atendidos / totalLeads) * 100).toFixed(0) : "0";
    
    return { totalLeads, atendidos, disponiveis, progresso };
  };

  const abrirModalDistribuicao = (campanha: any, stats: ReturnType<typeof getCampanhaStats>) => {
    if (stats.disponiveis === 0) return;
    
    setCampanhaParaDistribuir({
      id: campanha.id,
      nome: campanha.nome,
      disponiveis: stats.disponiveis
    });
    setModalAberto(true);
  };

  const abrirModalEdicao = (campanha: any) => {
    setCampanhaParaEditar({ id: campanha.id, nome: campanha.nome });
    setModalEdicaoAberto(true);
  };

  const handleConfirmarDelecao = async () => {
    if (!campanhaParaDeletar) return;
    
    // Deletar apenas a campanha - CASCADE cuida dos filhos automaticamente
    const { error } = await supabase
      .from("campanhas")
      .delete()
      .eq("id", campanhaParaDeletar);
    
    if (error) {
      toast({ title: "Erro ao deletar campanha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campanha deletada com sucesso" });
      await getCampanhas();
    }
    
    setCampanhaParaDeletar(null);
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
                          {user?.role === "admin" ? (
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={stats.disponiveis === 0}
                                onClick={() => abrirModalDistribuicao(campanha, stats)}
                              >
                                Distribuir Lote
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/campanhas/${campanha.id}/leads`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver Leads
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => abrirModalEdicao(campanha)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => setCampanhaParaDeletar(campanha.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Deletar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Apenas visualização</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {campanhaParaDistribuir && (
          <DistribuirLoteDialog
            campanhaId={campanhaParaDistribuir.id}
            campanhaName={campanhaParaDistribuir.nome}
            leadsDisponiveis={campanhaParaDistribuir.disponiveis}
            open={modalAberto}
            onOpenChange={(open) => {
              setModalAberto(open);
              if (!open) setCampanhaParaDistribuir(null);
            }}
          />
        )}

        {campanhaParaEditar && (
          <EditarCampanhaDialog
            campanha={campanhaParaEditar}
            open={modalEdicaoAberto}
            onOpenChange={(open) => {
              setModalEdicaoAberto(open);
              if (!open) setCampanhaParaEditar(null);
            }}
          />
        )}

        <AlertDialog open={!!campanhaParaDeletar} onOpenChange={() => setCampanhaParaDeletar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os leads desta campanha também serão deletados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmarDelecao} className="bg-destructive hover:bg-destructive/90">
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
