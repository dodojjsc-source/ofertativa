import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads, FeedbackType } from "@/contexts/LeadsContext";
import { useBitrixQueue } from "@/contexts/BitrixQueueContext";
import { useUsers } from "@/contexts/UsersContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, PhoneOff, User, Mail, FolderOpen, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Atendimento() {
  const { user } = useAuth();
  const { leads, updateLead } = useLeads();
  const { addToQueue } = useBitrixQueue();
  const { users } = useUsers();
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>("interessado");
  const [observacao, setObservacao] = useState("");
  const [repassarBitrix, setRepassarBitrix] = useState(false);

  useEffect(() => {
    loadNextLead();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (showFeedbackModal) return; // não troca enquanto o modal está aberto
    loadNextLead();
  }, [leads, user?.id, showFeedbackModal]);
  const loadNextLead = (skipId?: string) => {
    if (!user) return;
    // Seleciona apenas pendentes do corretor atual
    const pending = leads.filter((l) => l.corretorId === user.id && l.status === "pendente");

    // Ordena por dataAtendimento (nulos primeiro), depois por nome (fallback estável)
    const sorted = [...pending].sort((a, b) => {
      const aDate = a.dataAtendimento ? new Date(a.dataAtendimento).getTime() : -Infinity;
      const bDate = b.dataAtendimento ? new Date(b.dataAtendimento).getTime() : -Infinity;
      if (aDate !== bDate) return aDate - bDate;
      return (a.nome || "").localeCompare(b.nome || "");
    });

    if (!skipId && currentLead && sorted.some((l) => l.id === currentLead.id)) {
      // Mantém o lead atual se ainda for válido
      setCurrentLead(currentLead);
      return;
    }

    const avoidId = skipId || currentLead?.id;
    const next = sorted.find((l) => l.id !== avoidId);
    setCurrentLead(next || null);
  };

  const handleAtendeu = () => {
    setShowFeedbackModal(true);
  };

  const handleNaoAtendeu = async () => {
    if (currentLead) {
      const tentativasAtuais = currentLead.tentativasContato || 0;
      const novasTentativas = tentativasAtuais + 1;

      if (novasTentativas >= 3) {
        // 3ª tentativa ou mais: liberar lead para redistribuição
        await updateLead(currentLead.id, {
          status: "pendente", // Mantém como pendente para aparecer como disponível
          corretorId: null, // Remove o corretor (volta para pool)
          tentativasContato: 0, // Reseta contador
          dataAtendimento: new Date().toISOString(),
        });
        
        toast({
          title: "Lead liberado para redistribuição",
          description: "Após 3 tentativas, o lead foi devolvido ao pool da campanha",
        });
      } else {
        // 1ª ou 2ª tentativa: manter pendente para o mesmo corretor e enviar para fim da fila
        await updateLead(currentLead.id, {
          status: "pendente",
          tentativasContato: novasTentativas,
          dataAtendimento: new Date().toISOString(), // Envia para fim da fila
        });
        
        toast({
          title: `Tentativa ${novasTentativas} de 3 registrada`,
          description: "Lead enviado para o fim da sua fila",
        });
      }

      // Avanço imediato para o próximo lead
      loadNextLead(currentLead.id);
      resetForm();
    }
  };

  const handleSubmitFeedback = async () => {
    if (!observacao.trim()) {
      toast({
        title: "Observação obrigatória",
        description: "Por favor, preencha o campo de observação",
        variant: "destructive",
      });
      return;
    }

    if (currentLead && user) {
      await updateLead(currentLead.id, {
        status: "atendido",
        feedback,
        observacao,
        repassarBitrix,
        dataAtendimento: new Date().toISOString(),
        tentativasContato: 0, // Reseta tentativas quando atendeu
      });

      // Se marcou "Repassar para Bitrix", adicionar à fila
      if (repassarBitrix) {
        const gestor = users.find((u) => u.id === currentLead.gestorId);
        const corretor = users.find((u) => u.id === currentLead.corretorId);
        
        const added = addToQueue({
          leadId: currentLead.id,
          campanhaId: currentLead.campanhaId || "",
          campanhaNome: currentLead.campanha,
          nome: currentLead.nome,
          telefone: currentLead.telefone,
          email: currentLead.email,
          corretorId: user.id,
          corretorNome: corretor?.name || user.name,
          gestorId: gestor?.id || "",
          gestorNome: gestor?.name || "",
          feedback,
          observacao,
        });

        if (!added) {
          toast({
            title: "Lead já está na fila",
            description: "Este lead já foi adicionado à fila do Bitrix",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Feedback registrado com sucesso",
        description: repassarBitrix ? "Lead adicionado à fila do Bitrix" : "Próximo contato carregado",
      });
      setShowFeedbackModal(false);
      
      // Avanço imediato para o próximo lead
      loadNextLead(currentLead.id);
      resetForm();
    }
  };

  const resetForm = () => {
    setFeedback("interessado");
    setObservacao("");
    setRepassarBitrix(false);
  };

  const handleNumeroErrado = async () => {
    if (!currentLead) return;
    
    // Remover lead do corretor e marcar como número errado
    await updateLead(currentLead.id, {
      status: "nao_atendido",
      feedback: "optout",
      observacao: "Número errado - removido automaticamente",
      corretorId: null,
      dataAtendimento: new Date().toISOString(),
    });
    
    toast({
      title: "Número marcado como errado",
      description: "Lead removido da sua lista",
    });
    
    // Avançar imediatamente para o próximo lead
    loadNextLead(currentLead.id);
  };

  if (!currentLead) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Nenhum lead pendente</h2>
              <p className="text-muted-foreground">
                Todos os contatos foram processados. Aguarde novos lotes.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Atendimento Sequencial</h1>
          <p className="text-muted-foreground">Processe um contato por vez</p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Próximo Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-6 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="text-lg font-semibold">{currentLead.nome}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="text-lg font-semibold">{currentLead.telefone}</p>
                </div>
              </div>
              {currentLead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-lg font-semibold">{currentLead.email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Campanha</p>
                  <p className="text-lg font-semibold">{currentLead.campanha}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Button onClick={handleAtendeu} className="flex-1" size="lg">
                  <Phone className="mr-2 h-5 w-5" />
                  Atendeu
                </Button>
                <Button onClick={handleNaoAtendeu} variant="outline" className="flex-1" size="lg">
                  <PhoneOff className="mr-2 h-5 w-5" />
                  Não Atendeu
                </Button>
              </div>
              <div className="flex gap-4">
                <Button 
                  onClick={handleNumeroErrado} 
                  variant="destructive" 
                  className="flex-1" 
                  size="lg"
                >
                  <XCircle className="mr-2 h-5 w-5" />
                  Número Errado
                </Button>
                <Button onClick={() => loadNextLead(currentLead?.id)} variant="secondary" className="flex-1" size="lg">
                  Atender próximo Lead
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Tipo de Feedback *</Label>
              <RadioGroup value={feedback} onValueChange={(v) => setFeedback(v as FeedbackType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="interessado" id="interessado" />
                  <Label htmlFor="interessado" className="cursor-pointer">Interessado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="agendado" id="agendado" />
                  <Label htmlFor="agendado" className="cursor-pointer">Agendado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recusou" id="recusou" />
                  <Label htmlFor="recusou" className="cursor-pointer">Recusou</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="optout" id="optout" />
                  <Label htmlFor="optout" className="cursor-pointer">Opt-out</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observação *</Label>
              <Textarea
                id="observacao"
                placeholder="Descreva o resultado do atendimento..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bitrix"
                checked={repassarBitrix}
                onCheckedChange={(checked) => setRepassarBitrix(checked as boolean)}
              />
              <Label htmlFor="bitrix" className="cursor-pointer">
                Repassar para Bitrix
              </Label>
            </div>

            <Button onClick={handleSubmitFeedback} className="w-full">
              Confirmar Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
