import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, PackageOpen } from "lucide-react";
import { useLeads } from "@/contexts/LeadsContext";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { useState } from "react";
import { EditarLeadDialog } from "@/components/campanhas/EditarLeadDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function CampanhaLeads() {
  const { campanhaId } = useParams<{ campanhaId: string }>();
  const navigate = useNavigate();
  const { leads, deleteLead } = useLeads();
  const { campanhas } = useCampanhas();
  
  const campanha = campanhas.find(c => c.id === campanhaId);
  const campanhaLeads = leads.filter(l => l.campanhaId === campanhaId);
  
  const [leadParaEditar, setLeadParaEditar] = useState<any>(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [leadParaDeletar, setLeadParaDeletar] = useState<string | null>(null);

  const handleDeletarLead = async () => {
    if (!leadParaDeletar) return;
    
    await deleteLead(leadParaDeletar);
    toast({ title: "Lead deletado com sucesso" });
    setLeadParaDeletar(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      atendido: "default",
      pendente: "secondary",
      nao_atendido: "outline",
    };
    return variants[status] || "outline";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campanhas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{campanha?.nome || "Campanha"}</h1>
              <p className="text-muted-foreground">{campanhaLeads.length} leads nesta campanha</p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanhaLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <PackageOpen className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhum lead nesta campanha</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  campanhaLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>{lead.telefone}</TableCell>
                      <TableCell>{lead.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(lead.status)}>
                          {lead.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.feedback || "-"}</TableCell>
                      <TableCell>{lead.tentativasContato || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setLeadParaEditar(lead);
                              setModalEdicaoAberto(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setLeadParaDeletar(lead.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {leadParaEditar && (
          <EditarLeadDialog
            lead={leadParaEditar}
            open={modalEdicaoAberto}
            onOpenChange={(open) => {
              setModalEdicaoAberto(open);
              if (!open) setLeadParaEditar(null);
            }}
          />
        )}

        <AlertDialog open={!!leadParaDeletar} onOpenChange={() => setLeadParaDeletar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O lead será permanentemente removido.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletarLead} className="bg-destructive hover:bg-destructive/90">
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
