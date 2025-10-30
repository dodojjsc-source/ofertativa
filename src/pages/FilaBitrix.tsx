import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useBitrixQueue, BitrixQueueStatus } from "@/contexts/BitrixQueueContext";
import { useUsers } from "@/contexts/UsersContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, XCircle, Trash2, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PhoneLink } from "@/components/ui/phone-link";

export default function FilaBitrix() {
  const { user } = useAuth();
  const { queue, updateStatus, getQueueByGestor, exportPendingCSV } = useBitrixQueue();
  const { users } = useUsers();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: "todos",
    gestorId: "todos",
    corretorId: "todos",
    campanhaId: "todos",
    feedback: "todos",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Filtrar dados baseado no perfil do usuário
  const visibleQueue = useMemo(() => {
    if (!user) return [];
    
    let items = user.role === "admin" ? queue : getQueueByGestor(user.id);
    
    // Aplicar filtros
    if (filters.status !== "todos") {
      items = items.filter((item) => item.statusFila === filters.status);
    }
    if (filters.gestorId !== "todos") {
      items = items.filter((item) => item.gestorId === filters.gestorId);
    }
    if (filters.corretorId !== "todos") {
      items = items.filter((item) => item.corretorId === filters.corretorId);
    }
    if (filters.campanhaId !== "todos") {
      items = items.filter((item) => item.campanhaId === filters.campanhaId);
    }
    if (filters.feedback !== "todos") {
      items = items.filter((item) => item.feedback === filters.feedback);
    }
    if (filters.startDate) {
      items = items.filter((item) => item.timestampCriacao >= filters.startDate);
    }
    if (filters.endDate) {
      items = items.filter((item) => item.timestampCriacao <= filters.endDate + "T23:59:59");
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.nome.toLowerCase().includes(search) ||
          item.telefone.includes(search) ||
          item.e164?.includes(search) ||
          item.displayLocal?.toLowerCase().includes(search) ||
          item.email?.toLowerCase().includes(search)
      );
    }

    return items;
  }, [queue, user, filters, getQueueByGestor]);

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    return {
      pendentes: visibleQueue.filter((item) => item.statusFila === "pendente").length,
      processadosHoje: visibleQueue.filter(
        (item) => item.statusFila === "processado" && item.timestampProcessamento?.startsWith(today)
      ).length,
      processadosMes: visibleQueue.filter(
        (item) => item.statusFila === "processado" && item.timestampProcessamento && item.timestampProcessamento >= startOfMonth
      ).length,
      erros: visibleQueue.filter((item) => item.statusFila === "erro").length,
    };
  }, [visibleQueue]);

  // Opções para filtros
  const gestores = useMemo(() => users.filter((u) => u.role === "gestor"), [users]);
  const corretores = useMemo(() => users.filter((u) => u.role === "corretor"), [users]);
  const campanhas = useMemo(() => {
    const unique = Array.from(new Set(queue.map((item) => item.campanhaId)));
    return unique.map((id) => ({
      id,
      nome: queue.find((item) => item.campanhaId === id)?.campanhaNome || id,
    }));
  }, [queue]);
  const feedbackOptions = ["interessado", "agendado", "recusou", "optout"];

  const handleSelectAll = () => {
    if (selectedIds.length === visibleQueue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleQueue.map((item) => item.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (status: BitrixQueueStatus) => {
    if (selectedIds.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione ao menos um item para realizar esta ação",
        variant: "destructive",
      });
      return;
    }

    updateStatus(selectedIds, status, user?.name);
    setSelectedIds([]);
    
    const statusLabel = {
      processado: "processados",
      erro: "marcados como erro",
      descartado: "descartados",
      pendente: "pendentes"
    };

    toast({
      title: "Ação realizada com sucesso",
      description: `${selectedIds.length} item(s) ${statusLabel[status]}`,
    });
  };

  const handleExport = () => {
    exportPendingCSV(visibleQueue);
    toast({
      title: "Exportação concluída",
      description: "CSV com leads pendentes foi baixado",
    });
  };

  const getStatusBadge = (status: BitrixQueueStatus) => {
    const variants: Record<BitrixQueueStatus, "default" | "secondary" | "destructive" | "outline"> = {
      pendente: "default",
      processado: "secondary",
      erro: "destructive",
      descartado: "outline",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const resetFilters = () => {
    setFilters({
      status: "todos",
      gestorId: "todos",
      corretorId: "todos",
      campanhaId: "todos",
      feedback: "todos",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fila Bitrix</h1>
          <p className="text-muted-foreground">Gerencie leads para repasse ao Bitrix</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpis.pendentes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processados Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpis.processadosHoje}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processados Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpis.processadosMes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Erros</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">{kpis.erros}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Limpar Filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Busca</Label>
                <Input
                  placeholder="Nome, telefone..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="processado">Processado</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {user?.role === "admin" && (
                <div className="space-y-2">
                  <Label>Gestor</Label>
                  <Select value={filters.gestorId} onValueChange={(v) => setFilters({ ...filters, gestorId: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {gestores.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Corretor</Label>
                <Select value={filters.corretorId} onValueChange={(v) => setFilters({ ...filters, corretorId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {corretores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campanha</Label>
                <Select value={filters.campanhaId} onValueChange={(v) => setFilters({ ...filters, campanhaId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {campanhas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Feedback</Label>
                <Select value={filters.feedback} onValueChange={(v) => setFilters({ ...filters, feedback: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {feedbackOptions.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações em massa */}
        <Card>
          <CardHeader>
            <CardTitle>Ações em Massa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" onClick={() => handleBulkAction("processado")} disabled={selectedIds.length === 0}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Marcar como Processado ({selectedIds.length})
              </Button>
              <Button variant="destructive" onClick={() => handleBulkAction("erro")} disabled={selectedIds.length === 0}>
                <XCircle className="mr-2 h-4 w-4" />
                Marcar como Erro ({selectedIds.length})
              </Button>
              <Button variant="outline" onClick={() => handleBulkAction("descartado")} disabled={selectedIds.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Descartar ({selectedIds.length})
              </Button>
              <Button variant="secondary" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV (Pendentes)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Itens na Fila ({visibleQueue.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === visibleQueue.length && visibleQueue.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleQueue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      Nenhum item encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleQueue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() => handleSelectOne(item.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(item.timestampCriacao), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>
                        <PhoneLink 
                          phone={item.telefone}
                          e164={item.e164}
                          display={item.displayLocal}
                          whatsappUrl={item.whatsappUrl}
                          showWhatsApp
                        />
                      </TableCell>
                      <TableCell>{item.corretorNome}</TableCell>
                      <TableCell>{item.gestorNome}</TableCell>
                      <TableCell className="text-sm">{item.campanhaNome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.feedback}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.statusFila)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.statusFila === "pendente" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateStatus([item.id], "processado", user?.name)}
                                title="Marcar como Processado"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateStatus([item.id], "erro")}
                                title="Marcar como Erro"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateStatus([item.id], "descartado")}
                                title="Descartar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
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
