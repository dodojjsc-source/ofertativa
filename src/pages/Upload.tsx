import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useUsers, AppUser } from "@/contexts/UsersContext";
import { useAssignments } from "@/contexts/AssignmentsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload as UploadIcon, FileSpreadsheet, RefreshCw, Undo2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Upload() {
  const { user } = useAuth();
  const { leads, addLeads } = useLeads();
  const { users } = useUsers();
  const { addAssignments, getPendingCountByCorretor, getAssignmentsByCampanha, isLeadAssigned, undoLastDistribution } = useAssignments();
  
  const [loteSize, setLoteSize] = useState(20);
  const [campanha, setCampanha] = useState("");
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([]);
  const [corretoresElegiveis, setCorretoresElegiveis] = useState<AppUser[]>([]);

  const loadCorretoresElegiveis = () => {
    // Sempre buscar do localStorage sem cache
    const storedUsers = localStorage.getItem("users");
    const allUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : [];

    const eligible = allUsers.filter((u) => {
      if (u.role !== "corretor" || u.status !== "ativo") return false;
      
      // Admin vê todos os corretores ativos
      if (user?.role === "admin") return true;
      
      // Gestor vê apenas seus corretores
      if (user?.role === "gestor") return u.gestorId === user.id;
      
      return false;
    });

    setCorretoresElegiveis(eligible);
  };

  useEffect(() => {
    loadCorretoresElegiveis();
  }, [user]);

  const toggleCorretor = (corretorId: string) => {
    setSelectedCorretores((prev) =>
      prev.includes(corretorId)
        ? prev.filter((id) => id !== corretorId)
        : [...prev, corretorId]
    );
  };

  const handleDistribuir = () => {
    if (!campanha) {
      toast({
        title: "Erro",
        description: "Informe o nome da campanha",
        variant: "destructive",
      });
      return;
    }

    if (selectedCorretores.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um corretor",
        variant: "destructive",
      });
      return;
    }

    // 1. Gerar leads mock para a campanha
    const totalLeadsNeeded = loteSize * selectedCorretores.length;
    const mockImportedLeads = Array.from({ length: totalLeadsNeeded }, (_, i) => ({
      id: `lead-${campanha}-${Date.now()}-${i}`,
      nome: `Lead ${i + 1}`,
      telefone: `(11) 9${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
      email: `lead${i + 1}@email.com`,
      campanha: campanha,
      corretorId: "",
      gestorId: user?.id || "",
      status: "pendente" as const,
    }));

    addLeads(mockImportedLeads);

    // 2. Buscar pool de leads não atribuídos da campanha
    const campanhaId = campanha;
    const assignedSet = new Set(
      getAssignmentsByCampanha(campanhaId).map((a) => a.leadId)
    );
    
    const allLeads = [...leads, ...mockImportedLeads];
    const pool = allLeads.filter(
      (l) => l.campanha === campanhaId && !assignedSet.has(l.id)
    );

    // 3. Distribuição round-robin
    const newAssignments: Array<{
      campanhaId: string;
      leadId: string;
      corretorId: string;
      statusDistribuicao: "pendente";
    }> = [];

    const corretoresCount: Record<string, number> = {};
    selectedCorretores.forEach((id) => (corretoresCount[id] = 0));

    let corretorIndex = 0;
    for (const lead of pool) {
      const corretorId = selectedCorretores[corretorIndex];
      
      // Verificar duplicidade
      if (isLeadAssigned(campanhaId, lead.id)) continue;

      // Verificar se corretor já atingiu o limite
      if (corretoresCount[corretorId] >= loteSize) {
        // Tentar próximo corretor
        const nextIndex = (corretorIndex + 1) % selectedCorretores.length;
        if (nextIndex === 0) break; // Todos atingiram limite
        corretorIndex = nextIndex;
        continue;
      }

      newAssignments.push({
        campanhaId,
        leadId: lead.id,
        corretorId,
        statusDistribuicao: "pendente",
      });

      corretoresCount[corretorId]++;
      corretorIndex = (corretorIndex + 1) % selectedCorretores.length;
    }

    if (newAssignments.length === 0) {
      toast({
        title: "Atenção",
        description: "Nenhum lead disponível para distribuição",
        variant: "destructive",
      });
      return;
    }

    addAssignments(newAssignments);

    // 4. Resumo
    const resumo = selectedCorretores.map((corretorId) => {
      const corretor = corretoresElegiveis.find((c) => c.id === corretorId);
      return `${corretor?.name}: ${corretoresCount[corretorId] || 0} leads`;
    });

    toast({
      title: "Distribuição realizada",
      description: resumo.join(" | "),
    });

    setCampanha("");
    setSelectedCorretores([]);
  };

  const handleUndo = () => {
    if (undoLastDistribution()) {
      toast({
        title: "Distribuição revertida",
        description: "A última distribuição foi desfeita",
      });
    } else {
      toast({
        title: "Nada para reverter",
        description: "Nenhuma distribuição recente encontrada",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Upload e Distribuição</h1>
            <p className="text-muted-foreground">Importar planilha e distribuir leads</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadCorretoresElegiveis}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Equipe
            </Button>
            <Button variant="outline" onClick={handleUndo}>
              <Undo2 className="mr-2 h-4 w-4" />
              Reverter Última
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5 text-accent" />
                Configuração da Distribuição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="campanha">Nome da Campanha</Label>
                <Input
                  id="campanha"
                  placeholder="Ex: Campanha Janeiro 2025"
                  value={campanha}
                  onChange={(e) => setCampanha(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lote">Tamanho do Lote por Corretor</Label>
                <Input
                  id="lote"
                  type="number"
                  min="1"
                  max="100"
                  value={loteSize}
                  onChange={(e) => setLoteSize(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade de leads que cada corretor selecionado receberá
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Corretores Elegíveis</Label>
                  <Badge variant="outline">
                    {corretoresElegiveis.length} disponíveis
                  </Badge>
                </div>

                {corretoresElegiveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum corretor ativo encontrado
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {corretoresElegiveis.map((corretor) => {
                      const pendingCount = getPendingCountByCorretor(corretor.id);
                      return (
                        <div
                          key={corretor.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-accent/5"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedCorretores.includes(corretor.id)}
                              onCheckedChange={() => toggleCorretor(corretor.id)}
                            />
                            <div>
                              <p className="font-medium text-sm">{corretor.name}</p>
                              <p className="text-xs text-muted-foreground">{corretor.email}</p>
                            </div>
                          </div>
                          {pendingCount > 0 && (
                            <Badge variant="secondary">
                              {pendingCount} pendentes
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-2">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste sua planilha Excel aqui ou clique para selecionar
                </p>
                <Button variant="outline" size="sm">
                  Selecionar Arquivo
                </Button>
              </div>

              <Button
                onClick={handleDistribuir}
                className="w-full"
                size="lg"
                disabled={selectedCorretores.length === 0 || !campanha}
              >
                Distribuir Leads ({selectedCorretores.length} corretores)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Formato da Planilha</h4>
                <p className="text-muted-foreground">
                  A planilha Excel deve conter as seguintes colunas:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>Nome (obrigatório)</li>
                  <li>Telefone (obrigatório)</li>
                  <li>Email (opcional)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Distribuição Round-Robin</h4>
                <p className="text-muted-foreground">
                  Os leads serão distribuídos alternadamente entre os corretores selecionados, 
                  até que cada um receba a quantidade definida no "Tamanho do Lote".
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Duplicidade</h4>
                <p className="text-muted-foreground">
                  O sistema verifica automaticamente leads já atribuídos na mesma campanha 
                  e evita duplicação.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Reverter Distribuição</h4>
                <p className="text-muted-foreground">
                  Use o botão "Reverter Última" para desfazer a última distribuição realizada.
                </p>
              </div>

              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <p className="text-sm">
                  <strong>Demo:</strong> Nesta versão, o sistema simula a importação gerando leads fictícios para demonstração.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
