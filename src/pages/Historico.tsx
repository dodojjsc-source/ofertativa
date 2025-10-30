import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useFilters } from "@/contexts/FiltersContext";
import { useUsers } from "@/contexts/UsersContext";
import { FiltersCard } from "@/components/FiltersCard";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PhoneLink } from "@/components/ui/phone-link";

export default function Historico() {
  const { user } = useAuth();
  const { leads, getLeadsByCorretor, getLeadsByGestor, deleteLead } = useLeads();
  const { filters } = useFilters();
  const { users } = useUsers();

  const getFilteredLeads = () => {
    let filtered = leads.filter((l) => 
      l.status === "atendido" || 
      l.status === "nao_atendido" ||
      (l.status === "pendente" && (l.tentativasContato || 0) > 0)
    );

    // Filtrar por role do usuário
    if (user?.role === "gestor") {
      filtered = getLeadsByGestor(user.id).filter((l) => 
        l.status === "atendido" || 
        l.status === "nao_atendido" ||
        (l.status === "pendente" && (l.tentativasContato || 0) > 0)
      );
    } else if (user?.role === "corretor") {
      filtered = getLeadsByCorretor(user.id).filter((l) => 
        l.status === "atendido" || 
        l.status === "nao_atendido" ||
        (l.status === "pendente" && (l.tentativasContato || 0) > 0)
      );
    }

    // Aplicar filtros adicionais
    if (filters.gestorId) {
      filtered = filtered.filter((l) => l.gestorId === filters.gestorId);
    }
    if (filters.corretorId) {
      filtered = filtered.filter((l) => l.corretorId === filters.corretorId);
    }
    if (filters.campanha) {
      filtered = filtered.filter((l) => 
        l.campanha?.toLowerCase().trim() === filters.campanha?.toLowerCase().trim()
      );
    }
    if (filters.feedback) {
      filtered = filtered.filter((l) => l.feedback === filters.feedback);
    }
    if (filters.startDate) {
      filtered = filtered.filter((l) => 
        l.dataAtendimento && l.dataAtendimento >= filters.startDate!
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter((l) => 
        l.dataAtendimento && l.dataAtendimento <= filters.endDate!
      );
    }

    return filtered;
  };

  const filteredLeads = getFilteredLeads();

  const handleDelete = (id: string) => {
    if (user?.role === "admin" || user?.role === "gestor") {
      deleteLead(id);
      toast({
        title: "Lead excluído",
        description: "O lead foi removido do histórico",
      });
    } else {
      toast({
        title: "Sem permissão",
        description: "Apenas Admin e Gestor podem excluir leads",
        variant: "destructive",
      });
    }
  };

  const getFeedbackBadge = (feedback?: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      interessado: "default",
      agendado: "secondary",
      recusou: "destructive",
      optout: "outline",
    };
    return (
      <Badge variant={variants[feedback || ""] || "outline"}>
        {feedback || "N/A"}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Atendimentos</h1>
          <p className="text-muted-foreground">Leads processados com sucesso</p>
        </div>

        <FiltersCard />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bitrix</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum atendimento registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>
                        <PhoneLink 
                          phone={lead.telefone}
                          e164={lead.e164}
                          whatsappUrl={lead.whatsapp_url}
                          display={lead.display_local}
                          showWhatsApp={true}
                        />
                      </TableCell>
                      <TableCell>
                        {users.find(u => u.id === lead.corretorId)?.name || "Sem corretor"}
                      </TableCell>
                      <TableCell>{lead.campanha}</TableCell>
                      <TableCell>{getFeedbackBadge(lead.feedback)}</TableCell>
                      <TableCell>
                        {lead.status === "nao_atendido" ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Não Atendido ({lead.tentativasContato || 0}/3)
                          </Badge>
                        ) : lead.status === "pendente" && (lead.tentativasContato || 0) > 0 ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            Em Contato ({lead.tentativasContato || 0}/3)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            Atendido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.repassarBitrix ? (
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.dataAtendimento
                          ? new Date(lead.dataAtendimento).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            toast({
                              title: "Observação",
                              description: lead.observacao || "Sem observação",
                            });
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(user?.role === "admin" || user?.role === "gestor") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(lead.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
