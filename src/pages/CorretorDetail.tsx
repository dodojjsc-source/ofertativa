import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useUsers } from "@/contexts/UsersContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useBitrixQueue } from "@/contexts/BitrixQueueContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, CheckCircle, TrendingUp, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CorretorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { users } = useUsers();
  const { leads } = useLeads();
  const { queue } = useBitrixQueue();

  const corretor = users.find(u => u.id === id);
  const gestor = users.find(u => u.id === corretor?.gestorId);

  if (!corretor) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Corretor não encontrado</h2>
          <Button onClick={() => navigate("/producao")} className="mt-4">
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  // Validação de acesso: corretor só pode ver seu próprio perfil
  if (currentUser?.role === "corretor" && currentUser.id !== id) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Acesso negado</h2>
          <p className="text-muted-foreground mt-2">
            Você só pode visualizar seu próprio perfil
          </p>
          <Button onClick={() => navigate(`/corretor/${currentUser.id}`)} className="mt-4">
            Ver Meu Perfil
          </Button>
        </div>
      </Layout>
    );
  }

  // Validação de acesso: gestor só pode ver corretores da sua equipe
  if (currentUser?.role === "gestor" && corretor?.gestorId !== currentUser.id) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Acesso negado</h2>
          <p className="text-muted-foreground mt-2">
            Este corretor não está na sua equipe
          </p>
          <Button onClick={() => navigate("/producao")} className="mt-4">
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  const corretorLeads = leads.filter(l => l.corretorId === id);
  const atendimentos = corretorLeads.filter(l => l.status === "atendido").length;
  const naoAtendimentos = corretorLeads.reduce((acc, l) => {
    if (l.status === "atendido") return acc;
    return acc + (l.tentativasContato || 0);
  }, 0);
  const ligacoes = atendimentos + naoAtendimentos;
  const taxaSucesso = ligacoes > 0 ? (atendimentos / ligacoes) * 100 : 0;
  const filaPendente = queue.filter(q => q.corretorId === id && q.statusFila === "pendente").length;

  const atendidosRecentes = corretorLeads
    .filter(l => l.status === "atendido" && l.dataAtendimento)
    .sort((a, b) => {
      if (!a.dataAtendimento || !b.dataAtendimento) return 0;
      return parseISO(b.dataAtendimento).getTime() - parseISO(a.dataAtendimento).getTime();
    })
    .slice(0, 10);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/producao")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{corretor.name}</h1>
              <p className="text-muted-foreground">
                {corretor.email} • Gestor: {gestor?.name || "Sem gestor"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {corretor.role}
          </Badge>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ligações</p>
                  <p className="text-3xl font-bold">{ligacoes}</p>
                </div>
                <Phone className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atendimentos</p>
                  <p className="text-3xl font-bold">{atendimentos}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  <p className="text-3xl font-bold">{taxaSucesso.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fila Pendente</p>
                  <p className="text-3xl font-bold">{filaPendente}</p>
                </div>
                <Send className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Atendimentos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Atendimentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atendidosRecentes.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.nome}</TableCell>
                    <TableCell>{lead.telefone}</TableCell>
                    <TableCell className="text-xs">{lead.campanha}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.feedback}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.dataAtendimento && formatDistanceToNow(parseISO(lead.dataAtendimento), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate">
                      {lead.observacao || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <div className="flex gap-4">
          <Button onClick={() => navigate("/historico")}>
            Ver Histórico Completo
          </Button>
          <Button variant="outline" onClick={() => navigate("/fila-bitrix")}>
            Ver Fila Bitrix
          </Button>
        </div>
      </div>
    </Layout>
  );
}
