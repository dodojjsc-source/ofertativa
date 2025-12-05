import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLeads, Lead } from "@/contexts/LeadsContext";
import { useBitrixQueue } from "@/contexts/BitrixQueueContext";
import { useUsers } from "@/contexts/UsersContext";
import { toast } from "@/hooks/use-toast";

interface EditarFeedbackDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const feedbackOptions = [
  { value: "interessado", label: "Interessado" },
  { value: "agendado", label: "Agendado" },
  { value: "recusou", label: "Recusou" },
  { value: "optout", label: "Optout" },
  { value: "nao_atendeu", label: "Não Atendeu" },
  { value: "numero_errado", label: "Número Errado" },
];

export function EditarFeedbackDialog({ lead, open, onOpenChange }: EditarFeedbackDialogProps) {
  const [feedback, setFeedback] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [repassarBitrix, setRepassarBitrix] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { updateLead } = useLeads();
  const { addToQueue } = useBitrixQueue();
  const { users } = useUsers();

  useEffect(() => {
    if (lead) {
      setFeedback(lead.feedback || "");
      setObservacao(lead.observacao || "");
      setRepassarBitrix(lead.repassarBitrix || false);
    }
  }, [lead]);

  const handleSalvar = async () => {
    if (!lead || !feedback) {
      toast({
        title: "Selecione um feedback",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Atualizar o lead
      await updateLead(lead.id, {
        feedback: feedback as Lead["feedback"],
        observacao,
        repassarBitrix,
        status: "atendido",
        dataAtendimento: new Date().toISOString(),
      });

      // Se marcou repassar para Bitrix e é um feedback que vai para Bitrix
      if (repassarBitrix && (feedback === "interessado" || feedback === "agendado")) {
        const corretor = users.find(u => u.id === lead.corretorId);
        const gestor = users.find(u => u.id === lead.gestorId);
        
        await addToQueue({
          leadId: lead.id,
          nome: lead.nome,
          telefone: lead.telefone,
          e164: lead.e164,
          displayLocal: lead.display_local,
          whatsappUrl: lead.whatsapp_url,
          campanhaId: lead.campanhaId || "",
          campanhaNome: lead.campanha || "",
          corretorId: lead.corretorId || "",
          corretorNome: corretor?.name || "",
          gestorId: lead.gestorId || "",
          gestorNome: gestor?.name || "",
          feedback: feedback,
          observacao: observacao || "",
        });
      }

      toast({ title: "Lead atualizado com sucesso" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao atualizar o lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Feedback - {lead?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Tipo de Feedback *</Label>
            <RadioGroup value={feedback} onValueChange={setFeedback}>
              <div className="grid grid-cols-2 gap-2">
                {feedbackOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="cursor-pointer font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Anotações sobre o atendimento..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="repassarBitrix"
              checked={repassarBitrix}
              onCheckedChange={(checked) => setRepassarBitrix(checked as boolean)}
            />
            <Label htmlFor="repassarBitrix" className="cursor-pointer font-normal">
              Repassar para Bitrix
            </Label>
          </div>

          <Button
            onClick={handleSalvar}
            className="w-full"
            disabled={!feedback || isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
