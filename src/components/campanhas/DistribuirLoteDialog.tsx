import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/contexts/UsersContext";
import { useAssignments } from "@/contexts/AssignmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface DistribuirLoteDialogProps {
  campanhaId: string;
  campanhaName: string;
  leadsDisponiveis: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DistribuirLoteDialog({
  campanhaId,
  campanhaName,
  leadsDisponiveis,
  open,
  onOpenChange,
}: DistribuirLoteDialogProps) {
  const { users } = useUsers();
  const { addAssignments } = useAssignments();
  const { user } = useAuth();
  const { leads } = useLeads();
  const { toast } = useToast();
  const { getCampanhas } = useCampanhas();
  
  const [corretoresSelecionados, setCorretoresSelecionados] = useState<string[]>([]);
  const [leadsPorCorretor, setLeadsPorCorretor] = useState<number>(10);
  const [processando, setProcessando] = useState(false);

  // Filtrar apenas corretores ativos
  const corretoresAtivos = users.filter(
    (u) => u.role === "corretor" && u.status === "ativo"
  );

  const totalADistribuir = corretoresSelecionados.length * leadsPorCorretor;
  const distribuicaoValida = totalADistribuir > 0 && totalADistribuir <= leadsDisponiveis;

  const toggleCorretor = (corretorId: string) => {
    setCorretoresSelecionados((prev) =>
      prev.includes(corretorId)
        ? prev.filter((id) => id !== corretorId)
        : [...prev, corretorId]
    );
  };

  const handleDistribuir = async () => {
    if (!distribuicaoValida || !user) return;

    setProcessando(true);
    
    try {
      // 1. Buscar leads disponíveis (sem corretor_id e que não sejam optout)
      const { data: leadsDisponiveis, error: fetchError } = await supabase
        .from("leads")
        .select("*")
        .eq("campanha_id", campanhaId)
        .is("corretor_id", null)
        .or("feedback.is.null,feedback.neq.optout")
        .order("created_at", { ascending: true })
        .limit(totalADistribuir);

      if (fetchError) throw fetchError;
      if (!leadsDisponiveis || leadsDisponiveis.length === 0) {
        throw new Error("Nenhum lead disponível para distribuição");
      }

      const leadsPorCorretorReal = Math.floor(leadsDisponiveis.length / corretoresSelecionados.length);
      let indiceAtual = 0;

      // 2. Distribuir leads entre os corretores selecionados
      for (const corretorId of corretoresSelecionados) {
        const leadsDoCorretor = leadsDisponiveis.slice(
          indiceAtual,
          indiceAtual + leadsPorCorretorReal
        );

        if (leadsDoCorretor.length === 0) break;

        // Buscar gestor_id do corretor para sincronizar
        const corretor = users.find(u => u.id === corretorId);
        
        // Atualizar corretor_id e gestor_id nos leads
        const { error: updateError } = await supabase
          .from("leads")
          .update({ 
            corretor_id: corretorId,
            gestor_id: corretor?.gestorId || user.id
          })
          .in("id", leadsDoCorretor.map((l) => l.id));

        if (updateError) throw updateError;

        // Criar assignments
        const newAssignments = leadsDoCorretor.map((lead) => ({
          campanhaId,
          leadId: lead.id,
          corretorId,
          gestorId: user.id,
          statusDistribuicao: "pendente" as const,
        }));

        await addAssignments(newAssignments);

        indiceAtual += leadsPorCorretorReal;
      }

      // 3. Recarregar dados
      await getCampanhas();

      toast({
        title: "Distribuição concluída!",
        description: `${indiceAtual} leads foram distribuídos entre ${corretoresSelecionados.length} corretores.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao distribuir leads:", error);
      toast({
        title: "Erro na distribuição",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setCorretoresSelecionados([]);
      setLeadsPorCorretor(10);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Distribuir Lote - {campanhaName}</DialogTitle>
          <DialogDescription>
            {leadsDisponiveis} leads disponíveis para distribuição
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input quantidade por corretor */}
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade de leads por corretor</Label>
            <Input
              id="quantidade"
              type="number"
              min={1}
              max={leadsDisponiveis}
              value={leadsPorCorretor}
              onChange={(e) => setLeadsPorCorretor(Number(e.target.value))}
              disabled={processando}
            />
          </div>

          {/* Lista de corretores */}
          <div className="space-y-2">
            <Label>Selecionar corretores</Label>
            <ScrollArea className="h-64 rounded-md border p-4">
              {corretoresAtivos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum corretor ativo disponível
                </p>
              ) : (
                <div className="space-y-3">
                  {corretoresAtivos.map((corretor) => {
                    const leadsPendentes = leads.filter(
                      (l) => l.corretorId === corretor.id && l.status === "pendente"
                    ).length;

                    return (
                      <div
                        key={corretor.id}
                        className="flex items-center justify-between space-x-2 p-2 rounded hover:bg-accent"
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={corretor.id}
                            checked={corretoresSelecionados.includes(corretor.id)}
                            onCheckedChange={() => toggleCorretor(corretor.id)}
                            disabled={processando}
                          />
                          <label
                            htmlFor={corretor.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {corretor.name}
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Meta: {corretor.metaDiaria || 60}/dia
                          </Badge>
                          {leadsPendentes > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {leadsPendentes} pendentes
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Preview da distribuição */}
          {corretoresSelecionados.length > 0 && (
            <div className="bg-accent/50 p-4 rounded-md">
              <p className="text-sm font-medium">
                Preview da distribuição:
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {corretoresSelecionados.length} corretor(es) selecionado(s) ×{" "}
                {leadsPorCorretor} leads cada ={" "}
                <strong className={totalADistribuir > leadsDisponiveis ? "text-destructive" : ""}>
                  {totalADistribuir} leads
                </strong>
              </p>
              {totalADistribuir > leadsDisponiveis && (
                <p className="text-xs text-destructive mt-1">
                  ⚠️ Quantidade solicitada excede leads disponíveis
                </p>
              )}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDistribuir}
              disabled={!distribuicaoValida || processando}
            >
              {processando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Distribuindo...
                </>
              ) : (
                "Confirmar Distribuição"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
