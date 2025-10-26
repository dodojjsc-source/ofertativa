import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { toast } from "@/hooks/use-toast";

interface EditarCampanhaDialogProps {
  campanha: { id: string; nome: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarCampanhaDialog({ campanha, open, onOpenChange }: EditarCampanhaDialogProps) {
  const [nome, setNome] = useState("");
  const { updateCampanha } = useCampanhas();
  
  useEffect(() => {
    if (campanha) setNome(campanha.nome);
  }, [campanha]);

  const handleSalvar = async () => {
    if (!campanha || !nome.trim()) {
      toast({ 
        title: "Nome obrigatório", 
        description: "Por favor, preencha o nome da campanha",
        variant: "destructive" 
      });
      return;
    }
    
    await updateCampanha(campanha.id, { nome: nome.trim() });
    toast({ title: "Campanha atualizada com sucesso" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Campanha</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Campanha</Label>
            <Input 
              id="nome" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome da campanha"
            />
          </div>
          <Button onClick={handleSalvar} className="w-full" disabled={!nome.trim()}>
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
