import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLeads, Lead } from "@/contexts/LeadsContext";
import { toast } from "@/hooks/use-toast";
import { leadSchema } from "@/lib/validationSchemas";
import { z } from "zod";

interface EditarLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarLeadDialog({ lead, open, onOpenChange }: EditarLeadDialogProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const { updateLead } = useLeads();

  useEffect(() => {
    if (lead) {
      setNome(lead.nome);
      setTelefone(lead.telefone);
      setEmail(lead.email || "");
    }
  }, [lead]);

  const handleSalvar = async () => {
    if (!lead) return;
    
    try {
      // Validate input data
      const validatedData = leadSchema.parse({
        nome,
        telefone,
        email: email || "",
      });
      
      await updateLead(lead.id, {
        nome: validatedData.nome,
        telefone: validatedData.telefone,
        email: validatedData.email || undefined,
      });
      
      toast({ title: "Lead atualizado com sucesso" });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ 
          title: "Erro de validação", 
          description: error.errors[0].message,
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Erro ao atualizar", 
          description: "Ocorreu um erro ao atualizar o lead",
          variant: "destructive" 
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input 
              id="nome" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do lead"
            />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone *</Label>
            <Input 
              id="telefone" 
              value={telefone} 
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <Button 
            onClick={handleSalvar} 
            className="w-full" 
            disabled={!nome.trim() || !telefone.trim()}
          >
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
